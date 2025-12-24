import { Router, Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { findOrCreateUser, saveUserTokens, findUserByEmail } from '../services/userService';

const router = Router();

// Helper function to normalize frontend URL (remove trailing slashes and whitespace)
function getFrontendUrl(): string {
  const url = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .trim()
    .replace(/\s+/g, '') // Remove ALL spaces (not just trim)
    .replace(/\/+$/, ''); // Remove trailing slashes
  console.log('Frontend URL normalized:', url);
  return url;
}

// Function to get OAuth2 client (lazy initialization to ensure env vars are loaded)
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables');
  }

  console.log('OAuth2 Config:', {
    clientId: clientId ? `${clientId.substring(0, 10)}...` : 'MISSING',
    clientSecret: clientSecret ? 'SET' : 'MISSING',
    redirectUrl
  });

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUrl
  );
}

// Get user profile
router.get('/profile', (req: Request, res: Response) => {
  if (req.user) {
    res.json({
      success: true,
      user: {
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

// Check auth status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    authenticated: !!req.user,
    user: req.user ? {
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture
    } : null
  });
});

// Debug endpoint to check OAuth configuration
router.get('/debug', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`;
  
  res.json({
    success: true,
    config: {
      clientId: clientId ? `${clientId.substring(0, 20)}...` : 'MISSING',
      clientSecret: clientSecret ? 'SET' : 'MISSING',
      redirectUrl: redirectUrl,
      backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    },
    instructions: {
      step1: 'Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials',
      step2: 'Click on your OAuth 2.0 Client ID',
      step3: `Add this EXACT redirect URI under "Authorized redirect URIs": ${redirectUrl}`,
      step4: 'Click Save and wait 2-5 minutes',
      step5: 'Restart your backend server and try again'
    }
  });
});

// Initiate Google OAuth flow
router.get('/google', (req: Request, res: Response) => {
  try {
    const oauth2Client = getOAuth2Client();
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/contacts',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const redirectUrl = process.env.GOOGLE_REDIRECT_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`;
    
    console.log('Generating auth URL with redirect_uri:', redirectUrl);

    // Check if user already has a session - if so, skip OAuth
    if (req.user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/chat`);
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'select_account', // Changed from 'consent' - only shows consent screen once
      state: req.query.returnTo as string || '/',
      redirect_uri: redirectUrl // Explicitly set redirect_uri
    });

    console.log('Generated auth URL:', url.substring(0, 200) + '...');
    res.redirect(url);
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth flow. Check server logs.'
    });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const oauth2Client = getOAuth2Client();
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=no_code`);
    }

    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const email = userInfo.data.email || '';
    const name = userInfo.data.name || '';
    const picture = userInfo.data.picture || undefined;
    const googleId = userInfo.data.id || email; // Use email as fallback for google_id

    // Save or update user in database
    let dbUser;
    try {
      dbUser = await findOrCreateUser({
        google_id: googleId,
        email: email,
        name: name,
        picture: picture
      });

      // Save tokens to database
      if (dbUser && dbUser.id) {
        try {
          await saveUserTokens(dbUser.id, {
            access_token: tokens.access_token || '',
            refresh_token: tokens.refresh_token || '',
            expiry_date: tokens.expiry_date || undefined,
            token_type: tokens.token_type || 'Bearer',
            scope: tokens.scope || undefined
          });
          console.log(`User saved to database: ${dbUser.email} (ID: ${dbUser.id})`);
        } catch (tokenError: any) {
          console.error('Error saving tokens to database (non-critical):', tokenError.message);
          // Continue - tokens are in session anyway
        }
      }
    } catch (dbError: any) {
      console.error('Error saving user to database (non-critical):', dbError.message);
      // Continue with session even if DB save fails
      // This allows the app to work even if database is temporarily unavailable
    }

    // Store user session with tokens and database ID
    req.session.user = {
      id: dbUser?.id || undefined, // Include database ID
      email: email,
      name: name,
      picture: picture,
      tokens: {
        access_token: tokens.access_token || '',
        refresh_token: tokens.refresh_token || '', // Ensure refresh token is saved
        expiry_date: tokens.expiry_date || undefined || undefined
      }
    };

    // Save session with longer expiry
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect(`${getFrontendUrl()}/auth?error=session_error`);
      }
      res.redirect(`${getFrontendUrl()}/chat`);
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=oauth_error`);
  }
});

// Logout route
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to logout'
      });
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Middleware to load user from session and refresh token if needed
export const loadUserFromSession = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session.user) {
    const user = req.session.user;
    
    // If user doesn't have database ID, try to find it
    if (!user.id && user.email) {
      try {
        const dbUser = await findUserByEmail(user.email);
        if (dbUser) {
          // Update session with database ID
          req.session.user = {
            ...user,
            id: dbUser.id
          };
          req.session.save(() => {});
        }
      } catch (error) {
        console.error('Error looking up user in database:', error);
        // Continue without database ID
      }
    }
    
    // Check if access token is expired and refresh if needed
    if (user.tokens.refresh_token && user.tokens.expiry_date) {
      const isExpired = user.tokens.expiry_date < Date.now() + 5 * 60 * 1000; // 5 min buffer
      
      if (isExpired) {
        try {
          const oauth2Client = getOAuth2Client();
          oauth2Client.setCredentials({
            refresh_token: user.tokens.refresh_token,
          });

          const { credentials } = await oauth2Client.refreshAccessToken();
          
          // Update session with new tokens
          req.session.user = {
            ...user,
            tokens: {
              ...user.tokens,
              access_token: credentials.access_token || user.tokens.access_token,
              expiry_date: credentials.expiry_date || user.tokens.expiry_date,
            }
          };
          
          // Update tokens in database if user has ID
          if (user.id) {
            try {
              await saveUserTokens(user.id, {
                access_token: credentials.access_token || user.tokens.access_token,
                refresh_token: user.tokens.refresh_token,
                expiry_date: credentials.expiry_date || user.tokens.expiry_date
              });
            } catch (dbError) {
              console.error('Error updating tokens in database:', dbError);
            }
          }
          
          req.session.save(() => {});
        } catch (error) {
          console.error('Error refreshing token:', error);
          // If refresh fails, clear session (user needs to re-authenticate)
          req.session.user = undefined;
          req.session.destroy(() => {});
        }
      }
    }
    
    req.user = req.session.user;
  }
  next();
};

export { router as authRoutes };

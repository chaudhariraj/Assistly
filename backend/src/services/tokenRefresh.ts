import { google } from 'googleapis';

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expiry_date?: number } | null> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URL
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      access_token: credentials.access_token || '',
      expiry_date: credentials.expiry_date,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

export function isTokenExpired(expiryDate?: number): boolean {
  if (!expiryDate) return true;
  // Check if token expires in less than 5 minutes
  return expiryDate < Date.now() + 5 * 60 * 1000;
}



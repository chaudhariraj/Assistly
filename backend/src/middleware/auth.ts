import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include user session
declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: number; // Database user ID
        email: string;
        name: string;
        picture?: string;
        tokens: {
          access_token: string;
          refresh_token?: string;
          expiry_date?: number;
        };
      };
    }
  }
}

// Middleware to check if user is authenticated
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please connect your Google account.'
    });
  }
  next();
};

// Middleware to check auth status (optional)
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  // This middleware just passes through, auth status is checked in routes
  next();
};

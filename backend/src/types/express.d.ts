import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
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

declare global {
  namespace Express {
    interface Request {
      user?: {
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

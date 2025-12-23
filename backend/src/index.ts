import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import { errorHandler } from './middleware/errorHandler';
import { chatRoutes } from './routes/chat';
import { calendarRoutes } from './routes/calendar';
import { contactsRoutes } from './routes/contacts';
import { authRoutes, loadUserFromSession } from './routes/auth';
import { notificationRoutes } from './routes/notifications';
import { testConnection } from './db/connection';
import { runMigrations } from './db/migrate-simple';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for OAuth
}));
// CORS configuration - allow both production and preview deployments
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://assistly.vercel.app',
  /^https:\/\/assistly.*\.vercel\.app$/, // Allow all Vercel preview deployments
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'assistly.sid', // Custom session name
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax', // Allow cross-site requests
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days - longer persistence
  }
}));

// Load user from session
app.use(loadUserFromSession);

// Auth routes (must be before protected routes)
app.use('/api/auth', authRoutes);

// API Routes (protected)
app.use('/api/chat', chatRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/notifications', notificationRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Assistly API Server',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      chat: '/api/chat',
      calendar: '/api/calendar',
      contacts: '/api/contacts',
      notifications: '/api/notifications'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.warn('⚠️  Database connection failed, but continuing...');
    } else {
      // Run migrations
      try {
        await runMigrations();
      } catch (error) {
        console.error('⚠️  Migration error:', error);
        // Continue even if migrations fail (tables might already exist)
      }
    }
  } catch (error) {
    console.error('⚠️  Database initialization error:', error);
    // Continue even if database fails (for backward compatibility)
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

startServer();

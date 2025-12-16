# Assistly - AI Personal Assistant

A full-stack AI-powered personal assistant application with Google Calendar and Contacts integration. Built with React, TypeScript, Express, and LangChain.

## Features

- 🤖 AI-powered chat assistant using Groq LLM
- 📅 Google Calendar integration (view, create, update, delete events)
- 👥 Google Contacts management
- 🔐 OAuth 2.0 authentication with Google
- 💬 Persistent chat threads with memory
- 🎨 Modern, responsive UI

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Axios
- Lucide React (icons)

### Backend
- Node.js
- Express
- TypeScript
- LangChain & LangGraph
- Groq API
- Google APIs (Calendar, Contacts)
- Express Session

## Prerequisites

- Node.js 18+ and npm
- Google Cloud Console project with OAuth 2.0 credentials
- Groq API key ([Get one here](https://console.groq.com/))

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Assistly
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# Session Secret (generate a random string)
SESSION_SECRET=your-secret-key-change-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:3001/api/auth/google/callback

# Groq API
GROQ_API_KEY=your-groq-api-key
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Start the frontend:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google Calendar API and Google People API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure the OAuth consent screen
6. Add authorized redirect URIs:
   - For local: `http://localhost:3001/api/auth/google/callback`
   - For production: `https://your-backend-url.onrender.com/api/auth/google/callback`
7. Copy the Client ID and Client Secret to your `.env` file

## Deployment

### Backend Deployment (Render - Free Tier)

1. Push your code to GitHub
2. Go to [Render](https://render.com/) and sign up/login
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: assistly-backend
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free
6. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=3001` (or use Render's default)
   - `SESSION_SECRET` (generate a random string)
   - `GOOGLE_CLIENT_ID` (your Google OAuth client ID)
   - `GOOGLE_CLIENT_SECRET` (your Google OAuth client secret)
   - `GOOGLE_REDIRECT_URL` (your Render backend URL + `/api/auth/google/callback`)
   - `GROQ_API_KEY` (your Groq API key)
   - `FRONTEND_URL` (your frontend URL)
   - `BACKEND_URL` (your Render backend URL)
7. Deploy!

**Note**: Update your Google OAuth redirect URI in Google Cloud Console to include your Render URL.

### Frontend Deployment (Vercel - Free Tier)

1. Go to [Vercel](https://vercel.com/) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variable:
   - `VITE_API_BASE_URL` (your Render backend URL)
6. Deploy!

### Alternative: Netlify for Frontend

1. Go to [Netlify](https://www.netlify.com/) and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Add environment variable:
   - `VITE_API_BASE_URL` (your backend URL)
6. Deploy!

## Project Structure

```
Assistly/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server setup
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Express middleware
│   │   └── types/            # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── contexts/         # React contexts
│   │   └── services/         # API services
│   └── package.json
├── .gitignore
├── render.yaml               # Render deployment config
├── vercel.json               # Vercel deployment config
└── README.md
```

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment (development/production) | No |
| `BACKEND_URL` | Backend base URL | Yes (for production) |
| `FRONTEND_URL` | Frontend base URL | Yes (for CORS) |
| `SESSION_SECRET` | Secret for session encryption | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `GOOGLE_REDIRECT_URL` | OAuth callback URL | Yes |
| `GROQ_API_KEY` | Groq API key for LLM | Yes |

### Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_BASE_URL` | Backend API URL | Yes |

## Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.


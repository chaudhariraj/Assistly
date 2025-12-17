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
  # Switch to Assistly branch
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
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Session Secret (generate a random string)
SESSION_SECRET=your-secret-key-change-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:3001/auth/google/callback

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
VITE_API_BASE_URL=http://localhost:3000
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
7. Copy the Client ID and Client Secret to your `.env` file

## CI/CD Pipeline

This project includes a complete CI/CD pipeline using GitHub Actions:

- ✅ **Continuous Integration**: Automatically builds and tests on every push and pull request
- ✅ **Continuous Deployment**: Automatically deploys to production on push to `Assistly` branch
- ✅ **Backend**: Auto-deploys to Render via GitHub integration
- ✅ **Frontend**: Auto-deploys to Vercel via GitHub integration


### How It Works

1. **Push to GitHub (Assistly branch)** → GitHub Actions CI runs automatically
2. **Merge to Assistly** → Both backend and frontend auto-deploy
3. **Monitor** → Check Actions tab for workflow status

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed CI/CD setup instructions.

## Deployment

### Important: Branch Configuration

**Your production branch is `Assistly` (not `main`)**

- All CI/CD workflows are configured for the `Assistly` branch
- Render and Vercel should be connected to the `Assistly` branch
- The `main` branch only contains README.md



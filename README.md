# Assistly - AI Personal Assistant

A full-stack AI-powered personal assistant application with Google Calendar and Contacts integration. Built with React, TypeScript, Express, and LangChain.

## Features

- AI-powered chat assistant using Groq LLM
- Google Calendar integration (view, create, update, delete events)
- Google Contacts management
- OAuth 2.0 authentication with Google
- Persistent chat threads with memory
- Modern, responsive UI

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Axios

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
- Groq API key

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

Create a `.env` file in the `backend` ref the example.nev file.

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
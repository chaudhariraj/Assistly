import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { initiateGoogleAuth, checkAuthStatus } from '../services/api';
import './AuthPage.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    // Check if already authenticated
    checkAuthStatus()
      .then((status) => {
        if (status.authenticated) {
          navigate('/chat');
        }
      })
      .catch(() => {
        // Not authenticated, stay on auth page
      });
  }, [navigate]);

  const handleGoogleAuth = () => {
    initiateGoogleAuth();
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <LogIn size={48} className="auth-icon" />
            <h1>Connect Your Google Account</h1>
            <p>To use Assistly, you need to connect your Google account</p>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              <span>
                {error === 'no_code' && 'Authentication failed. Please try again.'}
                {error === 'oauth_error' && 'OAuth error occurred. Please try again.'}
                {error === 'session_error' && 'Session error. Please try again.'}
                {!['no_code', 'oauth_error', 'session_error'].includes(error) && 'An error occurred. Please try again.'}
              </span>
            </div>
          )}

          <div className="auth-permissions">
            <h3>We'll request access to:</h3>
            <ul>
              <li>📅 Google Calendar - to manage your meetings and events</li>
              <li>👥 Google Contacts - to manage your contacts</li>
              <li>📧 Your email address - to identify your account</li>
            </ul>
          </div>

          <button 
            className="btn-google-auth"
            onClick={handleGoogleAuth}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="auth-footer">
            By continuing, you agree to allow access to your Google Calendar and Contacts.
            Your data is secure and only used to provide the assistant functionality.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;


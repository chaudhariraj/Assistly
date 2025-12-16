import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import AuthPage from './pages/AuthPage';
import LoginModal from './components/LoginModal';
import { checkAuthStatus } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Check auth status on mount and when route changes
    const checkAuth = async () => {
      try {
        const status = await checkAuthStatus();
        setIsAuthenticated(status.authenticated);
        
        // If authenticated and on landing page, redirect to chat
        if (status.authenticated && window.location.pathname === '/') {
          window.location.href = '/chat';
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    
    // Also check when storage changes (for cross-tab sync)
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a'
      }}>
        <div style={{ color: '#e0e0e0', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              <LandingPage onLoginClick={() => setShowLoginModal(true)} />
            } 
          />
          <Route 
            path="/auth" 
            element={
              isAuthenticated ? <Navigate to="/chat" replace /> : <AuthPage />
            } 
          />
          <Route 
            path="/chat" 
            element={
              isAuthenticated ? (
                <ChatPage setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/auth" replace />
              )
            } 
          />
        </Routes>
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)} 
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;


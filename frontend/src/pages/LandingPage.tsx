import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Calendar, Users, MessageSquare, Clock, Search, FileText, Zap } from 'lucide-react';
import { checkAuthStatus } from '../services/api';
import './LandingPage.css';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage = ({ onLoginClick }: LandingPageProps) => {
  const navigate = useNavigate();
  
  // Check if already authenticated and redirect
  useEffect(() => {
    checkAuthStatus()
      .then((status) => {
        if (status.authenticated) {
          navigate('/chat');
        }
      })
      .catch(() => {
        // Not authenticated, stay on landing page
      });
  }, [navigate]);

  const features = [
    {
      icon: <Calendar className="feature-icon" />,
      title: 'Schedule Meetings',
      description: 'Create and manage calendar events with Google Calendar integration',
      available: true,
    },
    {
      icon: <Users className="feature-icon" />,
      title: 'Manage Contacts',
      description: 'Create, update, and delete contacts in Google Contacts',
      available: true,
    },
    {
      icon: <MessageSquare className="feature-icon" />,
      title: 'AI Chat Assistant',
      description: 'Natural language interface to interact with your calendar and contacts',
      available: true,
    },
    {
      icon: <Clock className="feature-icon" />,
      title: 'Meeting Notifications',
      description: 'Get notified 1 hour before your scheduled meetings',
      available: true,
    },
    {
      icon: <Search className="feature-icon" />,
      title: 'Web Search',
      description: 'Search the web for information directly from the chat',
      available: false,
    },
    {
      icon: <FileText className="feature-icon" />,
      title: 'File Management',
      description: 'Fetch and manage files from various sources',
      available: false,
    },
    {
      icon: <Zap className="feature-icon" />,
      title: 'Google Drive Integration',
      description: 'Search and download files from Google Drive with exact match',
      available: false,
    },
  ];

  return (
    <div className="landing-page">
      <div className="landing-container">
        <header className="landing-header">
          <div className="logo">
            <MessageSquare size={32} />
            <span>Assistly</span>
          </div>
          <button 
            className="btn-primary"
            onClick={onLoginClick}
          >
            Get Started
          </button>
        </header>

        <main className="landing-main">
          <section className="hero">
            <h1 className="hero-title">
              Make Your Personal Assistant
            </h1>
            <p className="hero-subtitle">
              An AI-powered assistant that helps you manage your calendar, contacts, and more.
              Simply ask, and it will handle the rest.
            </p>
            <div className="hero-buttons">
              <button 
                className="btn-primary btn-large"
                onClick={onLoginClick}
              >
                Connect Google Account
              </button>
            </div>
          </section>

          <section className="features">
            <h2 className="section-title">Features</h2>
            <div className="features-grid">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className={`feature-card ${!feature.available ? 'coming-soon' : ''}`}
                >
                  <div className="feature-icon-wrapper">
                    {feature.icon}
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  {!feature.available && (
                    <span className="coming-soon-badge">Coming Soon</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="how-it-works">
            <h2 className="section-title">How It Works</h2>
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <h3>Connect Your Google Account</h3>
                <p>Authenticate with Google to grant access to Calendar and Contacts</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <h3>Start Chatting</h3>
                <p>Ask questions or give commands in natural language</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <h3>Get Things Done</h3>
                <p>The AI assistant handles scheduling, contacts, and more</p>
              </div>
            </div>
          </section>

          <section className="cta">
            <h2>Ready to Get Started?</h2>
            <p>Connect your Google account and start managing your schedule with AI</p>
            <button 
              className="btn-primary btn-large"
              onClick={onLoginClick}
            >
              Connect Google Account
            </button>
          </section>
        </main>

        <footer className="landing-footer">
          <p>&copy; 2024 Assistly. Built with AI and ❤️</p>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;


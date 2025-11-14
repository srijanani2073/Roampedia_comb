import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import { Lock } from 'lucide-react';
import './ProtectedRoute.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="protected-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="protected-route-container">
          <div className="protected-route-card">
            <div className="protected-icon">
              <Lock size={48} />
            </div>
            <h2>Authentication Required</h2>
            <p>Please log in to access this feature</p>
            <button 
              className="protected-login-btn"
              onClick={() => setAuthModalOpen(true)}
            >
              Sign In / Register
            </button>
          </div>
        </div>
        
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultView="login"
        />
      </>
    );
  }

  return children;
}

export default ProtectedRoute;
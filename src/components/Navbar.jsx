import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setShowUserMenu(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo">
            🌍 Roampedia
          </Link>

          <ul className="navbar-menu">
            {/* Navigation Links */}
            <li className="navbar-item">
              <Link to="/" className="navbar-link">Home</Link>
            </li>
            
            <li className="navbar-item">
              <Link to="/recommend" className="navbar-link">Recommendations</Link>
            </li>
            
            <li className="navbar-item">
              <Link to="/itinerary" className="navbar-link">Itinerary Planner</Link>
            </li>

            {/* User Menu - Only show when authenticated */}
            {isAuthenticated ? (
              <li className="navbar-item user-menu-container">
                <button 
                  className="navbar-link user-menu-button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <span className="user-avatar">
                    {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                  </span>
                  <span className="user-name">
                    {user?.firstName || user?.email?.split('@')[0] || 'User'}
                  </span>
                  <span className={`dropdown-arrow ${showUserMenu ? 'open' : ''}`}>▼</span>
                </button>

                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-name">
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div className="user-dropdown-email">{user?.email}</div>
                    </div>

                    <div className="user-dropdown-divider"></div>

                    <Link 
                      to="/profile" 
                      className="user-dropdown-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <span className="dropdown-icon">👤</span>
                      My Profile
                    </Link>

                    {user?.role === 'admin' && (
                      <Link 
                        to="/admin" 
                        className="user-dropdown-item admin-link"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <span className="dropdown-icon">🛡️</span>
                        Admin Dashboard
                      </Link>
                    )}

                    <div className="user-dropdown-divider"></div>

                    <button 
                      className="user-dropdown-item logout-button"
                      onClick={handleLogout}
                    >
                      <span className="dropdown-icon">🚪</span>
                      Logout
                    </button>
                  </div>
                )}
              </li>
            ) : (
              <li className="navbar-item">
                <button 
                  className="navbar-link login-button"
                  onClick={() => setShowAuthModal(true)}
                >
                  Login
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </>
  );
};

export default Navbar;
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';
import './AuthModal.css';

function AuthModal({ isOpen, onClose, defaultView = 'login' }) {
  const [view, setView] = useState(defaultView); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    username: ''
  });

  const { login, register } = useAuth();

  // Close modal and reset
  const handleClose = () => {
    setError('');
    setLoginData({ email: '', password: '' });
    setRegisterData({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    });
    onClose();
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(loginData.email, loginData.password);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle register
  const handleRegister = async (e) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await register(
        registerData.email,
        registerData.password,
        registerData.firstName,
        registerData.lastName,
        registerData.username 
      );
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="auth-modal-close" onClick={handleClose}>
          <X size={24} />
        </button>

        {/* View switcher */}
        <div className="auth-view-switcher">
          <button
            className={`auth-view-btn ${view === 'login' ? 'active' : ''}`}
            onClick={() => {
              setView('login');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            className={`auth-view-btn ${view === 'register' ? 'active' : ''}`}
            onClick={() => {
              setView('register');
              setError('');
            }}
          >
            Register
          </button>
        </div>

        {/* Error message */}
        {error && <div className="auth-error-message">{error}</div>}

        {/* Login Form */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <h2>Welcome Back</h2>
            <p className="auth-subtitle">Sign in to continue your journey</p>

            <div className="auth-form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({ ...loginData, email: e.target.value })
                }
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <h2>Join Roampedia</h2>
            <p className="auth-subtitle">Create your account and start exploring</p>

            <div className="auth-form-row">
              <div className="auth-form-group">
                <label htmlFor="register-firstName">First Name</label>
                <input
                  id="register-firstName"
                  type="text"
                  value={registerData.firstName}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      firstName: e.target.value,
                    })
                  }
                  placeholder="John"
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="register-lastName">Last Name</label>
                <input
                  id="register-lastName"
                  type="text"
                  value={registerData.lastName}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, lastName: e.target.value })
                  }
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="register-email">Email *</label>
              <input
                id="register-email"
                type="email"
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({ ...registerData, email: e.target.value })
                }
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="register-password">Password *</label>
              <input
                id="register-password"
                type="password"
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({ ...registerData, password: e.target.value })
                }
                placeholder="••••••••"
                required
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="register-confirmPassword">
                Confirm Password *
              </label>
              <input
                id="register-confirmPassword"
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    confirmPassword: e.target.value,
                  })
                }
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthModal;
import "./Navbar.css";
import React, { useState, useEffect, useRef } from "react";
import { User, LogOut, Settings, ChevronDown, Globe, Newspaper, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);
  const profileBtnRef = useRef(null);
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !profileBtnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleProfileMenu = () => {
    if (user) {
      setMenuOpen(!menuOpen);
    } else {
      setAuthModalOpen(true);
    }
  };

  const getDisplayName = () =>
    user?.firstName ||
    user?.lastName ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() :
    user?.email?.split("@")[0] ||
    "User";

  const getProfileImage = () => null; // Add your profile image logic here if needed

  return (
    <>
      <nav className="navbar-thin">
        <div className="navbar-container">
          {/* Brand / Logo */}
          <div
            className="navbar-logo"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            <Globe size={22} />
            <span>Roampedia</span>
          </div>

          {/* Center Navigation Buttons */}
          <div className="navbar-links">
            <Link to="/news" className="nav-link-btn">
              <Newspaper size={16} />
              News Feed
            </Link>
            <Link to="/currency" className="nav-link-btn">
              <Wallet size={16} />
              Currency Converter
            </Link>
            <Link to="/itinerary" className="nav-link-btn">
              <Wallet size={16} />
              Itinerary Module
            </Link>
            <Link to="/itineraryplanner" className="nav-link-btn">
              <Wallet size={16} />
              Itinerary Planner
            </Link>
            <Link to="/trivia" className="nav-link-btn">
              <Wallet size={16} />
              Trivia Module
            </Link>
            <Link to="/chatbot" className="nav-link-btn">
              <Wallet size={16} />
              ChatBot
            </Link>
            <Link to="/Itinerarydashboard" className="nav-link-btn">
              <Wallet size={16} />
              Itinerary Dashboard
            </Link>
            <Link to="/recommend" className="nav-link-btn">
              <Wallet size={16} />
              Recommendations
            </Link>
          </div>

          {/* Right: Sign In / Profile */}
          <div className="profile-section">
            <button
              ref={profileBtnRef}
              className={`profile-btn ${user ? "logged-in" : "guest"} ${
                menuOpen ? "active" : ""
              }`}
              onClick={toggleProfileMenu}
              aria-label={user ? "Open profile menu" : "Sign in"}
              aria-expanded={menuOpen}
            >
              {user ? (
                <div className="profile-info">
                  <div className="profile-avatar">
                    {getProfileImage() ? (
                      <img
                        src={getProfileImage()}
                        alt="Profile"
                        className="profile-image"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="profile-fallback"
                      style={{ display: getProfileImage() ? "none" : "flex" }}
                    >
                      {getDisplayName().charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span className="profile-name-inline">{getDisplayName()}</span>
                  <ChevronDown
                    size={16}
                    className={`dropdown-arrow ${menuOpen ? "rotated" : ""}`}
                  />
                </div>
              ) : (
                <div className="guest-profile">
                  <User size={20} />
                  <span>Sign In</span>
                </div>
              )}
            </button>

            {user && menuOpen && (
              <div ref={dropdownRef} className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {getProfileImage() ? (
                      <img
                        src={getProfileImage()}
                        alt="Profile"
                        className="dropdown-profile-image"
                      />
                    ) : (
                      <div className="dropdown-profile-fallback">
                        {getDisplayName().charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="dropdown-user-info">
                    <p className="dropdown-name">{getDisplayName()}</p>
                    <p className="dropdown-email">{user.email}</p>
                  </div>
                </div>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut size={16} />
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultView="login"
      />
    </>
  );
};

export default Navbar;
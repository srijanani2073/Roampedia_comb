import "./Navbar.css";
import React, { useState, useEffect, useRef } from "react";
import { User, LogOut, Settings, ChevronDown, Globe, Newspaper, Wallet } from "lucide-react";
import { supabase } from "../supabaseClient";
import AuthModal from "./AuthModal";
import { Link, useNavigate } from "react-router-dom";

const Navbar = ({ user, setUser }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);
  const profileBtnRef = useRef(null);
  const navigate = useNavigate();

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
        setAuthOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setMenuOpen(false);
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
      setAuthOpen(true);
    }
  };

  const getDisplayName = () =>
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const getProfileImage = () =>
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

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
            <li><a href="/recommend">Recommendations</a></li>
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

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        setUser={setUser}
      />
    </>
  );
};

export default Navbar;

// import './Navbar.css';
// import React, { useState, useEffect, useRef } from "react";
// import { User, LogOut, Settings, ChevronDown, Globe } from "lucide-react";
// import { supabase } from "../supabaseClient";
// import AuthModal from "./AuthModal";

// const Navbar = ({ user, setUser }) => {
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [authOpen, setAuthOpen] = useState(false);
//   const [isLoggingOut, setIsLoggingOut] = useState(false);
//   const dropdownRef = useRef(null);
//   const profileBtnRef = useRef(null);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && 
//           !dropdownRef.current.contains(event.target) && 
//           !profileBtnRef.current.contains(event.target)) {
//         setMenuOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Close dropdown on escape key
//   useEffect(() => {
//     const handleEscape = (event) => {
//       if (event.key === 'Escape') {
//         setMenuOpen(false);
//         setAuthOpen(false);
//       }
//     };

//     document.addEventListener('keydown', handleEscape);
//     return () => document.removeEventListener('keydown', handleEscape);
//   }, []);

//   const handleLogout = async () => {
//     setIsLoggingOut(true);
//     try {
//       const { error } = await supabase.auth.signOut();
//       if (error) throw error;
      
//       setUser(null);
//       setMenuOpen(false);
//     } catch (error) {
//       console.error('Logout error:', error);
//       // Still close the dropdown even if logout fails
//       setMenuOpen(false);
//     } finally {
//       setIsLoggingOut(false);
//     }
//   };

//   const toggleProfileMenu = () => {
//     if (user) {
//       setMenuOpen(!menuOpen);
//     } else {
//       setAuthOpen(true);
//     }
//   };

//   const getDisplayName = () => {
//     if (!user) return '';
//     return user.user_metadata?.full_name || 
//            user.user_metadata?.name || 
//            user.email?.split('@')[0] || 
//            'User';
//   };

//   const getProfileImage = () => {
//     if (!user) return null;
//     return user.user_metadata?.avatar_url || 
//            user.user_metadata?.picture ||
//            null;
//   };

//   return (
//     <>
//       <nav className="navbar-thin">
//         <div className="navbar-container">
//           {/* Left side: brand/logo */}
//           <div className="navbar-logo">
//             <Globe size={24} />
//             <span>Roampedia</span>
//           </div>

//           {/* Right side: profile */}
//           <div className="profile-section">
//             <button
//               ref={profileBtnRef}
//               className={`profile-btn ${user ? 'logged-in' : 'guest'} ${menuOpen ? 'active' : ''}`}
//               onClick={toggleProfileMenu}
//               aria-label={user ? 'Open profile menu' : 'Sign in'}
//               aria-expanded={menuOpen}
//             >
//               {user ? (
//                 <div className="profile-info">
//                   <div className="profile-avatar">
//                     {getProfileImage() ? (
//                       <img 
//                         src={getProfileImage()} 
//                         alt="Profile" 
//                         className="profile-image"
//                         onError={(e) => {
//                           e.target.style.display = 'none';
//                           e.target.nextSibling.style.display = 'flex';
//                         }}
//                       />
//                     ) : null}
//                     <div 
//                       className="profile-fallback"
//                       style={{ display: getProfileImage() ? 'none' : 'flex' }}
//                     >
//                       {getDisplayName().charAt(0).toUpperCase()}
//                     </div>
//                   </div>
//                   <span className="profile-name-inline">{getDisplayName()}</span>
//                   <ChevronDown size={16} className={`dropdown-arrow ${menuOpen ? 'rotated' : ''}`} />
//                 </div>
//               ) : (
//                 <div className="guest-profile">
//                   <User size={20} />
//                   <span>Sign In</span>
//                 </div>
//               )}
//             </button>

//             {/* Dropdown (only if logged in) */}
//             {user && menuOpen && (
//               <div ref={dropdownRef} className="profile-dropdown">
//                 <div className="dropdown-header">
//                   <div className="dropdown-avatar">
//                     {getProfileImage() ? (
//                       <img 
//                         src={getProfileImage()} 
//                         alt="Profile" 
//                         className="dropdown-profile-image"
//                         onError={(e) => {
//                           e.target.style.display = 'none';
//                           e.target.nextSibling.style.display = 'flex';
//                         }}
//                       />
//                     ) : null}
//                     <div 
//                       className="dropdown-profile-fallback"
//                       style={{ display: getProfileImage() ? 'none' : 'flex' }}
//                     >
//                       {getDisplayName().charAt(0).toUpperCase()}
//                     </div>
//                   </div>
//                   <div className="dropdown-user-info">
//                     <p className="dropdown-name">{getDisplayName()}</p>
//                     <p className="dropdown-email">{user.email}</p>
//                   </div>
//                 </div>
                
//                 <div className="dropdown-divider" />
                
//                 <button className="dropdown-item" onClick={() => setMenuOpen(false)}>
//                   <Settings size={16} />
//                   <span>Settings</span>
//                 </button>
                
//                 <button 
//                   className="dropdown-item logout-item" 
//                   onClick={handleLogout}
//                   disabled={isLoggingOut}
//                 >
//                   <LogOut size={16} />
//                   <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </nav>

//       {/* Auth Modal */}
//       <AuthModal 
//         isOpen={authOpen}
//         onClose={() => setAuthOpen(false)} 
//         setUser={setUser}
//       />
//     </>
//   );
// };

// export default Navbar;
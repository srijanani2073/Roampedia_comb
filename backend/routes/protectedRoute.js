import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute component
 * 
 * Protects routes that require authentication.
 * Can also protect admin-only routes.
 * 
 * Usage:
 *   <ProtectedRoute>
 *     <UserProfile />
 *   </ProtectedRoute>
 * 
 *   <ProtectedRoute requireAdmin={true}>
 *     <AdminDashboard />
 *   </ProtectedRoute>
 */
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '20px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // Not authenticated - redirect to home
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Requires admin but user is not admin
  if (requireAdmin && user?.role !== 'admin') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '48px', margin: '0 0 20px 0' }}>🔒</h1>
        <h2 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Access Denied</h2>
        <p style={{ color: '#666', margin: '0 0 20px 0' }}>
          You need administrator privileges to access this page.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            background: '#4A90E2',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  // All checks passed - render the protected content
  return children;
};

export default ProtectedRoute;
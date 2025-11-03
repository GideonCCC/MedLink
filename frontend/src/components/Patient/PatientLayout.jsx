import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import './PatientLayout.css';

function PatientLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/');
  }

  function isActive(path) {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  return (
    <div className="patient-layout">
      {/* Brand name at top left */}
      <div className="patient-brand">
        <Link to="/patient/dashboard" className="brand-link">
          MedLink
        </Link>
      </div>

      {/* Main content grid: 1, 4, 6, 1 */}
      <div className="patient-content-grid">
        {/* Left margin - empty */}
        <div className="patient-left-margin"></div>

        {/* Left sidebar menu - 4 units */}
        <div className="patient-sidebar">
          <div className="sidebar-welcome">
            Welcome back, {user?.name || 'User'}
          </div>
          <nav className="sidebar-nav">
            <Link
              to="/patient/dashboard"
              className={`sidebar-nav-item ${isActive('/patient/dashboard') ? 'active' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/patient/book-visit"
              className={`sidebar-nav-item ${isActive('/patient/book-visit') ? 'active' : ''}`}
            >
              Book Visit
            </Link>
            <Link
              to="/patient/history"
              className={`sidebar-nav-item ${isActive('/patient/history') ? 'active' : ''}`}
            >
              Health Record
            </Link>
            <button onClick={handleLogout} className="sidebar-nav-item sidebar-logout">
              Logout
            </button>
          </nav>
        </div>

        {/* Right content area - 6 units */}
        <div className="patient-content">
          {children}
        </div>

        {/* Right margin - empty */}
        <div className="patient-right-margin"></div>
      </div>
    </div>
  );
}

PatientLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PatientLayout;


import React, { useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import Icon from './Icon';
import './Navbar.css';

function navLinkClass({ isActive }) {
  return isActive ? 'navbar-link active' : 'navbar-link';
}

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="navbar-logo">
            <Icon name="heartPulse" size={20} strokeWidth={2.2} />
          </span>
          MedLink
        </Link>
        <div className="navbar-menu">
          {user ? (
            <>
              {user.role === 'patient' && (
                <>
                  <NavLink to="/patient/dashboard" className={navLinkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/patient/appointments/new" className={navLinkClass}>
                    Book Appointment
                  </NavLink>
                  <NavLink to="/patient/history" className={navLinkClass}>
                    History
                  </NavLink>
                </>
              )}
              {user.role === 'doctor' && (
                <>
                  <NavLink
                    to="/doctor/upcoming-appointments"
                    className={navLinkClass}
                  >
                    Dashboard
                  </NavLink>
                  <NavLink to="/doctor/availability" className={navLinkClass}>
                    Availability
                  </NavLink>
                  <NavLink to="/doctor/past-appointments" className={navLinkClass}>
                    Past Appointments
                  </NavLink>
                </>
              )}
              <span className="navbar-user">
                <span className="navbar-avatar" aria-hidden="true">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                Hello, {user.name}
              </span>
              <button onClick={handleLogout} className="navbar-logout">
                Logout
              </button>
            </>
          ) : (
            <button 
              onClick={() => navigate('/login')} 
              className="navbar-login"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/login');
                }
              }}
              tabIndex={0}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

Navbar.propTypes = {
  // Navbar component doesn't receive props, but we document it for consistency
};

export default Navbar;

import React, { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

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
          MedLink
        </Link>
        <div className="navbar-menu">
          {user ? (
            <>
              {user.role === 'patient' && (
                <>
                  <Link to="/patient/dashboard" className="navbar-link">
                    Dashboard
                  </Link>
                  <Link to="/patient/appointments/new" className="navbar-link">
                    Book Appointment
                  </Link>
                  <Link to="/patient/history" className="navbar-link">
                    History
                  </Link>
                </>
              )}
              {user.role === 'doctor' && (
                <>
                  <Link to="/doctor/availability" className="navbar-link">
                    Availability
                  </Link>
                  <Link
                    to="/doctor/upcoming-appointments"
                    className="navbar-link"
                  >
                    Upcoming Appointments
                  </Link>
                  <Link to="/doctor/past-appointments" className="navbar-link">
                    Past Appointments
                  </Link>
                </>
              )}
              <span className="navbar-user">Hello, {user.name}</span>
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

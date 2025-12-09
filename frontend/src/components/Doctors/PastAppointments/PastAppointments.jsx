import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../utils/apiClient';
import PropTypes from 'prop-types';
import './PastAppointments.css';

export default function PastAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAppointments = useCallback(async () => {
    try {
      const data = await apiClient('/api/doctor/past-appointments');
      setAllAppointments(data.appointments);
      filterAppointments(data.appointments, searchQuery);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const filterAppointments = (appts, query) => {
    if (!query || query.trim() === '') {
      setAppointments(appts);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered = appts.filter((apt) => {
      const patientName = apt.patientName?.toLowerCase() || '';
      return patientName.includes(searchTerm);
    });

    setAppointments(filtered);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterAppointments(allAppointments, query);
  };

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Keyboard navigation for search and cards
  useEffect(() => {
    const handleArrowKeyNavigation = (e) => {
      // Don't interfere with input fields, selects, or textareas when typing
      if (
        (e.target.tagName === 'INPUT' ||
         e.target.tagName === 'SELECT' ||
         e.target.tagName === 'TEXTAREA') &&
        e.key !== 'Enter'
      ) {
        return;
      }

      // Enter in search input: move to first card
      if (e.key === 'Enter' && e.target.id === 'past-appointments-search-input') {
        e.preventDefault();
        const firstCard = document.querySelector('.appointment-card');
        if (firstCard) {
          firstCard.focus();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Only handle if focus is within the content area (not sidebar)
        const contentArea = document.querySelector('.doctor-content');
        if (!contentArea || !contentArea.contains(e.target)) {
          return; // Don't handle if focus is in sidebar
        }

        const allFocusableElements = Array.from(
          contentArea.querySelectorAll(
            '.search-input, .appointment-card, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => {
          return el.offsetParent !== null && 
                 !el.disabled && 
                 !el.hasAttribute('aria-hidden') &&
                 window.getComputedStyle(el).visibility !== 'hidden' &&
                 !el.closest('.doctor-menu-bar') && // Exclude sidebar elements
                 !el.closest('.sidebar-nav'); // Exclude sidebar navigation
        });

        if (allFocusableElements.length === 0) return;

        const currentIndex = allFocusableElements.findIndex(
          el => el === document.activeElement
        );

        if (currentIndex === -1) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            allFocusableElements[0]?.focus();
          }
          return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = currentIndex < allFocusableElements.length - 1 
            ? currentIndex + 1 
            : 0;
          allFocusableElements[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = currentIndex > 0 
            ? currentIndex - 1 
            : allFocusableElements.length - 1;
          allFocusableElements[prevIndex]?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleArrowKeyNavigation);
    return () => {
      document.removeEventListener('keydown', handleArrowKeyNavigation);
    };
  }, [appointments]);

  return (
    <div className="past-appointments">
      <div className="info-container">
        <h1>Past Appointments</h1>
        <div className="search-container">
          <input
            type="text"
            id="past-appointments-search-input"
            name="past-appointments-search"
            placeholder="Search by patient name..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
            aria-label="Search appointments by patient name"
          />
        </div>
      </div>
      {error && <div className="error-message" role="alert">{error}</div>}
      <div className="upcoming-section">
        {loading ? (
          <div className="loading">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="empty-state">
            <p>
              {searchQuery
                ? `No appointments found matching "${searchQuery}".`
                : "You don't have any past appointments."}
            </p>
          </div>
        ) : (
          <>
            {searchQuery && (
              <div className="search-results-info">
                Found {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
              </div>
            )}
            <div className="appointments-grid">
              {appointments.map((appointment) => (
                <div key={appointment._id} tabIndex={0}>
                  <PastAppointmentCard
                    appointment={appointment}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PastAppointmentCard({ appointment }) {
  return (
    <div className="appointment-card">
      <div className="appointment-header">
        <h3>{appointment.patientName}</h3>
        <span className={`status-badge status-${appointment.status}`}>
          {appointment.status}
        </span>
      </div>
      <div className="appointment-details">
        <p className="appointment-date">
          {formatDate(appointment.startDateTime)}
        </p>
        {appointment.reason && (
          <p className="appointment-reason">{appointment.reason}</p>
        )}
      </div>
    </div>
  );
}

PastAppointmentCard.propTypes = {
  appointment: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    patientName: PropTypes.string.isRequired,
    startDateTime: PropTypes.string.isRequired,
    reason: PropTypes.string,
    status: PropTypes.string.isRequired,
  }).isRequired,
};

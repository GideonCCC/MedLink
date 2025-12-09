import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { apiClient } from '../../utils/apiClient';
import './PatientHistory.css';

function PatientHistory() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: '',
    page: 1,
  });
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, [filters]);

  // Arrow key and Enter key navigation for keyboard accessibility
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      // Only handle if focus is within the content area (not sidebar)
      const contentArea = document.querySelector('.patient-content');
      if (!contentArea || !contentArea.contains(e.target)) {
        return; // Don't handle if focus is in sidebar
      }

      // Allow ESC key to bubble up to PatientLayout for returning to sidebar
      if (e.key === 'Escape') {
        return; // Let PatientLayout handle ESC
      }

      const historyContainer = document.querySelector('.patient-history');
      if (!historyContainer) return;

      // Include select elements in focusable elements for navigation
      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const allFocusableElements = Array.from(
        historyContainer.querySelectorAll(focusableSelectors)
      ).filter(el => {
        return el.offsetParent !== null && 
               !el.disabled && 
               !el.hasAttribute('aria-hidden') &&
               window.getComputedStyle(el).visibility !== 'hidden' &&
               !el.closest('.patient-sidebar') && // Exclude sidebar elements
               !el.closest('.sidebar-nav'); // Exclude sidebar navigation
      });

      if (allFocusableElements.length === 0) return;

      const currentIndex = allFocusableElements.findIndex(
        el => el === document.activeElement
      );

      // Handle select elements specially
      if (e.target.tagName === 'SELECT') {
        // When select is focused but not open, allow arrow keys to navigate between fields
        // When select dropdown is open, let browser handle arrow keys for option selection
        // Check if select is open by checking if it has focus and if the dropdown is visible
        // For native select, we can't easily detect if dropdown is open
        // So we'll allow Enter to open/close the dropdown (browser default)
        // and only prevent arrow keys when the select is NOT the active element (shouldn't happen, but just in case)
        
        // For Enter key on select: let browser handle it (opens/closes dropdown or confirms selection)
        if (e.key === 'Enter') {
          return; // Let browser handle Enter on select
        }
        
        // For arrow keys on select: 
        // - If dropdown is open, let browser handle it (selects options)
        // - If dropdown is closed, we want to navigate to next/prev field
        // Since we can't reliably detect if dropdown is open, we'll use a heuristic:
        // If user presses arrow key and the select is focused, assume they want to navigate between fields
        // But we need to be careful - if the dropdown is open, we should let browser handle it
        
        // For now, let's allow arrow keys to navigate between fields when select is focused
        // The browser will handle opening the dropdown if needed
        // Actually, for native select, arrow keys when focused will open dropdown and select options
        // So we should NOT prevent default for arrow keys on select
        return; // Let browser handle all keys on select element
      }

      // Handle Enter key: move to next field/button (except for buttons/links where it should trigger action)
      if (e.key === 'Enter') {
        const currentElement = document.activeElement;
        const isInput = currentElement.tagName === 'INPUT' || currentElement.tagName === 'TEXTAREA';
        
        if (isInput && currentIndex !== -1) {
          // In input fields, Enter moves to next field
          e.preventDefault();
          const nextIndex = currentIndex < allFocusableElements.length - 1 
            ? currentIndex + 1 
            : 0;
          allFocusableElements[nextIndex]?.focus();
          return;
        }
        // For buttons and links, let default behavior handle it (trigger action)
        return;
      }

      // Don't interfere if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Arrow keys: navigate between focusable elements (including select)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
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

    document.addEventListener('keydown', handleKeyNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyNavigation);
    };
  }, []);

  async function loadAppointments() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      params.append('page', filters.page);
      params.append('limit', '20');

      const data = await apiClient(`/api/appointments?${params.toString()}`);
      setAppointments(data.appointments);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  }

  function handlePageChange(newPage) {
    setFilters((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  return (
    <div className="patient-history">
      <div className="history-container">
        <div className="history-header">
          <h1>Appointment History</h1>
          <p>View and manage all your appointments</p>
        </div>

        <div className="history-filters">
          <div className="filter-group">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              name="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="from-date">From Date</label>
            <input
              type="date"
              id="from-date"
              name="from-date"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="to-date">To Date</label>
            <input
              type="date"
              id="to-date"
              name="to-date"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
            />
          </div>

          <button
            onClick={() => setFilters({ status: '', from: '', to: '', page: 1 })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setFilters({ status: '', from: '', to: '', page: 1 });
              }
            }}
            className="clear-filters"
          >
            Clear Filters
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="empty-state">
            <p>No appointments found matching your filters.</p>
          </div>
        ) : (
          <>
            <div className="history-list">
              {appointments.map((apt) => (
                <HistoryItem
                  key={apt.id}
                  appointment={apt}
                />
              ))}
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  onKeyDown={(e) => {
                    if (!(pagination.page === 1) && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handlePageChange(pagination.page - 1);
                    }
                  }}
                  disabled={pagination.page === 1}
                  className="page-button"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  onKeyDown={(e) => {
                    if (!(pagination.page === pagination.pages) && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handlePageChange(pagination.page + 1);
                    }
                  }}
                  disabled={pagination.page === pagination.pages}
                  className="page-button"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ appointment }) {
  function formatDate(dateString) {
    const date = new Date(dateString);
    // Use clinic timezone (America/New_York) for consistent date display
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getStatusClass(status) {
    const classes = {
      upcoming: 'status-upcoming',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      'no-show': 'status-no-show',
    };
    return classes[status] || '';
  }

  return (
    <div className="history-item">
      <div className="history-item-header">
        <div>
          <h2>{appointment.doctorName}</h2>
          {appointment.doctorSpecialty && (
            <p className="specialty">{appointment.doctorSpecialty}</p>
          )}
        </div>
        <span className={`status-badge ${getStatusClass(appointment.status)}`}>
          {appointment.status}
        </span>
      </div>

      <div className="history-item-details">
        <p className="date-time">{formatDate(appointment.startDateTime)}</p>
        {appointment.reason && <p className="reason">{appointment.reason}</p>}
      </div>

    </div>
  );
}

HistoryItem.propTypes = {
  appointment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    doctorName: PropTypes.string.isRequired,
    doctorSpecialty: PropTypes.string,
    startDateTime: PropTypes.string.isRequired,
    reason: PropTypes.string,
    status: PropTypes.string.isRequired,
  }).isRequired,
};

export default PatientHistory;


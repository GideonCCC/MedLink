import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { apiClient } from '../../utils/apiClient';
import './PatientDashboard.css';

function PatientDashboard() {
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(null);

  useEffect(() => {
    loadUpcomingAppointments();
  }, []);

  // Arrow key and Enter key navigation for keyboard accessibility
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      // Don't interfere if a modal is open
      if (cancelConfirm) return;

      // Only handle if focus is within the content area (not sidebar)
      const contentArea = document.querySelector('.patient-content');
      if (!contentArea || !contentArea.contains(e.target)) {
        return; // Don't handle if focus is in sidebar
      }

      const dashboardContainer = document.querySelector('.patient-dashboard');
      if (!dashboardContainer) return;

      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const allFocusableElements = Array.from(
        dashboardContainer.querySelectorAll(focusableSelectors)
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

      // Handle Enter key: move to next field/button (except for buttons/links where it should trigger action)
      if (e.key === 'Enter') {
        const currentElement = document.activeElement;
        const isInput = currentElement.tagName === 'INPUT' || currentElement.tagName === 'SELECT' || currentElement.tagName === 'TEXTAREA';
        
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

      // Don't interfere if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

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
  }, [cancelConfirm]);

  async function loadUpcomingAppointments() {
    try {
      setLoading(true);
      const now = new Date().toISOString();
      const data = await apiClient(
        `/api/appointments?status=upcoming&from=${now}&page=1&limit=5`
      );
      setUpcomingAppointments(data.appointments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCancelClick(id) {
    setCancelConfirm(id);
  }

  function handleConfirmCancel() {
    if (!cancelConfirm) return;
    performCancel(cancelConfirm);
  }

  function handleCancelDismiss() {
    setCancelConfirm(null);
  }

  async function performCancel(id) {
    try {
      await apiClient(`/api/appointments/${id}`, { method: 'DELETE' });
      setCancelConfirm(null);
      loadUpcomingAppointments();
    } catch (err) {
      setError(err.message);
      setCancelConfirm(null);
    }
  }

  return (
    <div className="patient-dashboard">
      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-header-section">
        <h2>Upcoming Appointments</h2>
      </div>

      <div className="upcoming-section">
        {loading ? (
          <div className="loading">Loading appointments...</div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="empty-state">
            <p>You don&apos;t have any upcoming appointments.</p>
            <Link 
              to="/patient/book-visit" 
              className="link-button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  window.location.href = '/patient/book-visit';
                }
              }}
            >
              Book your first appointment
            </Link>
          </div>
        ) : (
          <div className="appointments-grid">
            {upcomingAppointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onCancel={handleCancelClick}
              />
            ))}
          </div>
        )}
      </div>

      {cancelConfirm && (
        <CancelConfirmModal
          onConfirm={handleConfirmCancel}
          onDismiss={handleCancelDismiss}
        />
      )}
    </div>
  );
}

function AppointmentCard({ appointment, onCancel }) {
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

  return (
    <div className="appointment-card">
      <div className="appointment-header">
        <h3>{appointment.doctorName}</h3>
        <span className="status-badge status-upcoming">
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
        {appointment.doctorSpecialty && (
          <p className="appointment-specialty">{appointment.doctorSpecialty}</p>
        )}
      </div>
      <div className="appointment-actions">
        <Link
          to={`/patient/appointments/${appointment.id}/edit`}
          className="action-button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // Navigate and focus on the edit page
              window.location.href = `/patient/appointments/${appointment.id}/edit`;
              // Focus will be handled by the edit page when it loads
            }
          }}
          onClick={(e) => {
            // On click, navigate - focus will be handled by the edit page
            // Don't prevent default, let Link handle navigation
          }}
        >
          Reschedule
        </Link>
        <button
          onClick={() => {
            onCancel(appointment.id);
            // Focus will be handled by the modal when it opens
            setTimeout(() => {
              const modal = document.querySelector('.modal-content');
              if (modal) {
                const firstFocusable = modal.querySelector(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (firstFocusable) {
                  firstFocusable.focus();
                }
              }
            }, 100);
          }}
          className="cancel-appointment-button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCancel(appointment.id);
              // Focus on modal after it opens
              setTimeout(() => {
                const modal = document.querySelector('.modal-content');
                if (modal) {
                  const firstFocusable = modal.querySelector(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                  );
                  if (firstFocusable) {
                    firstFocusable.focus();
                  }
                }
              }, 100);
            }
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

AppointmentCard.propTypes = {
  appointment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    doctorName: PropTypes.string.isRequired,
    doctorSpecialty: PropTypes.string,
    startDateTime: PropTypes.string.isRequired,
    reason: PropTypes.string,
    status: PropTypes.string.isRequired,
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
};

function CancelConfirmModal({ onConfirm, onDismiss }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    // Focus the first focusable element in the modal when it opens
    if (modalRef.current) {
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          modalRef.current.focus();
        }
      }, 50);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onDismiss]);

  const handleKeyDown = (e) => {
    // Trap focus within modal
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onDismiss}
      role="presentation"
      aria-hidden="false"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        aria-describedby="cancel-modal-description"
        tabIndex={-1}
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <h3 id="cancel-modal-title">Cancel Appointment?</h3>
        <p id="cancel-modal-description">
          Are you sure you want to cancel this appointment? This action cannot
          be undone.
        </p>
        <div className="modal-actions">
          <button
            onClick={onDismiss}
            className="modal-cancel-button"
            aria-label="Keep appointment"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDismiss();
              }
            }}
          >
            Keep
          </button>
          <button
            onClick={onConfirm}
            className="modal-confirm-button"
            aria-label="Cancel appointment"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onConfirm();
              }
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

CancelConfirmModal.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default PatientDashboard;

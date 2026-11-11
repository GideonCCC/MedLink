import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { apiClient } from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  getDateParts,
  greetingForNow,
  relativeDayLabel,
  todayLabel,
} from '../../utils/dateDisplay';
import Icon from '../Shared/Icon';
import '../Shared/Dashboard.css';
import './PatientDashboard.css';

function PatientDashboard() {
  const { user } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [completedTotal, setCompletedTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(null);

  useEffect(() => {
    loadUpcomingAppointments();
    loadCompletedTotal();
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
      setUpcomingTotal(data.pagination?.total ?? data.appointments.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompletedTotal() {
    try {
      const data = await apiClient('/api/appointments?status=completed&page=1&limit=1');
      setCompletedTotal(data.pagination?.total ?? 0);
    } catch (err) {
      setCompletedTotal(null);
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

  const firstName = user?.name?.split(' ')[0] || 'there';
  const nextAppointment = upcomingAppointments[0];
  const laterAppointments = upcomingAppointments.slice(1);

  return (
    <div className="patient-dashboard">
      {error && <div className="error-banner">{error}</div>}

      <section className="dash-hero">
        <div className="dash-hero-copy">
          <div className="dash-hero-date">
            <Icon name="calendar" size={15} />
            {todayLabel()}
          </div>
          <h2 className="dash-hero-title">
            {greetingForNow()}, {firstName}
          </h2>
          <p className="dash-hero-subtitle">
            {loading
              ? 'Loading your schedule...'
              : nextAppointment
                ? `Your next visit is ${relativeDayLabel(nextAppointment.startDateTime).toLowerCase()} with ${nextAppointment.doctorName}.`
                : 'You have no upcoming visits. Book one in under a minute.'}
          </p>
        </div>
        <Link to="/patient/book-visit" className="dash-hero-action">
          <Icon name="calendarCheck" size={18} />
          Book a visit
        </Link>
      </section>

      <div className="dash-stats">
        <div className="dash-stat">
          <span className="dash-stat-icon">
            <Icon name="calendar" size={22} />
          </span>
          <div className="dash-stat-body">
            <div className="dash-stat-label">Upcoming</div>
            <div className="dash-stat-value">{loading ? '–' : upcomingTotal}</div>
            <div className="dash-stat-hint">
              {upcomingTotal === 1 ? 'Scheduled visit' : 'Scheduled visits'}
            </div>
          </div>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-icon tone-info">
            <Icon name="clock" size={22} />
          </span>
          <div className="dash-stat-body">
            <div className="dash-stat-label">Next visit</div>
            <div className="dash-stat-value dash-stat-value-text">
              {nextAppointment ? relativeDayLabel(nextAppointment.startDateTime) : '–'}
            </div>
            <div className="dash-stat-hint">
              {nextAppointment
                ? `${getDateParts(nextAppointment.startDateTime).weekday}, ${getDateParts(nextAppointment.startDateTime).time}`
                : 'Nothing scheduled'}
            </div>
          </div>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-icon tone-violet">
            <Icon name="shieldCheck" size={22} />
          </span>
          <div className="dash-stat-body">
            <div className="dash-stat-label">Completed</div>
            <div className="dash-stat-value">{completedTotal ?? '–'}</div>
            <div className="dash-stat-hint">Past visits</div>
          </div>
        </div>
      </div>

      <div className="upcoming-section">
        {loading ? (
          <div className="loading">Loading appointments...</div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <Icon name="calendarCheck" size={28} />
            </span>
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
          <>
            <div className="dash-section-head">
              <h3 className="dash-section-title">Next appointment</h3>
            </div>
            <AppointmentCard
              featured
              appointment={nextAppointment}
              onCancel={handleCancelClick}
            />

            {laterAppointments.length > 0 && (
              <>
                <div className="dash-section-head later-head">
                  <h3 className="dash-section-title">Coming up later</h3>
                  {upcomingTotal > upcomingAppointments.length && (
                    <Link to="/patient/history" className="dash-section-link">
                      View all {upcomingTotal}
                      <Icon name="arrowRight" size={15} />
                    </Link>
                  )}
                </div>
                <div className="appointments-list">
                  {laterAppointments.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onCancel={handleCancelClick}
                    />
                  ))}
                </div>
              </>
            )}
          </>
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

function AppointmentCard({ appointment, onCancel, featured = false }) {
  const parts = getDateParts(appointment.startDateTime);

  return (
    <div className={`appointment-card ${featured ? 'appointment-card-featured' : 'appointment-card-row'}`}>
      <div className="dash-date-tile" aria-hidden="true">
        <span className="dash-date-tile-month">{parts.month}</span>
        <span className="dash-date-tile-day">{parts.day}</span>
        <span className="dash-date-tile-weekday">{parts.weekday}</span>
      </div>
      <div className="appointment-main">
        <div className="appointment-header">
          <div className="appointment-doctor">
            {featured && (
              <span className="appointment-doctor-icon">
                <Icon name="stethoscope" size={20} />
              </span>
            )}
            <div>
              <h3>{appointment.doctorName}</h3>
              {appointment.doctorSpecialty && (
                <p className="appointment-specialty">{appointment.doctorSpecialty}</p>
              )}
            </div>
          </div>
          <span className="dash-chip">{relativeDayLabel(appointment.startDateTime)}</span>
        </div>
        <div className="appointment-details">
          <p className="appointment-date">
            <Icon name="clock" size={16} />
            <span>
              {parts.fullDate} · {parts.time}
            </span>
          </p>
          {appointment.reason && (
            <p className="appointment-reason">
              <Icon name="fileText" size={16} />
              <span>{appointment.reason}</span>
            </p>
          )}
        </div>
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
  featured: PropTypes.bool,
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

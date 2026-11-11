import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import Icon from '../../Shared/Icon';
import { getInitials } from '../initials';
import { getDateParts } from '../../../utils/dateDisplay';
import './UpcomingAppointmentCard.css';

function durationMinutes(start, end) {
  if (!end) return 30;
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
}

export default function UpcomingAppointmentCard({
  type,
  appointment,
  onCancel,
}) {
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelConfirmTimeout, setCancelConfirmTimeout] = useState(false);

  const ConfirmCancellationModal = () => {
    const modalRef = useRef(null);
    const firstFocusableRef = useRef(null);

    useEffect(() => {
      if (!cancelConfirm) return;
      
      document.body.style.overflow = 'hidden';
      
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          setCancelConfirmTimeout(false);
          setTimeout(() => setCancelConfirm(false), 500);
        }
      };

      document.addEventListener('keydown', handleEscape);
      
      // Focus first button when modal opens
      setTimeout(() => {
        if (firstFocusableRef.current) {
          firstFocusableRef.current.focus();
        }
      }, 100);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }, [cancelConfirm]);

    const handleKeyDown = (e) => {
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

    return (
      <div className={`cancel-modal-bg ${cancelConfirmTimeout ? '' : 'hide'}`}>
        <div
          className={`cancel-confirmation-modal ${cancelConfirmTimeout ? '' : 'hide'}`}
          ref={modalRef}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
        >
          <h3 id="cancel-modal-title" className="cancel-confirmation-modal-title">
            Cancel Appointment?
          </h3>
          <p className="cancel-confirmation-modal-description">
            Are you sure you want to cancel this appointment?
          </p>
          <p className="cancel-confirmation-modal-description-warning">
            This action cannot be undone.
          </p>
          <div className="cancel-confirmation-modal-actions">
            <button
              className="cancel-confirmation-modal-keep-button"
              onClick={() => {
                setCancelConfirmTimeout(false);
                setTimeout(() => setCancelConfirm(false), 500);
              }}
              ref={firstFocusableRef}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCancelConfirmTimeout(false);
                  setTimeout(() => setCancelConfirm(false), 500);
                }
              }}
            >
              Keep
            </button>
            <button
              className="cancel-confirmation-modal-confirm-button"
              onClick={() => {
                setCancelConfirmTimeout(false);
                setTimeout(() => setCancelConfirm(false), 500);
                onCancel();
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCancelConfirmTimeout(false);
                  setTimeout(() => setCancelConfirm(false), 500);
                  onCancel();
                }
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NoShowConfirmationModal = () => {
    const modalRef = useRef(null);
    const firstFocusableRef = useRef(null);

    useEffect(() => {
      if (!cancelConfirm) return;
      
      document.body.style.overflow = 'hidden';
      
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          setCancelConfirmTimeout(false);
          setTimeout(() => setCancelConfirm(false), 500);
        }
      };

      document.addEventListener('keydown', handleEscape);
      
      // Focus first button when modal opens
      setTimeout(() => {
        if (firstFocusableRef.current) {
          firstFocusableRef.current.focus();
        }
      }, 100);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }, [cancelConfirm]);

    const handleKeyDown = (e) => {
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

    return (
      <div className={`cancel-modal-bg ${cancelConfirmTimeout ? '' : 'hide'}`}>
        <div
          className={`cancel-confirmation-modal ${cancelConfirmTimeout ? '' : 'hide'}`}
          ref={modalRef}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="no-show-modal-title"
        >
          <h3 id="no-show-modal-title" className="cancel-confirmation-modal-title">
            No Show Appointment?
          </h3>
          <p className="cancel-confirmation-modal-description">
            Are you sure you want to mark this appointment as no show?
          </p>
          <p className="cancel-confirmation-modal-description-warning">
            This action cannot be undone.
          </p>
          <div className="cancel-confirmation-modal-actions">
            <button
              className="cancel-confirmation-modal-keep-button"
              onClick={() => {
                setCancelConfirmTimeout(false);
                setTimeout(() => setCancelConfirm(false), 500);
              }}
              ref={firstFocusableRef}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCancelConfirmTimeout(false);
                  setTimeout(() => setCancelConfirm(false), 500);
                }
              }}
            >
              Keep Appointment
            </button>
            <button
              className="cancel-confirmation-modal-confirm-button"
              onClick={() => {
                setCancelConfirmTimeout(false);
                setTimeout(() => setCancelConfirm(false), 500);
                onCancel();
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCancelConfirmTimeout(false);
                  setTimeout(() => setCancelConfirm(false), 500);
                  onCancel();
                }
              }}
            >
              Confirm No Show
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="upcoming-appointment-card">
      {cancelConfirm && type !== 'current' && <ConfirmCancellationModal />}
      {cancelConfirm && type === 'current' && <NoShowConfirmationModal />}
      <div className={`appointment-card ${type === 'current' ? 'appointment-card-current' : ''}`}>
        <div className="agenda-time">
          <span className="agenda-time-start">
            {getDateParts(appointment.startDateTime).time}
          </span>
          <span className="agenda-time-duration">
            {durationMinutes(appointment.startDateTime, appointment.endDateTime)} min
          </span>
        </div>
        <span className="dash-avatar" aria-hidden="true">
          {getInitials(appointment.patientName) || <Icon name="user" size={18} />}
        </span>
        <div className="agenda-main">
          <h3>{appointment.patientName}</h3>
          {appointment.reason && (
            <p className="appointment-reason">
              <Icon name="fileText" size={15} />
              {appointment.reason}
            </p>
          )}
        </div>
        <span className={`status-badge ${type === 'current' ? 'status-live' : 'status-upcoming'}`}>
          {type === 'current' ? 'In progress' : 'Upcoming'}
        </span>
        <div
          className={`appointment-actions ${type === 'current' ? 'no-show-actions' : ''}`}
        >
          <button
            onClick={() => {
              setCancelConfirmTimeout(true);
              setCancelConfirm(true);
            }}
            className={`${type === 'current' ? 'no-show-button' : 'cancel-appointment-button'}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setCancelConfirmTimeout(true);
                setCancelConfirm(true);
              }
            }}
          >
            {type === 'current' ? 'Mark as No Show' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

UpcomingAppointmentCard.propTypes = {
  type: PropTypes.oneOf(['current', 'upcoming']).isRequired,
  appointment: PropTypes.shape({
    patientName: PropTypes.string.isRequired,
    startDateTime: PropTypes.string.isRequired,
    endDateTime: PropTypes.string,
    reason: PropTypes.string,
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
};

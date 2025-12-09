import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import './DoctorAvailibility.css';
import AvailibilityCard from './AvailibilityCard';
import { apiClient } from '../../../utils/apiClient';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function DoctorAvailibility() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Ref to store all availability data from child components
  const [availability, setAvailability] = useState({
    Monday: new Set(),
    Tuesday: new Set(),
    Wednesday: new Set(),
    Thursday: new Set(),
    Friday: new Set(),
    Saturday: new Set(),
    Sunday: new Set(),
  });

  useEffect(() => {
    async function loadAvailability() {
      try {
        const data = await apiClient('/api/doctor/my-availability');
        let initial = {};
        DAYS.forEach((day) => {
          initial[day] = new Set(
            (data?.availability && data.availability[day]) || []
          );
        });
        setAvailability(initial);
      } catch (err) {
        const initial = {};
        DAYS.forEach((day) => {
          initial[day] = new Set();
        });
        setAvailability(initial);
      }
    }
    loadAvailability();
  }, []);

  const handleSaveClick = () => {
    setShowSaveConfirm(true);
  };

  const handleSaveConfirm = async () => {
    setShowSaveConfirm(false);
    setSubmitting(true);
    setError('');

    // Convert Sets to arrays for easier serialization
    const payload = {};
    DAYS.forEach((day) => {
      payload[day] = Array.from(availability[day]);
    });

    try {
      await apiClient('/api/doctor/update-availability', {
        method: 'POST',
        body: JSON.stringify({ availability: payload }),
      });
    } catch (err) {
      setError(err.message || 'Failed to save availability');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCancel = () => {
    setShowSaveConfirm(false);
  };

  // Global keyboard navigation for cross-day navigation
  useEffect(() => {
    const handleCrossDayNavigation = (e) => {
      // Only handle arrow keys when focus is on a time slot button
      if (
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        e.target.classList.contains('slot-button')
      ) {
        const dayCard = e.target.closest('.day-card');
        if (!dayCard) return;
        
        const allDayButtons = Array.from(dayCard.querySelectorAll('.slot-button'));
        const currentIndex = allDayButtons.findIndex(btn => btn === e.target);
        
        if (currentIndex === -1) return;
        
        const isLastButton = currentIndex === allDayButtons.length - 1;
        const isFirstButton = currentIndex === 0;
        
        // Get the day name from the day card
        const dayHeader = dayCard.querySelector('.day-header');
        const dayName = dayHeader?.textContent?.split('\n')[0]?.trim() || '';
        const isSunday = dayName === 'Sunday';
        const isMonday = dayName === 'Monday';
        
        // Check if we're at a boundary where navigation should go to save button or next/prev day
        if (
          (e.key === 'ArrowRight' && isLastButton) ||
          (e.key === 'ArrowDown' && isLastButton)
        ) {
          // If it's Sunday and last button, navigate to save button
          if (isSunday && isLastButton && e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            const saveButton = document.querySelector('.save-button');
            if (saveButton) {
              saveButton.focus();
            }
            return;
          }
          
          // Navigate to next day's first button
          const allDayCards = Array.from(document.querySelectorAll('.day-card'));
          const currentDayIndex = allDayCards.findIndex(card => card === dayCard);
          if (currentDayIndex < allDayCards.length - 1) {
            e.preventDefault();
            e.stopPropagation();
            const nextDayCard = allDayCards[currentDayIndex + 1];
            const firstButton = nextDayCard?.querySelector('.slot-button');
            if (firstButton) {
              firstButton.focus();
            }
          }
        } else if (
          (e.key === 'ArrowLeft' && isFirstButton) ||
          (e.key === 'ArrowUp' && isFirstButton)
        ) {
          // Navigate to previous day's last button
          const allDayCards = Array.from(document.querySelectorAll('.day-card'));
          const currentDayIndex = allDayCards.findIndex(card => card === dayCard);
          if (currentDayIndex > 0) {
            e.preventDefault();
            e.stopPropagation();
            const prevDayCard = allDayCards[currentDayIndex - 1];
            const lastButton = Array.from(prevDayCard?.querySelectorAll('.slot-button') || []).pop();
            if (lastButton) {
              lastButton.focus();
            }
          } else if (isMonday && isFirstButton && e.key === 'ArrowUp') {
            // If it's Monday (first day) and first button, navigate to save button
            e.preventDefault();
            e.stopPropagation();
            const saveButton = document.querySelector('.save-button');
            if (saveButton) {
              saveButton.focus();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleCrossDayNavigation, true);
    return () => {
      document.removeEventListener('keydown', handleCrossDayNavigation, true);
    };
  }, []);

  return (
    <>
      {submitting && (
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
        </div>
      )}
      <div className="doctor-availability">
        {error && <div className="error-message" role="alert">{error}</div>}
        <div className="info-container">
          <h1>Set Your Availability</h1>
          <p className="availability-description">
            Click on time slots to select your available hours. Selected slots will be highlighted in green.
            <br />
            <strong>Time slots:</strong> 9:00 AM - 5:00 PM (30-minute intervals)
            <br />
            <em>Scroll horizontally to view all days (Monday - Sunday)</em>
          </p>
        </div>

        <div className="availability-cards-container">
          {DAYS.map((day) => (
            <AvailibilityCard
              key={day}
              day={day}
              availability={availability[day]}
              setNewAvailability={(newSet) => {
                setAvailability((prev) => ({
                  ...prev,
                  [day]: newSet,
                }));
              }}
            />
          ))}
        </div>
        <div className="save-availability">
          <button
            onClick={handleSaveClick}
            disabled={submitting}
            className="save-button"
            aria-label="Save availability settings"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!submitting) {
                  handleSaveClick();
                }
              }
            }}
          >
            {submitting ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>

      {showSaveConfirm && (
        <SaveConfirmModal
          onConfirm={handleSaveConfirm}
          onDismiss={handleSaveCancel}
        />
      )}
    </>
  );
}

function SaveConfirmModal({ onConfirm, onDismiss }) {
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onDismiss]);

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
        aria-labelledby="save-modal-title"
        aria-describedby="save-modal-description"
        tabIndex={-1}
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <h3 id="save-modal-title">Save Availability?</h3>
        <p id="save-modal-description">
          Are you sure you want to save these availability settings? This will update your schedule and affect when patients can book appointments with you.
        </p>
        <div className="modal-actions">
          <button
            onClick={onDismiss}
            className="modal-cancel-button"
            aria-label="Cancel saving"
            ref={firstFocusableRef}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDismiss();
              }
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="modal-confirm-button"
            aria-label="Save availability"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onConfirm();
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

SaveConfirmModal.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

DoctorAvailibility.propTypes = {
  // DoctorAvailibility component doesn't receive props, but we document it for consistency
};

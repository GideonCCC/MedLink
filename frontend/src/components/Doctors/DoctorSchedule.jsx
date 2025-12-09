import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../utils/apiClient';
import './DoctorSchedule.css';
import './DoctorsList.css';

function DoctorSchedule() {
  const { id } = useParams();
  const navigate = useNavigate();
  // const location = useLocation();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    async function loadSchedule() {
      try {
        setLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        const data = await apiClient(`/api/doctors/${id}/availability?date=${dateStr}`);
        setDoctor(data.doctor);
        setSlots(data.slots);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSchedule();
  }, [id, selectedDate]);

  function handlePreviousDay() {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  }

  function handleNextDay() {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  }

  function handleToday() {
    setSelectedDate(new Date());
  }

  function formatDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck.getTime() === today.getTime()) {
      return 'Today';
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateToCheck.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function handleSlotClick(slot) {
    if (!slot.available) return;
    if (user && user.role === 'patient') {
      // Logged in as patient - go to booking form
      navigate(
        `/patient/appointments/new?doctorId=${id}&startDateTime=${encodeURIComponent(slot.start)}&endDateTime=${encodeURIComponent(slot.end)}`
      );
    } else {
      // Not logged in - go to login page
      navigate('/login', {
        state: {
          redirectTo: `/patient/appointments/new?doctorId=${id}&startDateTime=${encodeURIComponent(slot.start)}&endDateTime=${encodeURIComponent(slot.end)}`,
        },
      });
    }
  }

  // const isToday = () => {
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);
  //   const checkDate = new Date(selectedDate);
  //   checkDate.setHours(0, 0, 0, 0);
  //   return today.getTime() === checkDate.getTime();
  // };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateStart = new Date(selectedDate);
  selectedDateStart.setHours(0, 0, 0, 0);
  const canGoPrevious = selectedDateStart.getTime() > today.getTime();

  // Arrow key navigation for keyboard accessibility
  useEffect(() => {
    const handleArrowKeyNavigation = (e) => {
      // Don't interfere if user is typing in an input
      if (e.target.tagName === 'INPUT' && e.target.type === 'text' && !e.target.readOnly) {
        return;
      }
      
      // Arrow key navigation for time slot buttons (spatial navigation based on time)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const currentButton = document.activeElement;
        if (!currentButton?.classList.contains('time-slot-button')) {
          return;
        }
        
        // Only handle if focus is within the content area (not sidebar)
        const contentArea = document.querySelector('.doctor-content');
        if (!contentArea || !contentArea.contains(currentButton)) {
          return; // Don't handle if focus is in sidebar
        }
        
        const timeSlotButtons = Array.from(
          contentArea.querySelectorAll('.time-slot-button:not(:disabled)')
        ).filter(btn => {
          return btn.offsetParent !== null && 
                 !btn.disabled &&
                 !btn.closest('.doctor-menu-bar') && // Exclude sidebar elements
                 !btn.closest('.sidebar-nav'); // Exclude sidebar navigation
        });
        
        if (timeSlotButtons.length === 0) return;
        
        e.preventDefault();
        
        // Parse time from button text (e.g., "10:00 AM EST" or "10:00")
        const parseTime = (timeStr) => {
          const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (!match) return null;
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3]?.toUpperCase();
          
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          return { hours, minutes, totalMinutes: hours * 60 + minutes };
        };
        
        const currentTimeText = currentButton.textContent.trim();
        const currentTime = parseTime(currentTimeText);
        
        if (!currentTime) {
          // Fallback to simple index navigation
          const currentIndex = timeSlotButtons.findIndex(btn => btn === currentButton);
          if (e.key === 'ArrowRight') {
            const nextIndex = currentIndex < timeSlotButtons.length - 1 ? currentIndex + 1 : 0;
            timeSlotButtons[nextIndex]?.focus();
          } else if (e.key === 'ArrowLeft') {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : timeSlotButtons.length - 1;
            timeSlotButtons[prevIndex]?.focus();
          }
          return;
        }
        
        // Calculate target time based on direction
        let targetMinutes = currentTime.totalMinutes;
        if (e.key === 'ArrowRight') {
          targetMinutes += 30; // Next 30 minutes
        } else if (e.key === 'ArrowLeft') {
          targetMinutes -= 30; // Previous 30 minutes
        } else if (e.key === 'ArrowDown') {
          // Same minute in next hour (e.g., 10:00 -> 12:00, 10:30 -> 12:30)
          targetMinutes += 120; // Add 2 hours
        } else if (e.key === 'ArrowUp') {
          // Same minute in previous hour (e.g., 12:00 -> 10:00, 12:30 -> 10:30)
          targetMinutes -= 120; // Subtract 2 hours
        }
        
        // Find button with matching time
        const targetButton = timeSlotButtons.find(btn => {
          const btnTimeText = btn.textContent.trim();
          const btnTime = parseTime(btnTimeText);
          return btnTime && btnTime.totalMinutes === targetMinutes;
        });
        
        if (targetButton && targetButton !== currentButton) {
          targetButton.focus();
        } else {
          // If exact match not found, find closest time
          const sortedButtons = timeSlotButtons
            .map(btn => {
              const btnTimeText = btn.textContent.trim();
              const btnTime = parseTime(btnTimeText);
              return { btn, time: btnTime };
            })
            .filter(item => item.time !== null)
            .sort((a, b) => a.time.totalMinutes - b.time.totalMinutes);
          
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            const nextButton = sortedButtons.find(item => item.time.totalMinutes > currentTime.totalMinutes);
            if (nextButton) nextButton.btn.focus();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            const prevButton = sortedButtons.reverse().find(item => item.time.totalMinutes < currentTime.totalMinutes);
            if (prevButton) prevButton.btn.focus();
          }
        }
        return;
      }
      
      // Up/Down arrow for all focusable elements
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const pageContainer = document.querySelector('.doctors-list-page');
        if (!pageContainer) return;
        
        const allFocusableElements = Array.from(
          pageContainer.querySelectorAll(focusableSelectors)
        ).filter(el => {
          return el.offsetParent !== null && 
                 !el.disabled && 
                 !el.hasAttribute('aria-hidden') &&
                 window.getComputedStyle(el).visibility !== 'hidden';
        });
        
        if (allFocusableElements.length === 0) return;
        
        const currentIndex = allFocusableElements.findIndex(
          el => el === document.activeElement
        );
        
        if (currentIndex === -1) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            allFocusableElements[0]?.focus();
          }
          return;
        }
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = currentIndex < allFocusableElements.length - 1 
            ? currentIndex + 1 
            : 0;
          allFocusableElements[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp') {
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
  }, []);

  const availableSlots = slots.filter((slot) => slot.available);

  return (
    <div className="doctors-list-page">
      {/* Top Header with Brand and Close */}
      <header className="doctors-page-header" role="banner">
        <h1 className="page-brand">MedLink</h1>
        <button 
          onClick={() => navigate('/')} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/');
            }
          }}
          className="close-button"
        >
          ×
        </button>
      </header>

      <main className="doctors-page-container" role="main">
        <h2 className="page-title">Book an Appointment</h2>

        {/* Date Navigation */}
        <div className="date-navigation-bar">
          <button
            onClick={handlePreviousDay}
            onKeyDown={(e) => {
              if (canGoPrevious && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handlePreviousDay();
              }
            }}
            className="date-nav-button"
            disabled={!canGoPrevious}
            aria-label="Previous day"
          >
            ←
          </button>
          <div className="date-display-bar">
            {formatDate(selectedDate)}
          </div>
          <button
            onClick={handleNextDay}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNextDay();
              }
            }}
            className="date-nav-button"
            aria-label="Next day"
          >
            →
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading">Loading schedule...</div>
        ) : availableSlots.length === 0 ? (
          <div className="empty-state">
            <p>No slots available for this day.</p>
          </div>
        ) : (
          <div className="doctors-schedule-list">
            <div className="doctor-schedule-card">
              <div className="doctor-profile">
                <div className="doctor-avatar-large">
                  <DoctorAvatar />
                </div>
                <div className="doctor-details">
                  <h3 className="doctor-name-card">
                    {doctor ? doctor.name : 'Loading...'}
                  </h3>
                  <p className="doctor-specialty-card">
                    {doctor ? doctor.specialty || 'General Practice' : ''}
                  </p>
                </div>
              </div>
              <div className="doctor-time-slots">
                <div className="slots-list">
                  {availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      className="time-slot-button"
                      onClick={() => handleSlotClick(slot)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSlotClick(slot);
                        }
                      }}
                    >
                      <span className="time-text">{slot.time}</span>
                      <span className="est-text"> EST</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </div>
          )}
      </main>
    </div>
  );
}

function DoctorAvatar() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="50" style={{ fill: 'var(--color-primary-light)' }} />
      <circle cx="50" cy="35" r="15" style={{ fill: 'var(--color-success)' }} />
      <path
        d="M20 85 C20 65, 35 55, 50 55 C65 55, 80 65, 80 85"
        style={{ fill: 'var(--color-success)' }}
      />
    </svg>
  );
}

DoctorSchedule.propTypes = {
  // DoctorSchedule component doesn't receive props, but we document it for consistency
};

export default DoctorSchedule;


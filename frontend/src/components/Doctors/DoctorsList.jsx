import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../utils/apiClient';
import './DoctorsList.css';

const serviceMap = {
  primary: 'General Practice',
  urgent: 'General Practice',
  covid: 'General Practice',
  'cold-flu': 'General Practice',
  workplace: 'General Practice',
  injury: 'Orthopedics',
};

function DoctorsList() {
  const [doctors, setDoctors] = useState([]);
  const [doctorsWithSchedules, setDoctorsWithSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const service = searchParams.get('service');
  const navigate = useNavigate();
  const { user } = useAuth();
  // Helper to get current date string in clinic timezone
  const getClinicDateString = () => {
    const now = new Date();
    return now.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Helper to convert EST date string (YYYY-MM-DD) to a Date object
  const estDateStringToDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 18, 0, 0));
  };

  // Initialize selectedDate with clinic timezone date
  const getClinicDate = () => {
    const estDateStr = getClinicDateString();
    return estDateStringToDate(estDateStr);
  };

  const [selectedDate, setSelectedDate] = useState(getClinicDate());

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, searchParams]);

  useEffect(() => {
    if (doctors.length > 0) {
      loadDoctorsSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors, selectedDate]);

  async function loadDoctors() {
    try {
      setLoading(true);
      const specialtyParam = searchParams.get('specialty');
      const nameParam = searchParams.get('name');
      const specialty = specialtyParam || (service ? serviceMap[service] : null);
      
      // Build query params
      const params = new URLSearchParams();
      if (specialty) {
        params.append('specialty', specialty);
      }
      if (nameParam) {
        params.append('name', nameParam);
      }
      
      const queryString = params.toString();
      const data = await apiClient(`/api/doctors${queryString ? `?${queryString}` : ''}`);
      setDoctors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDoctorsSchedules() {
    try {
      // Get date string in clinic timezone (America/New_York) to avoid date offset
      const dateStr = selectedDate.toLocaleDateString('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }); // Returns YYYY-MM-DD format
      
      const schedules = await Promise.all(
        doctors.map(async (doctor) => {
          try {
            const data = await apiClient(
              `/api/doctors/${doctor.id}/availability?date=${dateStr}`
            );
            
            // Filter available slots
            const availableSlots = data.slots.filter((slot) => slot.available);
            
            return {
              ...doctor,
              availableSlots: availableSlots,
            };
          } catch (err) {
            return { ...doctor, availableSlots: [] };
          }
        })
      );
      
      // Check if we have any available slots at all
      const totalAvailableSlots = schedules.reduce(
        (sum, doctor) => sum + (doctor.availableSlots?.length || 0),
        0
      );
      
      // After loading all schedules, check if any slots are for a different date
      // Find the earliest slot date across all doctors
      let earliestSlotDateStr = null;
      for (const doctor of schedules) {
        if (doctor.availableSlots && doctor.availableSlots.length > 0) {
          const firstSlot = doctor.availableSlots[0];
          const slotStart = new Date(firstSlot.start);
          const slotDateStr = slotStart.toLocaleDateString('en-CA', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          
          if (!earliestSlotDateStr || slotDateStr < earliestSlotDateStr) {
            earliestSlotDateStr = slotDateStr;
          }
        }
      }
      
      // If no slots available for the requested date, automatically move to next day
      if (totalAvailableSlots === 0 && !earliestSlotDateStr) {
        // Check if the requested date is today
        const todayStr = getClinicDateString();
        if (dateStr === todayStr) {
          // Move to tomorrow
          const [year, month, day] = dateStr.split('-').map(Number);
          const nextDate = new Date(Date.UTC(year, month - 1, day + 1, 18, 0, 0));
          const nextDateStr = nextDate.toLocaleDateString('en-CA', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          const newSelectedDate = estDateStringToDate(nextDateStr);
          setSelectedDate(newSelectedDate);
          // Don't set schedules yet - let the useEffect trigger a reload with the new date
          return;
        }
      }
      
      // If we found slots for a different date than requested, update selectedDate
      if (earliestSlotDateStr && earliestSlotDateStr !== dateStr) {
        const newSelectedDate = estDateStringToDate(earliestSlotDateStr);
        setSelectedDate(newSelectedDate);
        // Don't set schedules yet - let the useEffect trigger a reload with the new date
        return;
      }
      
      setDoctorsWithSchedules(schedules);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    }
  }

  function handlePreviousDay() {
    // Get current date in clinic timezone, subtract one day
    const currentDateStr = selectedDate.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [year, month, day] = currentDateStr.split('-').map(Number);
    // Create a date for the previous day using UTC to avoid timezone issues
    const prevDate = new Date(Date.UTC(year, month - 1, day - 1, 18, 0, 0));
    // Verify it's the correct date in EST
    const prevDateStr = prevDate.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    setSelectedDate(estDateStringToDate(prevDateStr));
  }

  function handleNextDay() {
    // Get current date in clinic timezone, add one day
    const currentDateStr = selectedDate.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [year, month, day] = currentDateStr.split('-').map(Number);
    // Create a date for the next day using UTC to avoid timezone issues
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1, 18, 0, 0));
    // Verify it's the correct date in EST
    const nextDateStr = nextDate.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    setSelectedDate(estDateStringToDate(nextDateStr));
  }

  function formatDate(date) {
    // Use clinic timezone for consistent date display
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatTime(timeString) {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function handleSlotClick(doctorId, slot) {
    if (user && user.role === 'patient') {
      navigate(
        `/patient/appointments/new?doctorId=${doctorId}&startDateTime=${encodeURIComponent(slot.start)}&endDateTime=${encodeURIComponent(slot.end)}`
      );
    } else {
      navigate('/login', {
        state: {
          redirectTo: `/patient/appointments/new?doctorId=${doctorId}&startDateTime=${encodeURIComponent(slot.start)}&endDateTime=${encodeURIComponent(slot.end)}`,
        },
      });
    }
  }

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
      
      const currentButton = document.activeElement;
      
      // If focus is on a time slot button, let the button handle it
      if (currentButton && currentButton.classList.contains('time-slot-button')) {
        return; // Let button's onKeyDown handle it
      }
      
      // Up/Down arrow for all focusable elements (including time slot buttons)
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
        
        // If currently on a time slot button, let the button handle it
        if (currentButton && currentButton.classList.contains('time-slot-button')) {
          return; // Let button's onKeyDown handle it
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

  return (
    <div className="doctors-list-page">
      {/* Top Header with Brand and Close */}
      <header className="doctors-page-header" role="banner">
        <h1 className="page-brand">MedLink</h1>
        <button 
          onClick={() => navigate('/')} 
          tabIndex={0}
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
            tabIndex={canGoPrevious ? 0 : -1}
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
            tabIndex={0}
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
          <div className="loading">Loading doctors...</div>
        ) : doctorsWithSchedules.length === 0 ? (
          <div className="empty-state">
            <p>
              {searchParams.get('name')
                ? `No doctors found matching "${searchParams.get('name')}".`
                : searchParams.get('specialty')
                  ? `No doctors found for specialty "${searchParams.get('specialty')}".`
                  : 'No doctors found for this service.'}
            </p>
          </div>
        ) : (() => {
          // Filter doctors with available slots
          const doctorsWithSlots = doctorsWithSchedules.filter(
            (doctor) => doctor.availableSlots && doctor.availableSlots.length > 0
          );
          
          if (doctorsWithSlots.length === 0) {
            return (
              <div className="empty-state">
                <p>No slots available for this day.</p>
              </div>
            );
          }
          
          return (
            <div className="doctors-schedule-list">
              {doctorsWithSlots.map((doctor) => (
                <DoctorScheduleCard
                  key={doctor.id}
                  doctor={doctor}
                  onSlotClick={(slot) => handleSlotClick(doctor.id, slot)}
                />
              ))}
            </div>
          );
        })()}
      </main>
    </div>
  );
}

function DoctorScheduleCard({ doctor, onSlotClick }) {
  return (
    <div className="doctor-schedule-card">
      <div className="doctor-profile">
        <div className="doctor-avatar-large">
          <DoctorAvatar />
        </div>
        <div className="doctor-details">
          <h3 className="doctor-name-card">{doctor.name}</h3>
          <p className="doctor-specialty-card">{doctor.specialty || 'General Practice'}</p>
        </div>
      </div>
      <div className="doctor-time-slots">
        <div className="slots-list">
          {doctor.availableSlots.map((slot, index) => (
            <button
              key={index}
              className="time-slot-button"
              onClick={() => onSlotClick(slot)}
              tabIndex={0}
              onKeyDown={(e) => {
                // Handle arrow keys directly on the button
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const pageContainer = document.querySelector('.doctors-list-page');
                  if (!pageContainer) return;
                  
                  // Get all doctor cards
                  const doctorCards = Array.from(pageContainer.querySelectorAll('.doctor-schedule-card'));
                  
                  // Find which doctor card this button belongs to
                  const currentCard = e.target.closest('.doctor-schedule-card');
                  if (!currentCard) return;
                  
                  const currentCardIndex = doctorCards.indexOf(currentCard);
                  
                  // Get all time slot buttons in current doctor's card
                  const currentCardButtons = Array.from(
                    currentCard.querySelectorAll('.time-slot-button')
                  ).filter(btn => {
                    return btn.offsetParent !== null && 
                           !btn.disabled &&
                           btn.getAttribute('tabindex') !== '-1';
                  });
                  
                  // Get all time slot buttons across all cards
                  const allTimeSlotButtons = Array.from(
                    pageContainer.querySelectorAll('.time-slot-button')
                  ).filter(btn => {
                    return btn.offsetParent !== null && 
                           !btn.disabled &&
                           btn.getAttribute('tabindex') !== '-1';
                  });
                  
                  if (allTimeSlotButtons.length === 0) return;
                  
                  const currentIndex = currentCardButtons.findIndex(btn => btn === e.target);
                  if (currentIndex === -1) return;
                  
                  // Calculate grid layout (4 columns per row based on CSS)
                  const columnsPerRow = 4;
                  const currentRow = Math.floor(currentIndex / columnsPerRow);
                  const totalRows = Math.ceil(currentCardButtons.length / columnsPerRow);
                  const isFirstRow = currentRow === 0;
                  const isLastRow = currentRow === totalRows - 1;
                  const isFirstDoctor = currentCardIndex === 0;
                  const isLastDoctor = currentCardIndex === doctorCards.length - 1;
                  
                  // Parse time helper
                  const parseTime = (timeStr) => {
                    const cleanStr = timeStr.replace(/EST/gi, '').trim();
                    const match = cleanStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                    if (!match) return null;
                    let hours = parseInt(match[1], 10);
                    const minutes = parseInt(match[2], 10);
                    const period = match[3]?.toUpperCase();
                    
                    if (period === 'PM' && hours !== 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                    
                    return { hours, minutes, totalMinutes: hours * 60 + minutes };
                  };
                  
                  const currentTimeText = e.target.textContent.trim();
                  const currentTime = parseTime(currentTimeText);
                  
                  // Handle Up arrow
                  if (e.key === 'ArrowUp') {
                    if (isFirstRow) {
                      // First row: navigate to previous doctor's last row or date navigation
                      if (isFirstDoctor) {
                        // First doctor's first row: go to date navigation
                        const dateNavButtons = pageContainer.querySelectorAll('.date-nav-button');
                        const prevDateButton = Array.from(dateNavButtons).find(btn => 
                          btn.getAttribute('aria-label') === 'Previous day' && !btn.disabled
                        );
                        if (prevDateButton) {
                          prevDateButton.focus();
                        } else {
                          // If previous day button is disabled, focus on next day button
                          const nextDateButton = Array.from(dateNavButtons).find(btn => 
                            btn.getAttribute('aria-label') === 'Next day'
                          );
                          nextDateButton?.focus();
                        }
                      } else {
                        // Navigate to previous doctor's last row
                        const prevCard = doctorCards[currentCardIndex - 1];
                        const prevCardButtons = Array.from(
                          prevCard.querySelectorAll('.time-slot-button')
                        ).filter(btn => {
                          return btn.offsetParent !== null && 
                                 !btn.disabled &&
                                 btn.getAttribute('tabindex') !== '-1';
                        });
                        if (prevCardButtons.length > 0) {
                          const prevCardLastRowStart = Math.floor((prevCardButtons.length - 1) / columnsPerRow) * columnsPerRow;
                          const targetCol = currentIndex % columnsPerRow;
                          const targetIndex = Math.min(prevCardLastRowStart + targetCol, prevCardButtons.length - 1);
                          prevCardButtons[targetIndex]?.focus();
                        }
                      }
                    } else {
                      // Not first row: navigate within same doctor (same column, previous row)
                      const targetIndex = (currentRow - 1) * columnsPerRow + (currentIndex % columnsPerRow);
                      if (targetIndex >= 0 && targetIndex < currentCardButtons.length) {
                        currentCardButtons[targetIndex].focus();
                      }
                    }
                    return;
                  }
                  
                  // Handle Down arrow
                  if (e.key === 'ArrowDown') {
                    const nextRowIndex = (currentRow + 1) * columnsPerRow + (currentIndex % columnsPerRow);
                    if (nextRowIndex < currentCardButtons.length) {
                      // Next row exists in same doctor
                      currentCardButtons[nextRowIndex].focus();
                    } else if (isLastRow && !isLastDoctor) {
                      // Last row: navigate to next doctor's first row
                      const nextCard = doctorCards[currentCardIndex + 1];
                      const nextCardButtons = Array.from(
                        nextCard.querySelectorAll('.time-slot-button')
                      ).filter(btn => {
                        return btn.offsetParent !== null && 
                               !btn.disabled &&
                               btn.getAttribute('tabindex') !== '-1';
                      });
                      if (nextCardButtons.length > 0) {
                        const targetCol = currentIndex % columnsPerRow;
                        const targetIndex = Math.min(targetCol, nextCardButtons.length - 1);
                        nextCardButtons[targetIndex]?.focus();
                      }
                    }
                    return;
                  }
                  
                  // Handle Left/Right arrows
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    if (!currentTime) {
                      // Fallback to simple index navigation
                      if (e.key === 'ArrowRight') {
                        const nextIndex = currentIndex < currentCardButtons.length - 1 ? currentIndex + 1 : 0;
                        currentCardButtons[nextIndex]?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentCardButtons.length - 1;
                        currentCardButtons[prevIndex]?.focus();
                      }
                      return;
                    }
                    
                    // Calculate target time
                    let targetMinutes = currentTime.totalMinutes;
                    if (e.key === 'ArrowRight') {
                      targetMinutes += 30;
                    } else if (e.key === 'ArrowLeft') {
                      targetMinutes -= 30;
                    }
                    
                    // First try to find in same doctor's card
                    let targetButton = currentCardButtons.find(btn => {
                      const btnTimeText = btn.textContent.trim();
                      const btnTime = parseTime(btnTimeText);
                      return btnTime && btnTime.totalMinutes === targetMinutes;
                    });
                    
                    // If not found in same card, try all cards
                    if (!targetButton) {
                      targetButton = allTimeSlotButtons.find(btn => {
                        const btnTimeText = btn.textContent.trim();
                        const btnTime = parseTime(btnTimeText);
                        return btnTime && btnTime.totalMinutes === targetMinutes;
                      });
                    }
                    
                    if (targetButton && targetButton !== e.target) {
                      targetButton.focus();
                    } else {
                      // If no matching time found, navigate to date navigation buttons
                      const dateNavButtons = pageContainer.querySelectorAll('.date-nav-button');
                      if (e.key === 'ArrowRight') {
                        const nextDateButton = Array.from(dateNavButtons).find(btn => 
                          btn.getAttribute('aria-label') === 'Next day'
                        );
                        nextDateButton?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        const prevDateButton = Array.from(dateNavButtons).find(btn => 
                          btn.getAttribute('aria-label') === 'Previous day' && !btn.disabled
                        );
                        if (prevDateButton) {
                          prevDateButton.focus();
                        } else {
                          // If previous day button is disabled, focus on next day button
                          const nextDateButton = Array.from(dateNavButtons).find(btn => 
                            btn.getAttribute('aria-label') === 'Next day'
                          );
                          nextDateButton?.focus();
                        }
                      }
                    }
                    return;
                  }
                }
                
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSlotClick(slot);
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

DoctorScheduleCard.propTypes = {
  doctor: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    specialty: PropTypes.string,
    availableSlots: PropTypes.arrayOf(
      PropTypes.shape({
        start: PropTypes.string.isRequired,
        end: PropTypes.string.isRequired,
        time: PropTypes.string.isRequired,
        available: PropTypes.bool.isRequired,
      })
    ),
  }).isRequired,
  onSlotClick: PropTypes.func.isRequired,
};

export default DoctorsList;


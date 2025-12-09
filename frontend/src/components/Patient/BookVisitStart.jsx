import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { apiClient } from '../../utils/apiClient';
import './BookVisitStart.css';

const services = [
  { id: 'primary', name: 'Primary Care', icon: '🏥' },
  { id: 'urgent', name: 'Urgent Care', icon: '🚨' },
  { id: 'covid', name: 'COVID Care', icon: '🦠' },
  { id: 'cold-flu', name: 'Cold, Flu & COVID Testing', icon: '🤒' },
  { id: 'workplace', name: 'Workplace Health', icon: '💼' },
  { id: 'injury', name: 'Injury', icon: '🩹' },
];

const serviceMap = {
  primary: 'General Practice',
  urgent: 'General Practice',
  covid: 'General Practice',
  'cold-flu': 'General Practice',
  workplace: 'General Practice',
  injury: 'Orthopedics',
};

function ServiceIcon({ iconType }) {
  const icons = {
    primary: '🏥',
    urgent: '🚨',
    covid: '🦠',
    'cold-flu': '🤒',
    workplace: '💼',
    injury: '🩹',
  };

  return (
    <span className="reason-icon-wrapper">
      <span className="reason-icon">{icons[iconType] || '🏥'}</span>
    </span>
  );
}

ServiceIcon.propTypes = {
  iconType: PropTypes.string.isRequired,
};

function BookVisitStart() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [showDoctorsModal, setShowDoctorsModal] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    loadSpecialties();
  }, []);

  // Arrow key navigation for keyboard accessibility
  useEffect(() => {
    const handleArrowKeyNavigation = (e) => {
      // Only handle if modals are not open
      if (showModal || showDoctorsModal) return;
      
      // Don't interfere if user is typing in an input
      if (e.target.tagName === 'INPUT' && e.target.type === 'text' && !e.target.readOnly) {
        return;
      }
      
      // Only handle if focus is within the content area (not sidebar)
      const contentArea = document.querySelector('.patient-content');
      if (!contentArea || !contentArea.contains(e.target)) {
        return; // Don't handle if focus is in sidebar
      }
      
      // Get all focusable elements on the page (only within content area)
      const focusableSelectors = 'input, button, [href], [tabindex]:not([tabindex="-1"])';
      const pageContainer = document.querySelector('.book-visit-start');
      if (!pageContainer) return;
      
      const allFocusableElements = Array.from(
        pageContainer.querySelectorAll(focusableSelectors)
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
    };
    
    document.addEventListener('keydown', handleArrowKeyNavigation);
    return () => {
      document.removeEventListener('keydown', handleArrowKeyNavigation);
    };
  }, [showModal, showDoctorsModal]);

  async function loadSpecialties() {
    try {
      const data = await apiClient('/api/doctors/specialties');
      setSpecialties(data);
    } catch (err) {
      console.error('Failed to load specialties:', err);
    }
  }

  const handleServiceClick = (serviceId) => {
    setSelectedService(serviceId);
    setSelectedSpecialty(null);
    setShowDoctorsModal(true);
    setShowModal(false);
  };

  const handleModalSearch = (e) => {
    e.preventDefault();
    if (modalSearchQuery.trim()) {
      setSelectedSpecialty(modalSearchQuery.trim());
      setSelectedService(null);
      setShowDoctorsModal(true);
      setShowModal(false);
    }
  };

  const handleSpecialtyClick = (specialty) => {
    setSelectedSpecialty(specialty);
    setSelectedService(null);
    setShowDoctorsModal(true);
    setShowModal(false);
  };

  const handleSearchInputClick = () => {
    setShowModal(true);
  };

  const handleCloseDoctorsModal = () => {
    setShowDoctorsModal(false);
    setSelectedSpecialty(null);
    setSelectedService(null);
  };

  const filteredSpecialties = specialties.filter((spec) =>
    spec.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  return (
    <div className="book-visit-start">
      <div className="book-visit-header">
        <h2>Book an Appointment</h2>
        <p>What brings you in today?</p>
      </div>

      <div className="book-visit-content">
        <div className="search-section">
          <div className="search-input-wrapper" onClick={handleSearchInputClick}>
            <input
              type="text"
              id="book-visit-search-input"
              name="book-visit-search"
              placeholder="Search for doctors or specialties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              readOnly
            />
            <button type="button" className="search-icon-button" aria-label="Search">
              🔍
            </button>
          </div>
        </div>

        <div className="common-reasons">
          <div className="reasons-list">
            {services.map((service) => (
              <button
                key={service.id}
                className="reason-item"
                onClick={() => handleServiceClick(service.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleServiceClick(service.id);
                  }
                }}
              >
                <ServiceIcon iconType={service.id} />
                <span className="reason-name">{service.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showModal && (
        <SearchModal
          onClose={() => setShowModal(false)}
          searchQuery={modalSearchQuery}
          onSearchChange={setModalSearchQuery}
          onSearchSubmit={handleModalSearch}
          specialties={filteredSpecialties}
          onSpecialtyClick={handleSpecialtyClick}
        />
      )}

      {/* Doctors Selection Modal */}
      {showDoctorsModal && (
        <DoctorsSelectionModal
          specialty={selectedSpecialty}
          service={selectedService}
          serviceMap={serviceMap}
          onClose={handleCloseDoctorsModal}
          onSlotSelected={(doctorId, slot) => {
            navigate(
              `/patient/appointments/new?doctorId=${doctorId}&startDateTime=${encodeURIComponent(slot.start)}&endDateTime=${encodeURIComponent(slot.end)}`
            );
          }}
        />
      )}
    </div>
  );
}

function SearchModal({
  onClose,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  specialties,
  onSpecialtyClick,
}) {
  const modalRef = React.useRef(null);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Focus the modal when it opens
    if (modalRef.current) {
      modalRef.current.focus();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

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
      className="search-modal-overlay"
      onClick={onClose}
      role="presentation"
      aria-hidden="false"
    >
      <div
        className="search-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close search modal"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
        >
          ×
        </button>
        <h2 id="modal-title" className="modal-title">
          What brings you in?
        </h2>
        
        <form onSubmit={onSearchSubmit} className="modal-search-form">
          <div className="modal-search-wrapper">
            <input
              type="text"
              id="book-visit-modal-search-input"
              name="book-visit-modal-search"
              placeholder="Search for doctors or specialties..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="modal-search-input"
              autoFocus
            />
            <button type="submit" className="modal-search-button" aria-label="Search" tabIndex={0}>
              🔍
            </button>
          </div>
        </form>

        <div className="specialties-dropdown">
          <p className="specialties-label">All Specialties We Provide:</p>
          <div className="specialties-list">
            {specialties.length === 0 ? (
              <div className="no-specialties">No specialties found</div>
            ) : (
              specialties.map((specialty) => (
                <button
                  key={specialty}
                  className="specialty-item"
                  onClick={() => onSpecialtyClick(specialty)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSpecialtyClick(specialty);
                    }
                  }}
                >
                  {specialty}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

SearchModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchSubmit: PropTypes.func.isRequired,
  specialties: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSpecialtyClick: PropTypes.func.isRequired,
};

function DoctorsSelectionModal({ specialty, service, serviceMap, onClose, onSlotSelected }) {
  const [doctors, setDoctors] = useState([]);
  const [doctorsWithSchedules, setDoctorsWithSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Initialize selectedDate with clinic timezone date to avoid date offset issues
  const getClinicDate = () => {
    const now = new Date();
    const estDateStr = now.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [month, day, year] = estDateStr.split('/');
    return new Date(year, month - 1, day);
  };
  
  const [selectedDate, setSelectedDate] = useState(getClinicDate());

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, service]);

  useEffect(() => {
    if (doctors.length > 0) {
      loadDoctorsSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors, selectedDate]);

  const modalRef = React.useRef(null);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Focus the modal when it opens
    if (modalRef.current) {
      modalRef.current.focus();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

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
    
    // Arrow key navigation for time slot buttons (spatial navigation based on time)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const currentButton = document.activeElement;
      if (!currentButton?.classList.contains('time-slot-button')) {
        return;
      }
      
      const timeSlotButtons = Array.from(
        modalRef.current?.querySelectorAll('.time-slot-button:not(:disabled)')
      ).filter(btn => {
        return btn.offsetParent !== null && !btn.disabled;
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
    
    // Up/Down arrow navigation for all focusable elements
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const focusableElements = Array.from(
        modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => {
        return el.offsetParent !== null && 
               !el.disabled && 
               !el.hasAttribute('aria-hidden') &&
               window.getComputedStyle(el).visibility !== 'hidden';
      });
      
      if (focusableElements.length === 0) return;
      
      const currentIndex = focusableElements.findIndex(
        el => el === document.activeElement
      );
      
      if (currentIndex === -1) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          focusableElements[0]?.focus();
        }
        return;
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < focusableElements.length - 1 
          ? currentIndex + 1 
          : 0;
        focusableElements[nextIndex]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 
          ? currentIndex - 1 
          : focusableElements.length - 1;
        focusableElements[prevIndex]?.focus();
      }
    }
  };

  async function loadDoctors() {
    try {
      setLoading(true);
      const finalSpecialty = specialty || (service ? serviceMap[service] : null);
      const params = finalSpecialty ? `?specialty=${encodeURIComponent(finalSpecialty)}` : '';
      const data = await apiClient(`/api/doctors${params}`);
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
      // Use toLocaleDateString with timeZone to get the correct date
      const dateStr = selectedDate.toLocaleDateString('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }); // Returns YYYY-MM-DD format
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      const schedules = await Promise.all(
        doctors.map(async (doctor) => {
          try {
            const data = await apiClient(
              `/api/doctors/${doctor.id}/availability?date=${dateStr}`
            );
            // Filter out past time slots on client side as additional safety measure
            const filteredSlots = data.slots.filter((slot) => {
              if (!slot.available) return false;
              // Filter out slots that are in the past or less than 1 hour from now
              const slotStart = new Date(slot.start);
              return slotStart.getTime() > oneHourFromNow.getTime();
            });
            
            return {
              ...doctor,
              availableSlots: filteredSlots,
            };
          } catch (err) {
            return { ...doctor, availableSlots: [] };
          }
        })
      );
      setDoctorsWithSchedules(schedules);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    }
  }

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

  function formatDate(date) {
    // Use clinic timezone (America/New_York) for consistent date display
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateStart = new Date(selectedDate);
  selectedDateStart.setHours(0, 0, 0, 0);
  const canGoPrevious = selectedDateStart.getTime() > today.getTime();

  const doctorsWithSlots = doctorsWithSchedules.filter(
    (doctor) => doctor.availableSlots && doctor.availableSlots.length > 0
  );

  return createPortal(
    <div
      className="doctors-modal-overlay"
      onClick={onClose}
      role="presentation"
      aria-hidden="false"
    >
      <div
        className="doctors-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctors-modal-title"
        tabIndex={-1}
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <button
          className="doctors-modal-close"
          onClick={onClose}
          aria-label="Close doctor selection modal"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
        >
          ×
        </button>
        <h2 id="doctors-modal-title" className="doctors-modal-title">
          Book an Appointment
        </h2>

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
          <div className="loading">Loading doctors...</div>
        ) : doctorsWithSlots.length === 0 ? (
          <div className="empty-state">
            <p>No slots available for this day.</p>
          </div>
        ) : (
          <div className="doctors-schedule-list">
            {doctorsWithSlots.map((doctor) => (
              <DoctorScheduleCard
                key={doctor.id}
                doctor={doctor}
                onSlotClick={(slot) => onSlotSelected(doctor.id, slot)}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

DoctorsSelectionModal.propTypes = {
  specialty: PropTypes.string,
  service: PropTypes.string,
  serviceMap: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSlotSelected: PropTypes.func.isRequired,
};

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
              onKeyDown={(e) => {
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

export default BookVisitStart;


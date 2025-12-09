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

  return (
    <div className="doctors-list-page">
      {/* Top Header with Brand and Close */}
      <header className="doctors-page-header" role="banner">
        <h1 className="page-brand">MedLink</h1>
        <button onClick={() => navigate('/')} className="close-button">
          ×
        </button>
      </header>

      <main className="doctors-page-container" role="main">
        <h2 className="page-title">Book an Appointment</h2>

        {/* Date Navigation */}
        <div className="date-navigation-bar">
          <button
            onClick={handlePreviousDay}
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


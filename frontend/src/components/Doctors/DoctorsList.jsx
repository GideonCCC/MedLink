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
  const [selectedDate, setSelectedDate] = useState(new Date());

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
      const dateStr = selectedDate.toISOString().split('T')[0];
      const schedules = await Promise.all(
        doctors.map(async (doctor) => {
          try {
            const data = await apiClient(
              `/api/doctors/${doctor.id}/availability?date=${dateStr}`
            );
            return {
              ...doctor,
              availableSlots: data.slots.filter((slot) => slot.available),
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
    return date.toLocaleDateString('en-US', {
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


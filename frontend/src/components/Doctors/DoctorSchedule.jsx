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

  const availableSlots = slots.filter((slot) => slot.available);

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


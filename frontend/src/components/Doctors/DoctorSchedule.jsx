import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../utils/apiClient';
import './DoctorSchedule.css';

function DoctorSchedule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadSchedule();
  }, [id, selectedDate]);

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

  const isToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(selectedDate);
    checkDate.setHours(0, 0, 0, 0);
    return today.getTime() === checkDate.getTime();
  };

  return (
    <div className="doctor-schedule-page">
      <div className="container">
        <div className="page-header">
          <button onClick={() => navigate('/doctors')} className="back-button">
            ← Back to Doctors
          </button>
          {doctor && (
            <>
              <h1>{doctor.name}</h1>
              <p className="doctor-specialty">{doctor.specialty}</p>
            </>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="schedule-container">
          <div className="date-navigation">
            <button
              onClick={handlePreviousDay}
              className="nav-button"
              aria-label="Previous day"
            >
              ←
            </button>
            <div className="date-display">
              <button onClick={handleToday} className="date-text">
                {formatDate(selectedDate)}
              </button>
              <span className="date-full">
                {selectedDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <button
              onClick={handleNextDay}
              className="nav-button"
              aria-label="Next day"
            >
              →
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading schedule...</div>
          ) : (
            <>
              <div className="slots-grid">
                {slots.length === 0 ? (
                  <div className="empty-slots">
                    <p>No available time slots for this day.</p>
                  </div>
                ) : (
                  slots.map((slot, index) => (
                    <TimeSlot
                      key={index}
                      slot={slot}
                      onClick={() => handleSlotClick(slot)}
                    />
                  ))
                )}
              </div>
              <div className="schedule-note">
                <p>Click on an available time slot to book an appointment</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeSlot({ slot, onClick }) {
  return (
    <button
      className={`time-slot ${slot.available ? 'available' : 'booked'}`}
      onClick={onClick}
      disabled={!slot.available}
    >
      {slot.time}
      {!slot.available && <span className="booked-label">Booked</span>}
    </button>
  );
}

TimeSlot.propTypes = {
  slot: PropTypes.shape({
    time: PropTypes.string.isRequired,
    available: PropTypes.bool.isRequired,
    start: PropTypes.string.isRequired,
    end: PropTypes.string.isRequired,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default DoctorSchedule;


import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { apiClient } from '../../utils/apiClient';
import './AppointmentForm.css';

function AppointmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [formData, setFormData] = useState({
    doctorId: '',
    startDateTime: '',
    endDateTime: '',
    reason: '',
  });

  useEffect(() => {
    loadDoctors();
    if (isEdit) {
      loadAppointment();
    } else {
      // Check if coming from schedule booking
      const doctorId = searchParams.get('doctorId');
      const startDateTime = searchParams.get('startDateTime');
      const endDateTime = searchParams.get('endDateTime');

      if (doctorId && startDateTime && endDateTime) {
        setFormData({
          doctorId,
          startDateTime: new Date(startDateTime).toISOString().slice(0, 16),
          endDateTime: new Date(endDateTime).toISOString().slice(0, 16),
          reason: '',
        });
      }
    }
  }, [id, isEdit, searchParams, loadAppointment, loadDoctors]);

  const loadDoctors = useCallback(async () => {
    try {
      const data = await apiClient('/api/doctors');
      setDoctors(data);
      // Only auto-select first doctor if not editing and not coming from schedule booking
      if (data.length > 0 && !isEdit) {
        const doctorId = searchParams.get('doctorId');
        if (!doctorId) {
          setFormData((prev) => ({ ...prev, doctorId: data[0].id }));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isEdit, searchParams]);

  const loadAppointment = useCallback(async () => {
    try {
      const data = await apiClient(`/api/appointments`);
      const appointments = data.appointments || [];
      const appointment = appointments.find((apt) => apt.id === id);
      if (appointment) {
        const start = new Date(appointment.startDateTime);
        const end = new Date(appointment.endDateTime);
        setFormData({
          doctorId: appointment.doctorId,
          startDateTime: start.toISOString().slice(0, 16),
          endDateTime: end.toISOString().slice(0, 16),
          reason: appointment.reason || '',
        });
      }
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-calculate end time if start time changes
    if (name === 'startDateTime' && value) {
      const start = new Date(value);
      const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 minutes
      setFormData((prev) => ({
        ...prev,
        startDateTime: value,
        endDateTime: end.toISOString().slice(0, 16),
      }));
    }
  }

  const loadDoctorSlots = useCallback(async () => {
    if (!formData.doctorId) return;

    try {
      setSlotsLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await apiClient(
        `/api/doctors/${formData.doctorId}/availability?date=${dateStr}`
      );
      setSlots(data.slots || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSlotsLoading(false);
    }
  }, [formData.doctorId, selectedDate]);

  function handleOpenTimeSlotModal() {
    if (!formData.doctorId) {
      setError('Please select a doctor first');
      return;
    }
    setShowTimeSlotModal(true);
    loadDoctorSlots();
  }

  function handleCloseTimeSlotModal() {
    setShowTimeSlotModal(false);
  }

  function handleSlotSelect(slot) {
    if (!slot.available) return;

    const start = new Date(slot.start);
    const end = new Date(slot.end);

    setFormData((prev) => ({
      ...prev,
      startDateTime: start.toISOString().slice(0, 16),
      endDateTime: end.toISOString().slice(0, 16),
    }));

    setShowTimeSlotModal(false);
  }

  function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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

  useEffect(() => {
    if (showTimeSlotModal && formData.doctorId) {
      loadDoctorSlots();
    }
  }, [selectedDate, showTimeSlotModal, formData.doctorId, loadDoctorSlots]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        doctorId: formData.doctorId,
        startDateTime: new Date(formData.startDateTime).toISOString(),
        endDateTime: new Date(formData.endDateTime).toISOString(),
        reason: formData.reason,
      };

      if (isEdit) {
        await apiClient(`/api/appointments/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient('/api/appointments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      navigate('/patient/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="form-loading">Loading...</div>;
  }

  return (
    <div className="appointment-form-page">
      <div className="form-container">
        <div className="form-header">
          <h1>{isEdit ? 'Reschedule Appointment' : 'Book New Appointment'}</h1>
          <p>
            {isEdit
              ? 'Update your appointment details'
              : 'Select a doctor and choose your preferred time'}
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="appointment-form">
          <div className="form-group">
            <label htmlFor="doctorId">Select Doctor</label>
            <select
              id="doctorId"
              name="doctorId"
              value={formData.doctorId}
              onChange={handleChange}
              required
              disabled={isEdit}
            >
              <option value="">Choose a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialty}
                </option>
              ))}
            </select>
          </div>

          {isEdit ? (
            <div className="form-group">
              <label>Current Appointment Time</label>
              <div className="current-time-display">
                <div className="time-display-text">
                  {formData.startDateTime && formData.endDateTime ? (
                    <>
                      <span className="time-label">Current:</span>
                      <span className="time-value">
                        {formatDateTime(formData.startDateTime)} -{' '}
                        {formatDateTime(formData.endDateTime)
                          .split(' ')
                          .slice(-2)
                          .join(' ')}
                      </span>
                    </>
                  ) : (
                    <span className="time-placeholder">No time selected</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleOpenTimeSlotModal}
                  className="select-time-button"
                >
                  Select New Time Slot
                </button>
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDateTime">Start Time</label>
                <input
                  type="datetime-local"
                  id="startDateTime"
                  name="startDateTime"
                  value={formData.startDateTime}
                  onChange={handleChange}
                  required
                  min={new Date(Date.now() + 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 16)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDateTime">End Time</label>
                <input
                  type="datetime-local"
                  id="endDateTime"
                  name="endDateTime"
                  value={formData.endDateTime}
                  onChange={handleChange}
                  required
                  min={
                    formData.startDateTime ||
                    new Date().toISOString().slice(0, 16)
                  }
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reason">Reason for Visit (optional)</label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="4"
              placeholder="Describe your symptoms or reason for visit"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/patient/dashboard')}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting
                ? 'Saving...'
                : isEdit
                  ? 'Update Appointment'
                  : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>

      {showTimeSlotModal && (
        <TimeSlotModal
          doctorId={formData.doctorId}
          doctors={doctors}
          slots={slots}
          slotsLoading={slotsLoading}
          selectedDate={selectedDate}
          onPreviousDay={handlePreviousDay}
          onNextDay={handleNextDay}
          onToday={handleToday}
          formatDate={formatDate}
          onSlotSelect={handleSlotSelect}
          onClose={handleCloseTimeSlotModal}
        />
      )}
    </div>
  );
}

function TimeSlotModal({
  doctorId,
  doctors,
  slots,
  slotsLoading,
  selectedDate,
  onPreviousDay,
  onNextDay,
  onToday,
  formatDate,
  onSlotSelect,
  onClose,
}) {
  const doctor = doctors.find((d) => d.id === doctorId);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return createPortal(
    <div className="time-slot-modal-overlay" onClick={onClose}>
      <div
        className="time-slot-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="time-slot-modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="time-slot-modal-title">Select New Time Slot</h2>
        {doctor && (
          <p className="time-slot-modal-subtitle">
            {doctor.name} - {doctor.specialty}
          </p>
        )}

        <div className="time-slot-date-navigation">
          <button
            onClick={onPreviousDay}
            className="time-slot-nav-button"
            aria-label="Previous day"
          >
            ←
          </button>
          <div className="time-slot-date-display">
            <button onClick={onToday} className="time-slot-date-text">
              {formatDate(selectedDate)}
            </button>
            <span className="time-slot-date-full">
              {selectedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <button
            onClick={onNextDay}
            className="time-slot-nav-button"
            aria-label="Next day"
          >
            →
          </button>
        </div>

        {slotsLoading ? (
          <div className="time-slot-loading">Loading available slots...</div>
        ) : (
          <div className="time-slot-grid">
            {slots.length === 0 ? (
              <div className="time-slot-empty">
                <p>No available time slots for this day.</p>
              </div>
            ) : (
              slots.map((slot, index) => (
                <button
                  key={index}
                  className={`time-slot-item ${slot.available ? 'available' : 'booked'}`}
                  onClick={() => onSlotSelect(slot)}
                  disabled={!slot.available}
                >
                  {slot.time}
                  {!slot.available && (
                    <span className="booked-label">Booked</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

TimeSlotModal.propTypes = {
  doctorId: PropTypes.string.isRequired,
  doctors: PropTypes.array.isRequired,
  slots: PropTypes.array.isRequired,
  slotsLoading: PropTypes.bool.isRequired,
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  onPreviousDay: PropTypes.func.isRequired,
  onNextDay: PropTypes.func.isRequired,
  onToday: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  onSlotSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AppointmentForm;

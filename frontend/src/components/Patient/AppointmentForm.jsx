import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  }, [id, isEdit, searchParams]);

  async function loadDoctors() {
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
  }

  async function loadAppointment() {
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
  }

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
                min={new Date().toISOString().slice(0, 16)}
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
                min={formData.startDateTime || new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

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
            <button type="submit" className="submit-button" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update Appointment' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AppointmentForm;


import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../utils/apiClient';
import './UpcomingAppointments.css';
import UpcomingAppointmentCard from './UpcomingAppointmentCard';

export default function UpcomingAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [currentAppointment, setCurrentAppointment] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient('/api/doctor/upcoming-appointments');
      setAppointments(data.appointments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentAppointment = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient('/api/doctor/current-appointment');
      setCurrentAppointment(data);
    } catch (err) {
      console.error('Error loading current appointment:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    loadCurrentAppointment();
  }, [loadAppointments, loadCurrentAppointment]);

  const cancelAppointment = useCallback(
    async (id) => {
      setLoading(true);
      try {
        await apiClient(`/api/doctor/appointment/${id}`, {
          method: 'DELETE',
        });
        loadCurrentAppointment();
        loadAppointments();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [loadCurrentAppointment, loadAppointments]
  );

  return (
    <>
      {Object.keys(currentAppointment).length > 0 && (
        <div className="current-appointment">
          <h1>Current Appointment</h1>
          <UpcomingAppointmentCard
            type="current"
            appointment={currentAppointment}
            onCancel={async () => {
              setLoading(true);
              await apiClient(
                `/api/doctor/appointment/no-show/${currentAppointment._id}`,
                { method: 'PUT' }
              );
              setCurrentAppointment({});
              setLoading(false);
            }}
          />
        </div>
      )}
      <div className="upcoming-appointments">
        {error && <div className="error-message">{error}</div>}
        <div className="info-container">
          <h1>Upcoming Appointments</h1>
        </div>
        {loading ? (
          <div className="loading">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="empty-state">
            <p>You don&apos;t have any upcoming appointments.</p>
          </div>
        ) : (
          <div className="appointments-grid">
            {appointments.map((appointment) => (
              <UpcomingAppointmentCard
                key={appointment._id}
                appointment={appointment}
                onCancel={() => {
                  cancelAppointment(appointment._id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

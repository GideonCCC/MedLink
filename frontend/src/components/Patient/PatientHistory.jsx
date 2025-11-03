import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { apiClient } from '../../utils/apiClient';
import './PatientHistory.css';

function PatientHistory() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: '',
    page: 1,
  });
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, [filters]);

  async function loadAppointments() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      params.append('page', filters.page);
      params.append('limit', '20');

      const data = await apiClient(`/api/appointments?${params.toString()}`);
      setAppointments(data.appointments);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  }

  function handlePageChange(newPage) {
    setFilters((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  return (
    <div className="patient-history">
      <div className="history-container">
        <div className="history-header">
          <h1>Appointment History</h1>
          <p>View and manage all your appointments</p>
        </div>

        <div className="history-filters">
          <div className="filter-group">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="from-date">From Date</label>
            <input
              type="date"
              id="from-date"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="to-date">To Date</label>
            <input
              type="date"
              id="to-date"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
            />
          </div>

          <button
            onClick={() => setFilters({ status: '', from: '', to: '', page: 1 })}
            className="clear-filters"
          >
            Clear Filters
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="empty-state">
            <p>No appointments found matching your filters.</p>
          </div>
        ) : (
          <>
            <div className="history-list">
              {appointments.map((apt) => (
                <HistoryItem
                  key={apt.id}
                  appointment={apt}
                />
              ))}
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="page-button"
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="page-button"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ appointment }) {
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getStatusClass(status) {
    const classes = {
      upcoming: 'status-upcoming',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      'no-show': 'status-no-show',
    };
    return classes[status] || '';
  }

  return (
    <div className="history-item">
      <div className="history-item-header">
        <div>
          <h3>{appointment.doctorName}</h3>
          {appointment.doctorSpecialty && (
            <p className="specialty">{appointment.doctorSpecialty}</p>
          )}
        </div>
        <span className={`status-badge ${getStatusClass(appointment.status)}`}>
          {appointment.status}
        </span>
      </div>

      <div className="history-item-details">
        <p className="date-time">{formatDate(appointment.startDateTime)}</p>
        {appointment.reason && <p className="reason">{appointment.reason}</p>}
      </div>

    </div>
  );
}

HistoryItem.propTypes = {
  appointment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    doctorName: PropTypes.string.isRequired,
    doctorSpecialty: PropTypes.string,
    startDateTime: PropTypes.string.isRequired,
    reason: PropTypes.string,
    status: PropTypes.string.isRequired,
  }).isRequired,
};

export default PatientHistory;


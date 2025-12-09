import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { apiClient } from '../../../utils/apiClient';
import './UpcomingAppointments.css';
import UpcomingAppointmentCard from './UpcomingAppointmentCard';

export default function UpcomingAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [currentAppointment, setCurrentAppointment] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const filterAppointmentsByDate = useCallback((appts, filter) => {
    if (!appts || appts.length === 0) {
      setAppointments([]);
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let filtered = [];

    switch (filter) {
      case 'next-week': {
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        filtered = appts.filter((apt) => {
          const aptDate = new Date(apt.startDateTime);
          return aptDate >= now && aptDate <= nextWeek;
        });
        break;
      }
      case 'next-month': {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        filtered = appts.filter((apt) => {
          const aptDate = new Date(apt.startDateTime);
          return aptDate >= now && aptDate <= nextMonth;
        });
        break;
      }
      case 'next-3-months': {
        const next3Months = new Date(now);
        next3Months.setMonth(next3Months.getMonth() + 3);
        filtered = appts.filter((apt) => {
          const aptDate = new Date(apt.startDateTime);
          return aptDate >= now && aptDate <= next3Months;
        });
        break;
      }
      case 'all':
      default:
        filtered = appts;
        break;
    }

    setAppointments(filtered);
  }, []);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient('/api/doctor/upcoming-appointments');
      setAllAppointments(data.appointments);
      filterAppointmentsByDate(data.appointments, dateFilter);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, filterAppointmentsByDate]);

  const handleFilterChange = (filter) => {
    setDateFilter(filter);
    filterAppointmentsByDate(allAppointments, filter);
  };

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

  // Keyboard navigation for filters and cards (ONLY within content area, NOT sidebar)
  useEffect(() => {
    const handleArrowKeyNavigation = (e) => {
      // Don't interfere with input fields, selects, or textareas
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Only handle if focus is within the content area (not sidebar)
      const contentArea = document.querySelector('.doctor-content');
      if (!contentArea || !contentArea.contains(e.target)) {
        return; // Don't handle if focus is in sidebar
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Only query elements within the content area, NOT sidebar
        const allFocusableElements = Array.from(
          contentArea.querySelectorAll(
            '.filter-button, .appointment-card, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => {
          return el.offsetParent !== null && 
                 !el.disabled && 
                 !el.hasAttribute('aria-hidden') &&
                 window.getComputedStyle(el).visibility !== 'hidden' &&
                 !el.closest('.doctor-menu-bar') && // Exclude sidebar elements
                 !el.closest('.sidebar-nav'); // Exclude sidebar navigation
        });

        if (allFocusableElements.length === 0) return;

        const currentIndex = allFocusableElements.findIndex(
          el => el === document.activeElement
        );

        if (currentIndex === -1) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            allFocusableElements[0]?.focus();
          }
          return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = currentIndex < allFocusableElements.length - 1 
            ? currentIndex + 1 
            : 0;
          allFocusableElements[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
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
  }, [appointments, currentAppointment]);

  return (
    <div className="upcoming-appointments">
        {error && <div className="error-message" role="alert">{error}</div>}
        
        {Object.keys(currentAppointment).length > 0 && (
          <div className="upcoming-section">
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
          </div>
        )}

        <div className="upcoming-section">
          <div className="info-container">
            <h1>Upcoming Appointments</h1>
            <div className="date-filters">
              <button
                type="button"
                className={`filter-button ${dateFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleFilterChange('all')}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFilterChange('all');
                  }
                }}
                aria-pressed={dateFilter === 'all'}
              >
                All Upcoming
              </button>
              <button
                type="button"
                className={`filter-button ${dateFilter === 'next-week' ? 'active' : ''}`}
                onClick={() => handleFilterChange('next-week')}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFilterChange('next-week');
                  }
                }}
                aria-pressed={dateFilter === 'next-week'}
              >
                Next Week
              </button>
              <button
                type="button"
                className={`filter-button ${dateFilter === 'next-month' ? 'active' : ''}`}
                onClick={() => handleFilterChange('next-month')}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFilterChange('next-month');
                  }
                }}
                aria-pressed={dateFilter === 'next-month'}
              >
                Next Month
              </button>
              <button
                type="button"
                className={`filter-button ${dateFilter === 'next-3-months' ? 'active' : ''}`}
                onClick={() => handleFilterChange('next-3-months')}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFilterChange('next-3-months');
                  }
                }}
                aria-pressed={dateFilter === 'next-3-months'}
              >
                Next 3 Months
              </button>
            </div>
          </div>
          {loading ? (
            <div className="loading">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <p>
                {dateFilter === 'all'
                  ? "You don't have any upcoming appointments."
                  : `No appointments found for the selected time period.`}
              </p>
            </div>
          ) : (
            <div className="appointments-grid">
              {appointments.map((appointment) => (
                <div key={appointment._id} tabIndex={0}>
                  <UpcomingAppointmentCard
                    type="upcoming"
                    appointment={appointment}
                    onCancel={() => {
                      cancelAppointment(appointment._id);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}

UpcomingAppointments.propTypes = {
  // UpcomingAppointments component doesn't receive props, but we document it for consistency
};

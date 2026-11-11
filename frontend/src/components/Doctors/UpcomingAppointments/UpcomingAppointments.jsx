import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { apiClient } from '../../../utils/apiClient';
import { useAuth } from '../../../context/AuthContext';
import {
  daysFromToday,
  getDateParts,
  greetingForNow,
  relativeDayLabel,
  todayLabel,
} from '../../../utils/dateDisplay';
import '../../Shared/Dashboard.css';
import './UpcomingAppointments.css';
import UpcomingAppointmentCard from './UpcomingAppointmentCard';
import Icon from '../../Shared/Icon';

function groupByDay(appointments) {
  const groups = [];
  for (const appointment of appointments) {
    const parts = getDateParts(appointment.startDateTime);
    const key = parts.fullDate;
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const diff = daysFromToday(appointment.startDateTime);
      group = {
        key,
        label: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : parts.weekdayLong,
        date: `${parts.month} ${parts.day}`,
        items: [],
      };
      groups.push(group);
    }
    group.items.push(appointment);
  }
  return groups;
}

export default function UpcomingAppointments() {
  const { user } = useAuth();
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

  const groupedAppointments = useMemo(() => groupByDay(appointments), [appointments]);

  const stats = useMemo(() => {
    const days = allAppointments.map((apt) => daysFromToday(apt.startDateTime));
    return {
      today: days.filter((d) => d === 0).length,
      week: days.filter((d) => d >= 0 && d < 7).length,
      total: allAppointments.length,
      next: allAppointments[0],
    };
  }, [allAppointments]);

  return (
    <div className="upcoming-appointments">
        {error && <div className="error-message" role="alert">{error}</div>}

        <section className="dash-hero">
          <div className="dash-hero-copy">
            <div className="dash-hero-date">
              <Icon name="calendar" size={15} />
              {todayLabel()}
            </div>
            <h1 className="dash-hero-title">
              {greetingForNow()}, {user?.name || 'Doctor'}
            </h1>
            <p className="dash-hero-subtitle">
              {stats.today > 0
                ? `You have ${stats.today} ${stats.today === 1 ? 'patient' : 'patients'} scheduled today.`
                : stats.week > 0
                  ? `No patients today. ${stats.week} ${stats.week === 1 ? 'visit' : 'visits'} in the next 7 days.`
                  : 'Your schedule is clear for the next 7 days.'}
            </p>
          </div>
        </section>

        <div className="dash-stats">
          <div className="dash-stat">
            <span className="dash-stat-icon">
              <Icon name="calendarCheck" size={22} />
            </span>
            <div className="dash-stat-body">
              <div className="dash-stat-label">Today</div>
              <div className="dash-stat-value">{stats.today}</div>
              <div className="dash-stat-hint">Appointments</div>
            </div>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-icon tone-info">
              <Icon name="calendar" size={22} />
            </span>
            <div className="dash-stat-body">
              <div className="dash-stat-label">Next 7 days</div>
              <div className="dash-stat-value">{stats.week}</div>
              <div className="dash-stat-hint">Appointments</div>
            </div>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-icon tone-violet">
              <Icon name="user" size={22} />
            </span>
            <div className="dash-stat-body">
              <div className="dash-stat-label">Next patient</div>
              <div className="dash-stat-value dash-stat-value-text">
                {stats.next?.patientName || '–'}
              </div>
              <div className="dash-stat-hint">
                {stats.next
                  ? `${relativeDayLabel(stats.next.startDateTime)} · ${getDateParts(stats.next.startDateTime).time}`
                  : 'Nothing scheduled'}
              </div>
            </div>
          </div>
          <div className="dash-stat">
            <span className="dash-stat-icon tone-warning">
              <Icon name="clock" size={22} />
            </span>
            <div className="dash-stat-body">
              <div className="dash-stat-label">All upcoming</div>
              <div className="dash-stat-value">{stats.total}</div>
              <div className="dash-stat-hint">Scheduled visits</div>
            </div>
          </div>
        </div>
        
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
              <span className="empty-state-icon">
                <Icon name="calendarCheck" size={26} />
              </span>
              <p>
                {dateFilter === 'all'
                  ? "You don't have any upcoming appointments."
                  : `No appointments found for the selected time period.`}
              </p>
            </div>
          ) : (
            <div className="agenda">
              {groupedAppointments.map((group) => (
                <div key={group.key} className="agenda-day">
                  <div className="agenda-day-head">
                    <span className="agenda-day-label">{group.label}</span>
                    <span className="agenda-day-date">{group.date}</span>
                    <span className="agenda-day-count">
                      {group.items.length} {group.items.length === 1 ? 'appointment' : 'appointments'}
                    </span>
                  </div>
                  <div className="appointments-grid">
                    {group.items.map((appointment) => (
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

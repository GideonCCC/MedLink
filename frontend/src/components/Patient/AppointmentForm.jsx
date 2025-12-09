import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const [originalAppointment, setOriginalAppointment] = useState(null);
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

  // Helper to convert EST date string (YYYY-MM-DD) to a Date object that represents that date in EST
  const estDateStringToDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date at noon EST by using UTC offset
    // EST is UTC-5, so noon EST = 17:00 UTC
    // But we need to account for DST - EDT is UTC-4, so noon EDT = 16:00 UTC
    // To be safe, let's use 18:00 UTC which is definitely in the afternoon in EST/EDT
    return new Date(Date.UTC(year, month - 1, day, 18, 0, 0));
  };

  // Initialize selectedDate with clinic timezone date to avoid date offset issues
  const getClinicDate = () => {
    const estDateStr = getClinicDateString();
    return estDateStringToDate(estDateStr);
  };
  
  const [selectedDate, setSelectedDate] = useState(getClinicDate());

  const [formData, setFormData] = useState({
    doctorId: '',
    startDateTime: '',
    endDateTime: '',
    reason: '',
  });

  const toInputValue = useCallback((date) => {
    const tzOffset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  }, []);

  const convertUtcToLocalInput = useCallback(
    (utcString) => {
      if (!utcString) return '';
      const date = new Date(utcString);
      return toInputValue(date);
    },
    [toInputValue]
  );

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
        // Store original appointment for validation
        setOriginalAppointment(appointment);
        setFormData({
          doctorId: appointment.doctorId,
          startDateTime: convertUtcToLocalInput(appointment.startDateTime),
          endDateTime: convertUtcToLocalInput(appointment.endDateTime),
          reason: appointment.reason || '',
        });
      }
    } catch (err) {
      setError(err.message);
    }
  }, [id, convertUtcToLocalInput]);

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
          startDateTime: convertUtcToLocalInput(startDateTime),
          endDateTime: convertUtcToLocalInput(endDateTime),
          reason: '',
        });
      }
    }
    
    // Focus on the first focusable element when page loads (for reschedule/edit)
    // Wait for form to be ready
    const focusTimer = setTimeout(() => {
      const formContainer = document.querySelector('.appointment-form');
      if (formContainer) {
        const firstFocusable = formContainer.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    }, 300);
    
    return () => clearTimeout(focusTimer);
  }, [
    isEdit,
    loadAppointment,
    loadDoctors,
    searchParams,
    convertUtcToLocalInput,
  ]);

  function handleChange(e) {
    const { name, value } = e.target;
    
    // If changing doctor, validate specialty match
    if (name === 'doctorId') {
      const selectedDoctor = doctors.find((d) => d.id === value);
      
      // If editing, check against original appointment
      if (isEdit && originalAppointment) {
        const originalDoctor = doctors.find((d) => d.id === originalAppointment.doctorId);
        if (selectedDoctor && originalDoctor) {
          if (selectedDoctor.specialty !== originalDoctor.specialty) {
            setError('You can only change to a doctor within the same specialty/department.');
            return;
          }
        }
      }
      
      // If new appointment but already had a doctor selected, check specialty match
      if (!isEdit && formData.doctorId && formData.doctorId !== value) {
        const previousDoctor = doctors.find((d) => d.id === formData.doctorId);
        if (selectedDoctor && previousDoctor) {
          if (selectedDoctor.specialty !== previousDoctor.specialty) {
            setError('You can only change to a doctor within the same specialty/department.');
            return;
          }
        }
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(''); // Clear error when user makes changes

    // Auto-calculate end time if start time changes
    if (name === 'startDateTime' && value) {
      const start = new Date(value);
      // Round to nearest 30 minutes
      const minutes = start.getMinutes();
      const roundedMinutes = minutes < 30 ? 0 : 30;
      start.setMinutes(roundedMinutes, 0, 0);
      
      const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 minutes
      setFormData((prev) => ({
        ...prev,
        startDateTime: toInputValue(start),
        endDateTime: toInputValue(end),
      }));
    }
    
    if (name === 'endDateTime' && value) {
      // Ensure end time is exactly 30 minutes after start time
      if (formData.startDateTime) {
        const start = new Date(formData.startDateTime);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        setFormData((prev) => ({
          ...prev,
          endDateTime: toInputValue(end),
        }));
      }
    }
  }

  const loadDoctorSlots = useCallback(async () => {
    if (!formData.doctorId) return;

    try {
      setSlotsLoading(true);
      // Get date string in clinic timezone (America/New_York) to avoid date offset
      // Use toLocaleDateString with timeZone to get the correct date
      const dateStr = selectedDate.toLocaleDateString('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }); // Returns YYYY-MM-DD format
      
      const data = await apiClient(
        `/api/doctors/${formData.doctorId}/availability?date=${dateStr}`
      );
      
      // Filter out past time slots on client side as additional safety measure
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const filteredSlots = (data.slots || []).filter((slot) => {
        if (!slot.available) return false;
        // Filter out slots that are in the past or less than 1 hour from now
        const slotStart = new Date(slot.start);
        return slotStart.getTime() > oneHourFromNow.getTime();
      });
      
      // Check if we have slots, and if so, check what date they're actually for
      // The API might return slots for a different date than requested if today is too late
      if (filteredSlots.length > 0) {
        const firstSlot = filteredSlots[0];
        const slotStart = new Date(firstSlot.start);
        // Get the date of the first slot in clinic timezone
        const slotDateStr = slotStart.toLocaleDateString('en-CA', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        
        // If the slot date is different from what we requested, update selectedDate
        if (slotDateStr !== dateStr) {
          console.log('Updating selectedDate from', dateStr, 'to', slotDateStr);
          const newSelectedDate = estDateStringToDate(slotDateStr);
          setSelectedDate(newSelectedDate);
          // Also update slots to ensure they're set after the date update
          setSlots(filteredSlots);
          return; // Return early to avoid setting slots twice
        }
      }
      
      setSlots(filteredSlots);
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
    // Refresh the selected date to ensure it's current in EST
    setSelectedDate(getClinicDate());
    setShowTimeSlotModal(true);
    loadDoctorSlots();
  }

  function handleCloseTimeSlotModal() {
    setShowTimeSlotModal(false);
  }

  function handleSlotSelect(slot) {
    if (!slot.available) return;

    setFormData((prev) => ({
      ...prev,
      startDateTime: convertUtcToLocalInput(slot.start),
      endDateTime: convertUtcToLocalInput(slot.end),
    }));

    setShowTimeSlotModal(false);
  }

  function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    // Use the clinic timezone (America/New_York) for consistent date display
    // This ensures the date shown matches what the user selected
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
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
    // Always get the date string in clinic timezone first to ensure consistency
    const dateStr = date.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    // Get today's date in clinic timezone
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    if (dateStr === todayStr) {
      return 'Today';
    }

    // Calculate tomorrow by adding 1 day to today
    const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
    const tomorrowDate = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay + 1, 12, 0, 0));
    const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    if (dateStr === tomorrowStr) {
      return 'Tomorrow';
    }

    // Use the date string to create a display date to ensure consistency
    const [year, month, day] = dateStr.split('-').map(Number);
    const displayDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    
    // Use clinic timezone for consistent date display
    return displayDate.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
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

  function handleToday() {
    // Set to today's date in clinic timezone
    setSelectedDate(getClinicDate());
  }

  useEffect(() => {
    if (showTimeSlotModal && formData.doctorId) {
      loadDoctorSlots();
    }
  }, [selectedDate, showTimeSlotModal, formData.doctorId, loadDoctorSlots]);

  // Arrow key and Enter key navigation for keyboard accessibility (only when modal is not open)
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      // Don't interfere if modal is open
      if (showTimeSlotModal) return;

      // Only handle if focus is within the content area (not sidebar)
      const contentArea = document.querySelector('.patient-content');
      if (!contentArea || !contentArea.contains(e.target)) {
        return; // Don't handle if focus is in sidebar
      }

      const formContainer = document.querySelector('.appointment-form');
      if (!formContainer) return;

      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const allFocusableElements = Array.from(
        formContainer.querySelectorAll(focusableSelectors)
      ).filter(el => {
        return el.offsetParent !== null && 
               !el.disabled && 
               !el.hasAttribute('aria-hidden') &&
               window.getComputedStyle(el).visibility !== 'hidden' &&
               !el.closest('.patient-sidebar') && // Exclude sidebar elements
               !el.closest('.sidebar-nav'); // Exclude sidebar navigation
      });

      if (allFocusableElements.length === 0) return;

      const currentIndex = allFocusableElements.findIndex(
        el => el === document.activeElement
      );

      // Handle Enter key: move to next field/button (except for buttons where it should trigger action)
      if (e.key === 'Enter') {
        const currentElement = document.activeElement;
        const isInput = currentElement.tagName === 'INPUT' || currentElement.tagName === 'SELECT' || currentElement.tagName === 'TEXTAREA';
        
        if (isInput && currentIndex !== -1) {
          // In input fields, Enter moves to next field
          e.preventDefault();
          const nextIndex = currentIndex < allFocusableElements.length - 1 
            ? currentIndex + 1 
            : 0;
          allFocusableElements[nextIndex]?.focus();
          return;
        }
        // For buttons and links, let default behavior handle it (trigger action)
        return;
      }

      // Don't interfere if user is typing in an input, select, or textarea (for arrow keys)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
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

    document.addEventListener('keydown', handleKeyNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyNavigation);
    };
  }, [showTimeSlotModal]);

  // Validate appointment changes
  async function validateAppointmentChanges() {
    const errors = [];

    // 1. Check if time slot is exactly 30 minutes
    const startTime = new Date(formData.startDateTime);
    const endTime = new Date(formData.endDateTime);
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    if (durationMinutes !== 30) {
      errors.push('Appointment duration must be exactly 30 minutes.');
    }

    // 2. Check if minutes are in 30-minute increments (0 or 30)
    const startMinutes = startTime.getMinutes();
    const endMinutes = endTime.getMinutes();
    
    if (startMinutes !== 0 && startMinutes !== 30) {
      errors.push('Start time must be on the hour or half-hour (e.g., 9:00 AM or 9:30 AM).');
    }
    
    if (endMinutes !== 0 && endMinutes !== 30) {
      errors.push('End time must be on the hour or half-hour (e.g., 9:30 AM or 10:00 AM).');
    }

    // 3. If editing, check if doctor is in same specialty
    if (isEdit && originalAppointment) {
      const selectedDoctor = doctors.find((d) => d.id === formData.doctorId);
      const originalDoctor = doctors.find((d) => d.id === originalAppointment.doctorId);
      
      if (selectedDoctor && originalDoctor) {
        if (selectedDoctor.specialty !== originalDoctor.specialty) {
          errors.push('You can only change to a doctor within the same specialty/department.');
        }
      }
    }

    // 4. Check if time slot is within doctor's availability
    if (formData.doctorId && formData.startDateTime && formData.endDateTime) {
      try {
        const startDate = new Date(formData.startDateTime);
        const dateStr = startDate.toLocaleDateString('en-CA', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        
        const availabilityData = await apiClient(
          `/api/doctors/${formData.doctorId}/availability?date=${dateStr}`
        );
        
        const requestedStart = new Date(formData.startDateTime);
        const requestedEnd = new Date(formData.endDateTime);
        
        // Check if the requested time slot matches any available slot
        const isAvailable = availabilityData.slots.some((slot) => {
          const slotStart = new Date(slot.start);
          const slotEnd = new Date(slot.end);
          return (
            slot.available &&
            slotStart.getTime() === requestedStart.getTime() &&
            slotEnd.getTime() === requestedEnd.getTime()
          );
        });
        
        if (!isAvailable) {
          errors.push('The selected time slot is not available. Please choose from the available time slots.');
        }
      } catch (err) {
        errors.push('Unable to verify doctor availability. Please try again.');
      }
    }

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validate appointment changes
      const validationErrors = await validateAppointmentChanges();
      if (validationErrors.length > 0) {
        setError(validationErrors.join(' '));
        setSubmitting(false);
        return;
      }

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

      navigate('/patient/dashboard', { state: { fromBooking: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Memoize filtered doctors to ensure proper filtering
  const filteredDoctors = useMemo(() => {
    if (!doctors.length) return [];
    
    // If editing and have original appointment, filter by specialty
    if (isEdit && originalAppointment) {
      // Try different possible field names for doctorId
      const doctorId = originalAppointment.doctorId || originalAppointment.doctor?.id || originalAppointment.doctorId;
      
      if (doctorId) {
        const originalDoctor = doctors.find((d) => d.id === doctorId);
        if (originalDoctor && originalDoctor.specialty) {
          // Filter to only show doctors with the same specialty
          return doctors.filter(
            (doctor) => doctor.specialty === originalDoctor.specialty
          );
        }
      }
    }
    
    // If a doctor is already selected (even in new appointment), filter by that doctor's specialty
    if (formData.doctorId) {
      const selectedDoctor = doctors.find((d) => d.id === formData.doctorId);
      if (selectedDoctor && selectedDoctor.specialty) {
        // Only show doctors with the same specialty
        return doctors.filter(
          (doctor) => doctor.specialty === selectedDoctor.specialty
        );
      }
    }
    
    // Otherwise, return all doctors
    return doctors;
  }, [doctors, isEdit, originalAppointment, formData.doctorId]);

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
            >
              <option value="">Choose a doctor</option>
              {filteredDoctors.map((doctor) => (
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
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenTimeSlotModal();
                    }
                  }}
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
                  min={
                    formData.startDateTime ||
                    toInputValue(new Date(Date.now() + 60 * 60 * 1000))
                  }
                />
                <p className="time-hint">
                  ⏰ 30-minute rule: Time will automatically round to the nearest hour or 30 minutes (e.g., 10:15 → 10:00, 10:45 → 11:00)
                </p>
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
                  min={formData.startDateTime || toInputValue(new Date())}
                />
                <p className="time-hint">
                  End time is automatically set to 30 minutes after start time
                </p>
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
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/patient/dashboard');
                }
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  e.preventDefault();
                  const form = e.target.closest('form');
                  if (form) {
                    const formEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(formEvent);
                  }
                }
              }}
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
  const modalRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Focus the first focusable element in the modal when it opens
    // Prefer focusing on a time slot button if available, otherwise focus on date nav
    if (modalRef.current) {
      setTimeout(() => {
        // First try to focus on a time slot button
        const timeSlotButtons = modalRef.current?.querySelectorAll('.time-slot-item[tabindex="0"]');
        if (timeSlotButtons && timeSlotButtons.length > 0) {
          timeSlotButtons[0].focus();
        } else {
          // Otherwise focus on the first focusable element (close button or date nav)
          const firstFocusable = modalRef.current?.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 100);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [slots]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleKeyDown = (e) => {
    // Trap focus within modal - only for Tab key
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
      return;
    }
    
    // Handle Enter key: move to next field/button (except for buttons where it should trigger action)
    if (e.key === 'Enter') {
      const currentElement = document.activeElement;
      const isInput = currentElement.tagName === 'INPUT' || currentElement.tagName === 'SELECT' || currentElement.tagName === 'TEXTAREA';
      
      if (isInput) {
        const focusableElements = Array.from(
          modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) || []
        ).filter(el => {
          return el.offsetParent !== null && 
                 !el.disabled && 
                 !el.hasAttribute('aria-hidden') &&
                 window.getComputedStyle(el).visibility !== 'hidden';
        });

        const currentIndex = focusableElements.findIndex(
          el => el === document.activeElement
        );

        if (currentIndex !== -1) {
          e.preventDefault();
          const nextIndex = currentIndex < focusableElements.length - 1 
            ? currentIndex + 1 
            : 0;
          focusableElements[nextIndex]?.focus();
          return;
        }
      }
      // For buttons, let default behavior handle it (trigger action)
      return;
    }
    
      // Handle arrow keys for navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const currentButton = document.activeElement;
        // If focus is on a time slot button, let button's onKeyDown handle it
        if (currentButton && currentButton.classList.contains('time-slot-item')) {
          return; // Let button's onKeyDown handle it
        }
        
        // For other buttons (close, date nav, etc.), navigate between them
        // But also allow navigation TO time slot buttons
        const allFocusableElements = Array.from(
          modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) || []
        ).filter(el => {
          return el.offsetParent !== null && 
                 !el.disabled && 
                 !el.hasAttribute('aria-hidden') &&
                 window.getComputedStyle(el).visibility !== 'hidden' &&
                 el.getAttribute('tabindex') !== '-1' &&
                 el.getAttribute('aria-disabled') !== 'true';
        });

        if (allFocusableElements.length === 0) return;

        const currentIndex = allFocusableElements.findIndex(
          el => el === document.activeElement
        );

        if (currentIndex === -1) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            // Try to focus on first time slot button if available, otherwise first element
            const firstTimeSlot = allFocusableElements.find(el => el.classList.contains('time-slot-item'));
            if (firstTimeSlot) {
              firstTimeSlot.focus();
            } else {
              allFocusableElements[0]?.focus();
            }
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

  return createPortal(
    <div
      className="time-slot-modal-overlay"
      onClick={onClose}
      role="presentation"
      aria-hidden="false"
    >
      <div
        className="time-slot-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-slot-modal-title"
        tabIndex={-1}
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <button
          className="time-slot-modal-close"
          onClick={onClose}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
          aria-label="Close time slot selection"
        >
          ×
        </button>
        <h2 id="time-slot-modal-title" className="time-slot-modal-title">
          Select New Time Slot
        </h2>
        {doctor && (
          <p className="time-slot-modal-subtitle">
            {doctor.name} - {doctor.specialty}
          </p>
        )}

        <div className="time-slot-date-navigation">
          <button
            onClick={onPreviousDay}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPreviousDay();
              }
            }}
            className="time-slot-nav-button"
            aria-label="Previous day"
          >
            ←
          </button>
          <div className="time-slot-date-display">
            <button 
              onClick={onToday}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToday();
                }
              }}
              className="time-slot-date-text"
            >
              {formatDate(selectedDate)}
            </button>
            <span className="time-slot-date-full">
              {/* Use the same date string that's sent to the API for consistency */}
              {(() => {
                const dateStr = selectedDate.toLocaleDateString('en-CA', {
                  timeZone: 'America/New_York',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                });
                const [y, m, d] = dateStr.split('-').map(Number);
                const displayDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
                return displayDate.toLocaleDateString('en-US', {
                  timeZone: 'America/New_York',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              })()}
            </span>
          </div>
          <button
            onClick={onNextDay}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNextDay();
              }
            }}
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
                  onClick={() => {
                    if (slot.available) {
                      onSlotSelect(slot);
                    }
                  }}
                  tabIndex={slot.available ? 0 : -1}
                  aria-disabled={!slot.available}
                  onKeyDown={(e) => {
                    // Handle arrow keys directly on the button
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Get all time slot buttons in the grid
                      const timeSlotGrid = e.target.closest('.time-slot-grid');
                      if (!timeSlotGrid) return;
                      
                      const allButtons = Array.from(
                        timeSlotGrid.querySelectorAll('.time-slot-item')
                      );
                      
                      const timeSlotButtons = allButtons.filter(btn => {
                        return btn.offsetParent !== null && 
                               btn.getAttribute('tabindex') !== '-1' &&
                               btn.getAttribute('aria-disabled') !== 'true';
                      });
                      
                      if (timeSlotButtons.length === 0) return;
                      
                      const currentIndex = timeSlotButtons.findIndex(btn => btn === e.target);
                      if (currentIndex === -1) {
                        // If current button not found, focus first available
                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                          timeSlotButtons[0]?.focus();
                        }
                        return;
                      }
                      
                      // Parse time helper
                      const parseTime = (timeStr) => {
                        const cleanStr = timeStr.replace(/Booked/gi, '').trim();
                        const match = cleanStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                        if (!match) return null;
                        let hours = parseInt(match[1], 10);
                        const minutes = parseInt(match[2], 10);
                        const period = match[3]?.toUpperCase();
                        
                        if (period === 'PM' && hours !== 12) hours += 12;
                        if (period === 'AM' && hours === 12) hours = 0;
                        
                        return { hours, minutes, totalMinutes: hours * 60 + minutes };
                      };
                      
                      const currentTimeText = e.target.textContent.trim();
                      const currentTime = parseTime(currentTimeText);
                      
                      let targetButton = null;
                      
                      // Try time-based navigation first
                      if (currentTime) {
                        let targetMinutes = currentTime.totalMinutes;
                        if (e.key === 'ArrowRight') {
                          targetMinutes += 30;
                        } else if (e.key === 'ArrowLeft') {
                          targetMinutes -= 30;
                        } else if (e.key === 'ArrowDown') {
                          targetMinutes += 120;
                        } else if (e.key === 'ArrowUp') {
                          targetMinutes -= 120;
                        }
                        
                        targetButton = timeSlotButtons.find(btn => {
                          const btnTimeText = btn.textContent.trim();
                          const btnTime = parseTime(btnTimeText);
                          return btnTime && btnTime.totalMinutes === targetMinutes;
                        });
                      }
                      
                      // Fallback to grid-based navigation
                      if (!targetButton || targetButton === e.target) {
                        const gridRect = timeSlotGrid.getBoundingClientRect();
                        const firstRowButtons = timeSlotButtons.filter(btn => {
                          const btnRect = btn.getBoundingClientRect();
                          return Math.abs(btnRect.top - gridRect.top) < 20;
                        });
                        const columnsPerRow = firstRowButtons.length || 4;
                        const currentRow = Math.floor(currentIndex / columnsPerRow);
                        const currentCol = currentIndex % columnsPerRow;
                        
                        if (e.key === 'ArrowRight') {
                          if (currentCol < columnsPerRow - 1) {
                            const nextIndex = currentIndex + 1;
                            if (nextIndex < timeSlotButtons.length) {
                              targetButton = timeSlotButtons[nextIndex];
                            }
                          }
                        } else if (e.key === 'ArrowLeft') {
                          if (currentCol > 0) {
                            targetButton = timeSlotButtons[currentIndex - 1];
                          }
                        } else if (e.key === 'ArrowDown') {
                          const nextRowIndex = (currentRow + 1) * columnsPerRow + currentCol;
                          if (nextRowIndex < timeSlotButtons.length) {
                            targetButton = timeSlotButtons[nextRowIndex];
                          }
                        } else if (e.key === 'ArrowUp') {
                          if (currentRow > 0) {
                            const prevRowIndex = (currentRow - 1) * columnsPerRow + currentCol;
                            if (prevRowIndex >= 0) {
                              targetButton = timeSlotButtons[prevRowIndex];
                            }
                          }
                        }
                      }
                      
                      if (targetButton && targetButton !== e.target) {
                        targetButton.focus();
                      }
                      return;
                    }
                    
                    if (slot.available && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSlotSelect(slot);
                    }
                  }}
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

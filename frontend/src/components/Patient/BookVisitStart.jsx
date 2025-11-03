import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { apiClient } from '../../utils/apiClient';
import './BookVisitStart.css';

const services = [
  { id: 'primary', name: 'Primary Care', icon: '🏥' },
  { id: 'urgent', name: 'Urgent Care', icon: '🚨' },
  { id: 'covid', name: 'COVID Care', icon: '🦠' },
  { id: 'cold-flu', name: 'Cold, Flu & COVID Testing', icon: '🤒' },
  { id: 'workplace', name: 'Workplace Health', icon: '💼' },
  { id: 'injury', name: 'Injury', icon: '🩹' },
];

const serviceMap = {
  primary: 'General Practice',
  urgent: 'General Practice',
  covid: 'General Practice',
  'cold-flu': 'General Practice',
  workplace: 'General Practice',
  injury: 'Orthopedics',
};

function ServiceIcon({ iconType }) {
  const icons = {
    primary: '🏥',
    urgent: '🚨',
    covid: '🦠',
    'cold-flu': '🤒',
    workplace: '💼',
    injury: '🩹',
  };

  return (
    <span className="reason-icon-wrapper">
      <span className="reason-icon">{icons[iconType] || '🏥'}</span>
    </span>
  );
}

ServiceIcon.propTypes = {
  iconType: PropTypes.string.isRequired,
};

function BookVisitStart() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [showDoctorsModal, setShowDoctorsModal] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    loadSpecialties();
  }, []);

  async function loadSpecialties() {
    try {
      const data = await apiClient('/api/doctors/specialties');
      setSpecialties(data);
    } catch (err) {
      console.error('Failed to load specialties:', err);
    }
  }

  const handleServiceClick = (serviceId) => {
    setSelectedService(serviceId);
    setSelectedSpecialty(null);
    setShowDoctorsModal(true);
    setShowModal(false);
  };

  const handleModalSearch = (e) => {
    e.preventDefault();
    if (modalSearchQuery.trim()) {
      setSelectedSpecialty(modalSearchQuery.trim());
      setSelectedService(null);
      setShowDoctorsModal(true);
      setShowModal(false);
    }
  };

  const handleSpecialtyClick = (specialty) => {
    setSelectedSpecialty(specialty);
    setSelectedService(null);
    setShowDoctorsModal(true);
    setShowModal(false);
  };

  const handleSearchInputClick = () => {
    setShowModal(true);
  };

  const handleCloseDoctorsModal = () => {
    setShowDoctorsModal(false);
    setSelectedSpecialty(null);
    setSelectedService(null);
  };

  const filteredSpecialties = specialties.filter((spec) =>
    spec.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  return (
    <div className="book-visit-start">
      <div className="book-visit-header">
        <h2>Book an Appointment</h2>
        <p>What brings you in today?</p>
      </div>

      <div className="book-visit-content">
        <div className="search-section">
          <div className="search-input-wrapper" onClick={handleSearchInputClick}>
            <input
              type="text"
              placeholder="Search for doctors or specialties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              readOnly
            />
            <button type="button" className="search-icon-button" aria-label="Search">
              🔍
            </button>
          </div>
        </div>

        <div className="common-reasons">
          <div className="reasons-list">
            {services.map((service) => (
              <button
                key={service.id}
                className="reason-item"
                onClick={() => handleServiceClick(service.id)}
              >
                <ServiceIcon iconType={service.id} />
                <span className="reason-name">{service.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showModal && (
        <SearchModal
          onClose={() => setShowModal(false)}
          searchQuery={modalSearchQuery}
          onSearchChange={setModalSearchQuery}
          onSearchSubmit={handleModalSearch}
          specialties={filteredSpecialties}
          onSpecialtyClick={handleSpecialtyClick}
        />
      )}

      {/* Doctors Selection Modal */}
      {showDoctorsModal && (
        <DoctorsSelectionModal
          specialty={selectedSpecialty}
          service={selectedService}
          serviceMap={serviceMap}
          onClose={handleCloseDoctorsModal}
          onSlotSelected={(doctorId, slot) => {
            navigate(
              `/patient/appointments/new?doctorId=${doctorId}&startDateTime=${encodeURIComponent(slot.start)}&endDateTime=${encodeURIComponent(slot.end)}`
            );
          }}
        />
      )}
    </div>
  );
}

function SearchModal({
  onClose,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  specialties,
  onSpecialtyClick,
}) {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return createPortal(
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-title">What brings you in?</h2>
        
        <form onSubmit={onSearchSubmit} className="modal-search-form">
          <div className="modal-search-wrapper">
            <input
              type="text"
              placeholder="Search for doctors or specialties..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="modal-search-input"
              autoFocus
            />
            <button type="submit" className="modal-search-button" aria-label="Search">
              🔍
            </button>
          </div>
        </form>

        <div className="specialties-dropdown">
          <p className="specialties-label">All Specialties We Provide:</p>
          <div className="specialties-list">
            {specialties.length === 0 ? (
              <div className="no-specialties">No specialties found</div>
            ) : (
              specialties.map((specialty) => (
                <button
                  key={specialty}
                  className="specialty-item"
                  onClick={() => onSpecialtyClick(specialty)}
                >
                  {specialty}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

SearchModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchSubmit: PropTypes.func.isRequired,
  specialties: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSpecialtyClick: PropTypes.func.isRequired,
};

function DoctorsSelectionModal({ specialty, service, serviceMap, onClose, onSlotSelected }) {
  const [doctors, setDoctors] = useState([]);
  const [doctorsWithSchedules, setDoctorsWithSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, service]);

  useEffect(() => {
    if (doctors.length > 0) {
      loadDoctorsSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors, selectedDate]);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  async function loadDoctors() {
    try {
      setLoading(true);
      const finalSpecialty = specialty || (service ? serviceMap[service] : null);
      const params = finalSpecialty ? `?specialty=${encodeURIComponent(finalSpecialty)}` : '';
      const data = await apiClient(`/api/doctors${params}`);
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateStart = new Date(selectedDate);
  selectedDateStart.setHours(0, 0, 0, 0);
  const canGoPrevious = selectedDateStart.getTime() > today.getTime();

  const doctorsWithSlots = doctorsWithSchedules.filter(
    (doctor) => doctor.availableSlots && doctor.availableSlots.length > 0
  );

  return createPortal(
    <div className="doctors-modal-overlay" onClick={onClose}>
      <div className="doctors-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="doctors-modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="doctors-modal-title">Book an Appointment</h2>

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
        ) : doctorsWithSlots.length === 0 ? (
          <div className="empty-state">
            <p>No slots available for this day.</p>
          </div>
        ) : (
          <div className="doctors-schedule-list">
            {doctorsWithSlots.map((doctor) => (
              <DoctorScheduleCard
                key={doctor.id}
                doctor={doctor}
                onSlotClick={(slot) => onSlotSelected(doctor.id, slot)}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

DoctorsSelectionModal.propTypes = {
  specialty: PropTypes.string,
  service: PropTypes.string,
  serviceMap: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSlotSelected: PropTypes.func.isRequired,
};

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

function DoctorAvatar() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="50" fill="#f0fdfb" />
      <circle cx="50" cy="35" r="15" fill="#00b894" />
      <path
        d="M20 85 C20 65, 35 55, 50 55 C65 55, 80 65, 80 85"
        fill="#00b894"
      />
    </svg>
  );
}

export default BookVisitStart;


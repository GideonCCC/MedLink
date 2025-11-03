import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { apiClient } from '../../utils/apiClient';
import './Home.css';

const services = [
  { id: 'primary', name: 'Primary Care', icon: '🏥' },
  { id: 'urgent', name: 'Urgent Care', icon: '🚨' },
  { id: 'covid', name: 'COVID Care', icon: '🦠' },
  { id: 'cold-flu', name: 'Cold, Flu & COVID Testing', icon: '🤒' },
  { id: 'workplace', name: 'Workplace Health', icon: '💼' },
  { id: 'injury', name: 'Injury', icon: '🩹' },
];

// Icon component with unified color
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

function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

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
    navigate(`/doctors?service=${serviceId}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/doctors?specialty=${encodeURIComponent(searchQuery)}`);
      setShowModal(false);
    }
  };

  const handleModalSearch = (e) => {
    e.preventDefault();
    if (modalSearchQuery.trim()) {
      navigate(`/doctors?specialty=${encodeURIComponent(modalSearchQuery)}`);
      setShowModal(false);
    }
  };

  const handleSpecialtyClick = (specialty) => {
    navigate(`/doctors?specialty=${encodeURIComponent(specialty)}`);
    setShowModal(false);
  };

  const handleSearchInputClick = () => {
    setShowModal(true);
  };

  const filteredSpecialties = specialties.filter((spec) =>
    spec.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  return (
    <div className="home-page">
      {/* Banner Section - Top third of screen */}
      <div className="banner-section">
        <div className="banner-image">
          <div className="banner-overlay">
            <h1 className="banner-title">MedLink</h1>
            <p className="banner-tagline">Your Health, Connected</p>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="main-content-wrapper">
        <div className="content-container">
          {/* Left Side - Clinic Information (5.5 units) */}
          <div className="clinic-info-section">
            <div className="clinic-header">
              <h2>MedLink Clinic</h2>
            </div>
            <div className="clinic-details">
              <div className="info-item">
                <span className="info-label">📍 Address:</span>
                <span className="info-value">
                  123 Health Street, Medical District, City, State 12345
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">📞 Contact:</span>
                <span className="info-value">(555) 123-4567</span>
              </div>
              <div className="info-item">
                <span className="info-label">⏰ Hours:</span>
                <span className="info-value">Mon-Fri: 8AM-6PM, Sat: 9AM-2PM</span>
              </div>
            </div>

            <div className="online-services">
              <h3>Online Services Available</h3>
              <ul>
                <li>Virtual consultations</li>
                <li>Online appointment booking</li>
                <li>Prescription management</li>
                <li>Medical record access</li>
                <li>Secure messaging with providers</li>
              </ul>
            </div>

            <div className="clinic-tagline">
              <p>
                Quality healthcare services tailored to your needs. Book your
                appointment today and experience compassionate, professional
                medical care.
              </p>
            </div>
          </div>

          {/* Right Side - Fixed Booking Box (3.5 units) */}
          <div className="booking-box-container">
            <div className="booking-box">
              <h3 className="booking-title">Book an Appointment</h3>
              <form onSubmit={handleSearch} className="booking-search-form">
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
              </form>

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

  return (
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
    </div>
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

export default Home;


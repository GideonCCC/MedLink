import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { apiClient } from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import Icon from '../Shared/Icon';
import './Home.css';

const services = [
  { id: 'primary', name: 'Primary Care', icon: 'stethoscope' },
  { id: 'urgent', name: 'Urgent Care', icon: 'siren' },
  { id: 'covid', name: 'COVID Care', icon: 'shieldPlus' },
  { id: 'cold-flu', name: 'Cold, Flu & COVID Testing', icon: 'thermometer' },
  { id: 'workplace', name: 'Workplace Health', icon: 'briefcase' },
  { id: 'injury', name: 'Injury', icon: 'bandage' },
];

const onlineServices = [
  {
    icon: 'video',
    title: 'Virtual consultations',
    description: 'Meet with a provider by video from the comfort of home.',
  },
  {
    icon: 'calendarCheck',
    title: 'Online appointment booking',
    description: 'See open time slots in real time and book instantly.',
  },
  {
    icon: 'pill',
    title: 'Prescription management',
    description: 'Request refills and keep track of your medications.',
  },
  {
    icon: 'fileText',
    title: 'Medical record access',
    description: 'Review your visit history and notes whenever you need.',
  },
  {
    icon: 'message',
    title: 'Secure messaging',
    description: 'Ask your care team follow-up questions privately.',
  },
];

const clinicInfo = [
  {
    icon: 'mapPin',
    label: 'Address',
    value: '123 Health Street, Medical District, City, State 12345',
  },
  { icon: 'phone', label: 'Contact', value: '(555) 123-4567' },
  { icon: 'clock', label: 'Hours', value: 'Mon–Fri: 8AM–6PM · Sat: 9AM–2PM' },
];

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [matchingDoctors, setMatchingDoctors] = useState([]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    loadSpecialties();
  }, []);

  useEffect(() => {
    // Debounce search for both doctors and specialties
    const timeoutId = setTimeout(() => {
      const query = modalSearchQuery.trim();
      if (query.length >= 2) {
        loadMatchingDoctors(query);
      } else {
        setMatchingDoctors([]);
        setShowDoctorDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [modalSearchQuery]);

  async function loadMatchingDoctors(query) {
    try {
      setLoadingDoctors(true);
      const data = await apiClient(`/api/doctors?name=${encodeURIComponent(query)}`);
      
      // Sort doctors by relevance to the query
      const sortedDoctors = sortDoctorsByRelevance(data, query);
      setMatchingDoctors(sortedDoctors);
      
      // Note: Dropdown visibility is controlled by both doctors and specialties
      // The actual display logic is in the SearchModal component
    } catch (err) {
      console.error('Failed to load doctors:', err);
      setMatchingDoctors([]);
      setShowDoctorDropdown(false);
    } finally {
      setLoadingDoctors(false);
    }
  }

  function sortDoctorsByRelevance(doctors, query) {
    const lowerQuery = query.toLowerCase().trim();
    
    // Filter to only doctors whose name contains the query (case-insensitive)
    const matchingDoctors = doctors.filter((doctor) => {
      const name = doctor.name.toLowerCase();
      // Remove "Dr. " prefix for matching
      const cleanName = name.replace(/^dr\.\s*/i, '').trim();
      return cleanName.includes(lowerQuery);
    });
    
    // Sort by exact match position
    return matchingDoctors.sort((a, b) => {
      const nameA = a.name.toLowerCase().replace(/^dr\.\s*/i, '').trim();
      const nameB = b.name.toLowerCase().replace(/^dr\.\s*/i, '').trim();
      
      // Find the position of the query in each name
      const indexA = nameA.indexOf(lowerQuery);
      const indexB = nameB.indexOf(lowerQuery);
      
      // Both should have matches (we filtered above), but just in case
      if (indexA === -1 && indexB === -1) return nameA.localeCompare(nameB);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      // Sort by position (earlier match is better)
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      
      // If same position, sort alphabetically
      return nameA.localeCompare(nameB);
    });
  }

  async function loadSpecialties() {
    try {
      const data = await apiClient('/api/doctors/specialties');
      // Remove duplicates (case-insensitive) and filter out null/empty values
      if (!data || !Array.isArray(data)) {
        console.error('Invalid specialties data:', data);
        setSpecialties([]);
        return;
      }
      
      const uniqueSpecialties = Array.from(
        new Map(
          data
            .filter((spec) => spec && typeof spec === 'string' && spec.trim())
            .map((spec) => [spec.toLowerCase().trim(), spec.trim()])
        ).values()
      );
      
      setSpecialties(uniqueSpecialties);
    } catch (err) {
      console.error('Failed to load specialties:', err);
      setSpecialties([]);
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
      const query = modalSearchQuery.trim();
      // Check if the query matches a specialty
      const isSpecialty = specialties.some(
        (spec) => spec.toLowerCase() === query.toLowerCase()
      );
      
      if (isSpecialty) {
        navigate(`/doctors?specialty=${encodeURIComponent(query)}`);
      } else if (matchingDoctors.length === 1) {
        // If exactly one doctor matches, go directly to their schedule
        navigate(`/doctors/${matchingDoctors[0].id}/schedule`);
      } else {
        // If not a specialty, search by doctor name
        navigate(`/doctors?name=${encodeURIComponent(query)}`);
      }
      setShowModal(false);
    }
  };

  const handleDoctorSelect = (doctorId) => {
    navigate(`/doctors/${doctorId}/schedule`);
    setShowModal(false);
    setShowDoctorDropdown(false);
  };

  const handleSpecialtyClick = (specialty) => {
    navigate(`/doctors?specialty=${encodeURIComponent(specialty)}`);
    setShowModal(false);
  };

  const handleSearchInputClick = () => {
    setShowModal(true);
  };

  // Arrow key navigation for keyboard accessibility
  useEffect(() => {
    const handleArrowKeyNavigation = (e) => {
      // Only handle arrow keys if not in a modal or input field
      if (showModal) return;
      
      // Don't interfere if user is typing in an input
      if (e.target.tagName === 'INPUT' && e.target.type === 'text' && !e.target.readOnly) {
        return;
      }
      
      // Get all focusable elements on the page (navbar + booking box)
      const focusableSelectors = 'input, button, [href], [tabindex]:not([tabindex="-1"])';
      
      // Get navbar elements
      const navbar = document.querySelector('.navbar');
      const navbarElements = navbar ? Array.from(navbar.querySelectorAll(focusableSelectors)) : [];
      
      // Get booking box elements
      const bookingBox = document.querySelector('.booking-box');
      const bookingElements = bookingBox ? Array.from(bookingBox.querySelectorAll(focusableSelectors)) : [];
      
      // Combine all focusable elements in order: navbar first, then booking box
      const allFocusableElements = [
        ...navbarElements,
        ...bookingElements
      ].filter(el => {
        // Filter out disabled or hidden elements
        return el.offsetParent !== null && 
               !el.disabled && 
               !el.hasAttribute('aria-hidden') &&
               window.getComputedStyle(el).visibility !== 'hidden';
      });
      
      if (allFocusableElements.length === 0) return;
      
      const currentIndex = allFocusableElements.findIndex(
        el => el === document.activeElement
      );
      
      // If no element is focused, focus the first one on ArrowDown
      if (currentIndex === -1) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          allFocusableElements[0]?.focus();
        }
        return;
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < allFocusableElements.length - 1 
          ? currentIndex + 1 
          : 0;
        allFocusableElements[nextIndex]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 
          ? currentIndex - 1 
          : allFocusableElements.length - 1;
        allFocusableElements[prevIndex]?.focus();
      }
    };
    
    document.addEventListener('keydown', handleArrowKeyNavigation);
    return () => {
      document.removeEventListener('keydown', handleArrowKeyNavigation);
    };
  }, [showModal]);

  const filteredSpecialties = React.useMemo(() => {
    const lowerQuery = modalSearchQuery.toLowerCase().trim();
    
    // Get unique specialties (case-insensitive)
    const uniqueSpecialties = Array.from(
      new Map(
        specialties.map((spec) => [spec.toLowerCase(), spec])
      ).values()
    );
    
    // If no search query, return all specialties
    if (!lowerQuery) {
      return uniqueSpecialties.sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
      );
    }
    
    // Filter and sort by exact character matching
    return uniqueSpecialties
      .filter((spec) => spec.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        const specA = a.toLowerCase();
        const specB = b.toLowerCase();
        
        // Find the position of the query in each specialty
        const indexA = specA.indexOf(lowerQuery);
        const indexB = specB.indexOf(lowerQuery);
        
        // If one has a match and the other doesn't, prioritize the one with match
        if (indexA !== -1 && indexB === -1) return -1;
        if (indexA === -1 && indexB !== -1) return 1;
        
        // If both have matches, sort by position (earlier match is better)
        if (indexA !== -1 && indexB !== -1) {
          if (indexA !== indexB) {
            return indexA - indexB;
          }
        }
        
        // If same position or both no match, sort alphabetically
        return specA.localeCompare(specB);
      })
      .slice(0, 5); // Limit to top 5 specialties when searching
  }, [specialties, modalSearchQuery]);

  return (
    <div className="home-page">
      <header className="hero" role="banner">
        <div className="hero-glow hero-glow-1" aria-hidden="true" />
        <div className="hero-glow hero-glow-2" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <Icon name="sparkles" size={16} />
              Online booking now available
            </span>
            <h1 className="hero-title">
              Care that fits <span className="hero-highlight">your schedule</span>
            </h1>
            <p className="hero-subtitle">
              Find the right doctor, see real-time availability, and book a visit
              at MedLink Clinic in under a minute.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="home-btn home-btn-primary"
                onClick={handleSearchInputClick}
              >
                Find a doctor
                <Icon name="arrowRight" size={18} />
              </button>
              <button
                type="button"
                className="home-btn home-btn-secondary"
                onClick={() =>
                  navigate(
                    !user
                      ? '/login'
                      : user.role === 'doctor'
                        ? '/doctor/availability'
                        : '/patient/dashboard'
                  )
                }
              >
                {user ? 'Go to my dashboard' : 'Sign in to manage visits'}
              </button>
            </div>
            <ul className="hero-trust">
              <li>
                <Icon name="shieldCheck" size={18} />
                Secure &amp; private
              </li>
              <li>
                <Icon name="calendarCheck" size={18} />
                No double-booking
              </li>
              <li>
                <Icon name="clock" size={18} />
                Real-time availability
              </li>
            </ul>
          </div>

          <div className="booking-box-container">
            <div className="booking-box">
              <h2 className="booking-title">Book an appointment</h2>
              <p className="booking-subtitle">What brings you in today?</p>
              <form onSubmit={handleSearch} className="booking-search-form">
                <div className="search-input-wrapper" onClick={handleSearchInputClick}>
                  <Icon name="search" size={18} className="search-leading-icon" />
                  <input
                    type="text"
                    id="home-search-input"
                    name="home-search"
                    placeholder="Search doctors or specialties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    readOnly
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchInputClick();
                      }
                    }}
                    tabIndex={0}
                  />
                  <button 
                    type="button" 
                    className="search-icon-button" 
                    aria-label="Search"
                    onClick={handleSearchInputClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSearchInputClick();
                      }
                    }}
                    tabIndex={0}
                  >
                    Search
                  </button>
                </div>
              </form>

              <div className="common-reasons">
                <p className="reasons-label">Common reasons for a visit</p>
                <div className="reasons-list">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      className="reason-item"
                      onClick={() => handleServiceClick(service.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleServiceClick(service.id);
                        }
                      }}
                      tabIndex={0}
                    >
                      <span className="reason-icon-wrapper">
                        <Icon name={service.icon} size={18} />
                      </span>
                      <span className="reason-name">{service.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="home-main" role="main">
        <section className="home-section" aria-labelledby="services-heading">
          <div className="section-header">
            <span className="section-eyebrow">Online services</span>
            <h2 id="services-heading">Everything you need, in one place</h2>
            <p>
              Quality healthcare services tailored to your needs. Book your
              appointment today and experience compassionate, professional
              medical care.
            </p>
          </div>
          <div className="feature-grid">
            {onlineServices.map((service) => (
              <div key={service.title} className="feature-card">
                <span className="feature-icon">
                  <Icon name={service.icon} size={22} />
                </span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section" aria-labelledby="clinic-heading">
          <div className="clinic-card">
            <div className="clinic-card-copy">
              <span className="section-eyebrow section-eyebrow-light">Visit us</span>
              <h2 id="clinic-heading">MedLink Clinic</h2>
              <p>
                In-person and virtual care from a team that puts you first.
              </p>
            </div>
            <div className="clinic-info-grid">
              {clinicInfo.map((item) => (
                <div key={item.label} className="clinic-info-item">
                  <span className="clinic-info-icon">
                    <Icon name={item.icon} size={20} />
                  </span>
                  <div>
                    <div className="clinic-info-label">{item.label}</div>
                    <div className="clinic-info-value">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        © {new Date().getFullYear()} MedLink Clinic · Your Health, Connected
      </footer>

      {/* Search Modal */}
      {showModal && (
        <SearchModal
          onClose={() => {
            setShowModal(false);
            setShowDoctorDropdown(false);
            setMatchingDoctors([]);
            setModalSearchQuery('');
          }}
          searchQuery={modalSearchQuery}
          onSearchChange={(value) => {
            setModalSearchQuery(value);
          }}
          onSearchSubmit={handleModalSearch}
          specialties={filteredSpecialties}
          onSpecialtyClick={handleSpecialtyClick}
          matchingDoctors={matchingDoctors}
          showDoctorDropdown={showDoctorDropdown}
          setShowDoctorDropdown={setShowDoctorDropdown}
          onDoctorSelect={handleDoctorSelect}
          loadingDoctors={loadingDoctors}
          filteredSpecialties={filteredSpecialties}
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
  matchingDoctors,
  showDoctorDropdown,
  setShowDoctorDropdown,
  onDoctorSelect,
  loadingDoctors,
  filteredSpecialties,
}) {
  const modalRef = React.useRef(null);
  const firstFocusableRef = React.useRef(null);
  const searchContainerRef = React.useRef(null);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Focus the modal when it opens
    if (modalRef.current) {
      modalRef.current.focus();
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (
        showDoctorDropdown &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setShowDoctorDropdown(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, showDoctorDropdown]);

  const handleKeyDown = (e) => {
    // Trap focus within modal
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
    }
  };

  return (
    <div
      className="search-modal-overlay"
      onClick={onClose}
      role="presentation"
      aria-hidden="false"
    >
      <div
        className="search-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close search modal"
          ref={firstFocusableRef}
        >
          <Icon name="x" size={20} />
        </button>
        <h2 id="modal-title" className="modal-title">
          What brings you in?
        </h2>
        
        <form onSubmit={onSearchSubmit} className="modal-search-form">
          <div className="modal-search-wrapper">
            <div className="search-input-container" ref={searchContainerRef}>
              <input
                type="text"
                id="modal-search-input"
                name="modal-search"
                placeholder="Search for doctors or specialties..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="modal-search-input"
                autoFocus
                onFocus={() => {
                  if (matchingDoctors.length > 0) {
                    setShowDoctorDropdown(true);
                  }
                }}
              />
              {loadingDoctors && (
                <span className="search-loading">Loading...</span>
              )}
              {matchingDoctors.length > 0 && (
                <div className="doctor-dropdown">
                  <div className="dropdown-section-header">Doctors</div>
                  {matchingDoctors.map((doctor) => (
                    <button
                      key={doctor.id}
                      type="button"
                      className="doctor-dropdown-item"
                      onClick={() => onDoctorSelect(doctor.id)}
                    >
                      <div className="doctor-dropdown-name">{doctor.name}</div>
                      <div className="doctor-dropdown-specialty">
                        {doctor.specialty || 'General Practice'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="modal-search-button" aria-label="Search">
              <Icon name="search" size={20} />
            </button>
          </div>
        </form>

        <div className="specialties-dropdown">
          <p className="specialties-label">All Specialties We Provide:</p>
          <div className="specialties-list">
            {specialties.length === 0 ? (
              <div className="no-specialties">No specialties found</div>
            ) : (
              specialties
                .filter((spec, index, self) => 
                  // Remove duplicates (case-insensitive)
                  index === self.findIndex((s) => s.toLowerCase() === spec.toLowerCase())
                )
                .map((specialty) => (
                  <button
                    key={specialty}
                    className="specialty-item"
                    onClick={() => onSpecialtyClick(specialty)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSpecialtyClick(specialty);
                      }
                    }}
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
  matchingDoctors: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      specialty: PropTypes.string,
    })
  ),
  showDoctorDropdown: PropTypes.bool,
  setShowDoctorDropdown: PropTypes.func,
  onDoctorSelect: PropTypes.func,
  loadingDoctors: PropTypes.bool,
  filteredSpecialties: PropTypes.arrayOf(PropTypes.string),
};

export default Home;


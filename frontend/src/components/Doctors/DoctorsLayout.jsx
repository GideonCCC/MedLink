import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import './DoctorsLayout.css';

function DoctorsLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);

  function handleLogoutClick() {
    setShowLogoutConfirm(true);
  }

  function handleLogoutConfirm() {
    logout();
    navigate('/');
  }

  function handleLogoutCancel() {
    setShowLogoutConfirm(false);
  }

  function isActive(path) {
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
  }

  // Initial focus: focus on first sidebar item
  useEffect(() => {
    if (sidebarRef.current) {
      const firstNavItem = sidebarRef.current.querySelector('.sidebar-nav-item');
      if (firstNavItem) {
        setTimeout(() => {
          firstNavItem.focus();
        }, 100);
      }
    }
  }, [location.pathname]);

  // Keyboard navigation between sidebar and content
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      // Don't interfere if a modal is open
      if (showLogoutConfirm) {
        return;
      }

      // FIRST: If Enter/Space key on a button in sidebar, let button handle it - don't interfere at all
      // Check both e.target and document.activeElement to be safe
      // We need to check this in capture phase before any other processing
      if (e.key === 'Enter' || e.key === ' ') {
        // Check if the target or activeElement is a logout button
        const isLogoutButton = (e.target.tagName === 'BUTTON' && 
                               e.target.classList.contains('sidebar-logout')) ||
                              (document.activeElement?.tagName === 'BUTTON' && 
                               document.activeElement.classList.contains('sidebar-logout'));
        
        if (isLogoutButton && sidebarRef.current?.contains(e.target || document.activeElement)) {
          // Don't do anything - let the button's onKeyDown handle it in bubble phase
          return;
        }
      }

      // Re-check sidebar/content state using activeElement (not e.target) for accurate state
      // Use both e.target and document.activeElement to be safe
      const activeElement = document.activeElement;
      const currentIsInSidebar = sidebarRef.current?.contains(activeElement) || 
                                  (e.target && sidebarRef.current?.contains(e.target));
      const currentIsInContent = contentRef.current?.contains(activeElement);

      // Handle arrow keys in sidebar FIRST
      if (
        (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
        currentIsInSidebar
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const navItems = Array.from(
          sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
        ).filter(el => {
          return el.offsetParent !== null && 
                 !el.disabled && 
                 !el.hasAttribute('aria-hidden') &&
                 window.getComputedStyle(el).visibility !== 'hidden';
        });

        if (navItems.length === 0) return;

        const activeElement = document.activeElement;
        const currentIndex = navItems.findIndex(el => el === activeElement);
        
        if (currentIndex === -1) {
          // No item focused, focus first or last
          if (e.key === 'ArrowDown') {
            navItems[0]?.focus();
          } else if (e.key === 'ArrowUp') {
            navItems[navItems.length - 1]?.focus();
          }
          return;
        }

        if (e.key === 'ArrowDown') {
          const nextIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
          navItems[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp') {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
          navItems[prevIndex]?.focus();
        }
        return;
      }

      // Don't interfere with input fields, selects, or textareas
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // ESC: move focus from content to sidebar
      if (e.key === 'Escape') {
        const activeElement = document.activeElement;
        if (contentRef.current && contentRef.current.contains(activeElement)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const firstNavItem = sidebarRef.current?.querySelector('.sidebar-nav-item');
          if (firstNavItem) {
            // Use setTimeout to ensure focus is set after event processing
            setTimeout(() => {
              firstNavItem.focus();
              // Ensure the item is actually focused
              if (document.activeElement !== firstNavItem) {
                firstNavItem.focus();
              }
            }, 0);
          }
        }
        return;
      }

      // Enter in sidebar: navigate to page and focus first element in content
      // BUT: if it's a button (Logout), skip this entirely to let button's onKeyDownCapture handle it
      if (e.key === 'Enter' && sidebarRef.current?.contains(e.target)) {
        // Check if it's a button FIRST - if so, don't handle it at all
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'BUTTON' && activeElement.classList.contains('sidebar-nav-item')) {
          // Don't preventDefault or stopPropagation - let the button's onKeyDownCapture handle it
          return;
        }
        
        const navItem = e.target.closest('.sidebar-nav-item');
        if (navItem) {
          // For links, get the href and navigate explicitly
          if (navItem.tagName === 'A') {
            e.preventDefault();
            e.stopPropagation();
            const href = navItem.getAttribute('href');
            if (href) {
              navigate(href);
              setTimeout(() => {
                const firstFocusable = contentRef.current?.querySelector(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (firstFocusable) {
                  firstFocusable.focus();
                }
              }, 100);
            }
          }
        }
        return;
      }
      
      // Space key: same as Enter for sidebar navigation (but skip buttons)
      if (e.key === ' ' && sidebarRef.current?.contains(e.target)) {
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'BUTTON' && activeElement.classList.contains('sidebar-nav-item')) {
          // Don't handle - let button handle it
          return;
        }
        
        const navItem = e.target.closest('.sidebar-nav-item');
        if (navItem) {
          e.preventDefault();
          e.stopPropagation();
          const href = navItem.getAttribute('href');
          if (href) {
            navigate(href);
            setTimeout(() => {
              const firstFocusable = contentRef.current?.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              );
              if (firstFocusable) {
                firstFocusable.focus();
              }
            }, 100);
          }
        }
        return;
      }


      // Arrow keys in content: delegate to content's own navigation (NOT back to sidebar)
      if (
        (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        isInContent
      ) {
        // Let content handle its own navigation
        return;
      }
    };

    // Use capture phase to handle events early
    // But for button Enter keys, we return early to let button's onKeyDown handle it
    document.addEventListener('keydown', handleKeyNavigation, true);
    return () => {
      document.removeEventListener('keydown', handleKeyNavigation, true);
    };
  }, [navigate, location.pathname, showLogoutConfirm]);

  return (
    <div className="main-layout">
      {/* Brand name at top left */}
      <div className="doctor-brand">
        <Link to="/doctor/availability" className="brand-link">
          MedLink
        </Link>
      </div>
      <div className="doctor-layout">
        <div 
          className="doctor-menu-bar"
          ref={sidebarRef}
        >
          <div className="sidebar-welcome">
            <div className="welcome-text">Welcome back</div>
            <div className="user-name">{user?.name || 'User'}</div>
          </div>
          <nav className="sidebar-nav">
            <Link
              to="/doctor/availability"
              className={`sidebar-nav-item ${isActive('/doctor/availability') ? 'active' : ''}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopImmediatePropagation(); // Stop all other listeners FIRST
                  e.stopPropagation();
                  
                  const navItems = Array.from(
                    sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
                  ).filter(el => {
                    return el.offsetParent !== null && 
                           !el.disabled && 
                           !el.hasAttribute('aria-hidden') &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  });

                  // Use e.currentTarget (the Link/button itself) instead of e.target
                  const currentItem = e.currentTarget;
                  const currentIndex = navItems.indexOf(currentItem);
                  
                  if (currentIndex === -1) {
                    // If not found, focus first or last
                    if (e.key === 'ArrowDown') {
                      navItems[0]?.focus();
                    } else if (e.key === 'ArrowUp') {
                      navItems[navItems.length - 1]?.focus();
                    }
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    const nextIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
                    navItems[nextIndex]?.focus();
                  } else if (e.key === 'ArrowUp') {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
                    navItems[prevIndex]?.focus();
                  }
                }
              }}
            >
              Availability
            </Link>
            <Link
              to="/doctor/upcoming-appointments"
              className={`sidebar-nav-item ${isActive('/doctor/upcoming-appointments') ? 'active' : ''}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopImmediatePropagation(); // Stop all other listeners FIRST
                  e.stopPropagation();
                  
                  const navItems = Array.from(
                    sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
                  ).filter(el => {
                    return el.offsetParent !== null && 
                           !el.disabled && 
                           !el.hasAttribute('aria-hidden') &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  });

                  // Use e.currentTarget (the Link/button itself) instead of e.target
                  const currentItem = e.currentTarget;
                  const currentIndex = navItems.indexOf(currentItem);
                  
                  if (currentIndex === -1) {
                    // If not found, focus first or last
                    if (e.key === 'ArrowDown') {
                      navItems[0]?.focus();
                    } else if (e.key === 'ArrowUp') {
                      navItems[navItems.length - 1]?.focus();
                    }
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    const nextIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
                    navItems[nextIndex]?.focus();
                  } else if (e.key === 'ArrowUp') {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
                    navItems[prevIndex]?.focus();
                  }
                }
              }}
            >
              Upcoming Appointments
            </Link>
            <Link
              to="/doctor/past-appointments"
              className={`sidebar-nav-item ${isActive('/doctor/past-appointments') ? 'active' : ''}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopImmediatePropagation(); // Stop all other listeners FIRST
                  e.stopPropagation();
                  
                  const navItems = Array.from(
                    sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
                  ).filter(el => {
                    return el.offsetParent !== null && 
                           !el.disabled && 
                           !el.hasAttribute('aria-hidden') &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  });

                  // Use e.currentTarget (the Link/button itself) instead of e.target
                  const currentItem = e.currentTarget;
                  const currentIndex = navItems.indexOf(currentItem);
                  
                  if (currentIndex === -1) {
                    // If not found, focus first or last
                    if (e.key === 'ArrowDown') {
                      navItems[0]?.focus();
                    } else if (e.key === 'ArrowUp') {
                      navItems[navItems.length - 1]?.focus();
                    }
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    const nextIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
                    navItems[nextIndex]?.focus();
                  } else if (e.key === 'ArrowUp') {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
                    navItems[prevIndex]?.focus();
                  }
                }
              }}
            >
              Past Appointments
            </Link>
            <button
              onClick={handleLogoutClick}
              className="sidebar-nav-item sidebar-logout"
              type="button"
              tabIndex={0}
              onKeyDown={(e) => {
                // Handle Enter/Space to trigger logout
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  // Use native event's stopImmediatePropagation if available
                  if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                    e.nativeEvent.stopImmediatePropagation();
                  }
                  handleLogoutClick();
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  // Handle arrow keys for navigation
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                    e.nativeEvent.stopImmediatePropagation();
                  }
                  
                  const navItems = Array.from(
                    sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
                  ).filter(el => {
                    return el.offsetParent !== null && 
                           !el.disabled && 
                           !el.hasAttribute('aria-hidden') &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  });

                  const currentIndex = navItems.indexOf(e.target);
                  if (e.key === 'ArrowDown') {
                    const nextIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
                    navItems[nextIndex]?.focus();
                  } else if (e.key === 'ArrowUp') {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
                    navItems[prevIndex]?.focus();
                  }
                }
              }}
            >
              Logout
            </button>
          </nav>
        </div>
            <main className="doctor-content" role="main" ref={contentRef}>{children}</main>
      </div>

      {showLogoutConfirm && (
        <LogoutConfirmModal
          onConfirm={handleLogoutConfirm}
          onDismiss={handleLogoutCancel}
        />
      )}
    </div>
  );
}

function LogoutConfirmModal({ onConfirm, onDismiss }) {
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const sidebarRef = useRef(null);

  // Get sidebar reference from parent
  useEffect(() => {
    sidebarRef.current = document.querySelector('.doctor-menu-bar');
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Focus the first focusable element when modal opens
    setTimeout(() => {
      if (firstFocusableRef.current) {
        firstFocusableRef.current.focus();
      } else if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 100);
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Close modal and return focus to sidebar
        onDismiss();
        setTimeout(() => {
          const sidebar = document.querySelector('.doctor-menu-bar');
          const logoutButton = sidebar?.querySelector('.sidebar-logout');
          if (logoutButton) {
            logoutButton.focus();
          } else {
            const firstSidebarItem = sidebar?.querySelector('.sidebar-nav-item');
            if (firstSidebarItem) {
              firstSidebarItem.focus();
            }
          }
        }, 100);
      }
    };

    // Use capture phase to ensure we handle ESC before other listeners
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [onDismiss]);

  const handleKeyDown = (e) => {
    // Arrow keys: navigate between buttons (handle this first, before stopPropagation)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Only handle if the event is coming from within the modal
      if (!modalRef.current?.contains(e.target)) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        const currentIndex = Array.from(focusableElements).findIndex(
          el => el === document.activeElement
        );
        
        if (currentIndex !== -1) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
            focusableElements[nextIndex]?.focus();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
            focusableElements[prevIndex]?.focus();
          }
        } else {
          // If no button is focused, focus the first one
          focusableElements[0]?.focus();
        }
      }
      return;
    }
    
    // Stop propagation to prevent other listeners from interfering (for other keys)
    e.stopPropagation();
    
    // Tab key: trap focus within modal
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
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onDismiss}
      role="presentation"
      aria-hidden="false"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        aria-describedby="logout-modal-description"
        tabIndex={-1}
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <h3 id="logout-modal-title">Logout?</h3>
        <p id="logout-modal-description">
          Are you sure you want to logout? You will need to login again to access your account.
        </p>
        <div className="modal-actions">
          <button
            onClick={onDismiss}
            className="modal-cancel-button"
            aria-label="Stay logged in"
            ref={firstFocusableRef}
            tabIndex={0}
            onKeyDown={(e) => {
              // Handle Enter/Space
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onDismiss();
                return;
              }
              // Handle arrow keys directly
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                const focusableElements = modalRef.current?.querySelectorAll(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements && focusableElements.length > 0) {
                  const currentIndex = Array.from(focusableElements).findIndex(
                    el => el === document.activeElement
                  );
                  if (currentIndex !== -1) {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                      const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
                      focusableElements[nextIndex]?.focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
                      focusableElements[prevIndex]?.focus();
                    }
                  }
                }
              }
            }}
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="modal-confirm-button"
            aria-label="Logout"
            tabIndex={0}
            onKeyDown={(e) => {
              // Handle Enter/Space
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onConfirm();
                return;
              }
              // Handle arrow keys directly
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                const focusableElements = modalRef.current?.querySelectorAll(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements && focusableElements.length > 0) {
                  const currentIndex = Array.from(focusableElements).findIndex(
                    el => el === document.activeElement
                  );
                  if (currentIndex !== -1) {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                      const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
                      focusableElements[nextIndex]?.focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
                      focusableElements[prevIndex]?.focus();
                    }
                  }
                }
              }
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

LogoutConfirmModal.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

DoctorsLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DoctorsLayout;

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import './PatientLayout.css';

function PatientLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);
  const isFromBookingRef = useRef(false);

  // Check if coming from booking appointment (via location.state or URL params)
  useEffect(() => {
    const fromBooking = location.state?.fromBooking || 
                        location.search.includes('fromBooking') ||
                        document.referrer.includes('/doctors') ||
                        document.referrer.includes('/patient/appointments/new');
    isFromBookingRef.current = fromBooking;
    
    // If coming from booking, focus on content area immediately
    if (fromBooking && contentRef.current) {
      setTimeout(() => {
        const firstFocusable = contentRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);
    } else {
      // Otherwise, focus on sidebar first
      setTimeout(() => {
        const firstSidebarItem = sidebarRef.current?.querySelector('.sidebar-nav-item');
        if (firstSidebarItem) {
          firstSidebarItem.focus();
        }
      }, 100);
    }
  }, [location]);

  // Keyboard navigation between sidebar and content
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      // Don't interfere if a modal is open - let the modal handle its own keyboard events
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

      // Check if focus is in sidebar FIRST, before any other checks
      // Use both e.target and document.activeElement to be safe
      const activeElement = document.activeElement;
      const isInSidebar = sidebarRef.current?.contains(activeElement) || 
                          (e.target && sidebarRef.current?.contains(e.target));
      const isInContent = contentRef.current?.contains(activeElement);

      // Handle arrow keys in sidebar FIRST
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && isInSidebar) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const sidebarItems = Array.from(
          sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
        ).filter(el => {
          return el.offsetParent !== null && 
                 !el.disabled && 
                 !el.hasAttribute('aria-hidden') &&
                 window.getComputedStyle(el).visibility !== 'hidden';
        });

        if (sidebarItems.length === 0) return;

        const activeElement = document.activeElement;
        const currentIndex = sidebarItems.findIndex(el => el === activeElement);
        
        if (currentIndex === -1) {
          // No item focused, focus first or last
          if (e.key === 'ArrowDown') {
            sidebarItems[0]?.focus();
          } else if (e.key === 'ArrowUp') {
            sidebarItems[sidebarItems.length - 1]?.focus();
          }
          return;
        }

        if (e.key === 'ArrowDown') {
          const nextIndex = currentIndex < sidebarItems.length - 1 ? currentIndex + 1 : 0;
          sidebarItems[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp') {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : sidebarItems.length - 1;
          sidebarItems[prevIndex]?.focus();
        }
        return;
      }

      // Don't interfere if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // ESC key: jump back to sidebar from content
      if (e.key === 'Escape' && isInContent && !isInSidebar) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const firstSidebarItem = sidebarRef.current?.querySelector('.sidebar-nav-item');
        if (firstSidebarItem) {
          // Use setTimeout to ensure focus is set after event processing
          setTimeout(() => {
            firstSidebarItem.focus();
            // Ensure the item is actually focused
            if (document.activeElement !== firstSidebarItem) {
              firstSidebarItem.focus();
            }
          }, 0);
        }
        return;
      }

      // Enter key: navigate from sidebar to content (only for sidebar items)
      // BUT: if it's a button (Logout), skip this entirely to let button's onKeyDownCapture handle it
      if (e.key === 'Enter' && isInSidebar && !isInContent) {
        // Check if it's a button FIRST - if so, don't handle it at all
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'BUTTON' && activeElement.classList.contains('sidebar-nav-item')) {
          // Don't preventDefault or stopPropagation - let the button's onKeyDownCapture handle it
          return;
        }
        
        // For links, get the href and navigate explicitly
        if (activeElement.classList.contains('sidebar-nav-item') && activeElement.tagName === 'A') {
          e.preventDefault();
          e.stopPropagation();
          const href = activeElement.getAttribute('href');
          if (href) {
            navigate(href);
            // Wait for navigation to complete, then focus content
            setTimeout(() => {
              const firstFocusable = contentRef.current?.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              );
              if (firstFocusable) {
                firstFocusable.focus();
              }
            }, 200);
          }
        }
        return;
      }
      
      // Space key: same as Enter for sidebar navigation (but skip buttons)
      if (e.key === ' ' && isInSidebar && !isInContent) {
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'BUTTON' && activeElement.classList.contains('sidebar-nav-item')) {
          // Don't handle - let button handle it
          return;
        }
        
        if (activeElement.classList.contains('sidebar-nav-item') && activeElement.tagName === 'A') {
          e.preventDefault();
          e.stopPropagation();
          const href = activeElement.getAttribute('href');
          if (href) {
            navigate(href);
            setTimeout(() => {
              const firstFocusable = contentRef.current?.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              );
              if (firstFocusable) {
                firstFocusable.focus();
              }
            }, 200);
          }
        }
        return;
      }

      // Enter key in content area: move to next field/button (except for buttons/links)
      if (e.key === 'Enter' && isInContent && !isInSidebar) {
        const currentElement = document.activeElement;
        const isInput = currentElement.tagName === 'INPUT' || currentElement.tagName === 'SELECT' || currentElement.tagName === 'TEXTAREA';
        
        if (isInput) {
          const allFocusableElements = Array.from(
            contentRef.current?.querySelectorAll(focusableSelectors) || []
          ).filter(el => {
            return el.offsetParent !== null && 
                   !el.disabled && 
                   !el.hasAttribute('aria-hidden') &&
                   window.getComputedStyle(el).visibility !== 'hidden';
          });

          const currentIndex = allFocusableElements.findIndex(
            el => el === document.activeElement
          );

          if (currentIndex !== -1) {
            e.preventDefault();
            const nextIndex = currentIndex < allFocusableElements.length - 1 
              ? currentIndex + 1 
              : 0;
            allFocusableElements[nextIndex]?.focus();
            return;
          }
        }
        // For buttons and links, let default behavior handle it (trigger action)
        return;
      }

      // Arrow keys in content: let content handle its own navigation
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && isInContent && !isInSidebar) {
        // Let content handle its own arrow key navigation
        return;
      }
      
      // Left/Right arrow keys: only for content's own navigation, NOT for switching between sidebar and content
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && isInContent) {
        // Let content handle its own navigation
        return;
      }
    };

    // Use capture phase for arrow keys, but let button's onKeyDownCapture handle Enter/Space
    document.addEventListener('keydown', handleKeyNavigation, true);
    return () => {
      document.removeEventListener('keydown', handleKeyNavigation, true);
    };
  }, [navigate, location.pathname, showLogoutConfirm]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  function handleLogoutConfirm() {
    logout();
    navigate('/');
  }

  function handleLogoutCancel() {
    setShowLogoutConfirm(false);
  }

  function isActive(path) {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  return (
    <div className="patient-layout">
      <div className="patient-brand">
        <Link to="/patient/dashboard" className="brand-link">
          MedLink
        </Link>
      </div>

      <div className="patient-layout-body">
        <aside 
          className="patient-sidebar" 
          ref={sidebarRef}
        >
          <div className="sidebar-welcome">
            <div className="welcome-text">Welcome back,</div>
            <div className="user-name">{user?.name || 'User'}</div>
          </div>
          <nav className="sidebar-nav">
            <Link
              to="/patient/dashboard"
              className={`sidebar-nav-item ${isActive('/patient/dashboard') ? 'active' : ''}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopImmediatePropagation(); // Stop all other listeners FIRST
                  e.stopPropagation();
                  
                  const sidebarItems = Array.from(
                    sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
                  ).filter(el => {
                    return el.offsetParent !== null && 
                           !el.disabled && 
                           !el.hasAttribute('aria-hidden') &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  });

                  // Use e.currentTarget (the Link/button itself) instead of e.target
                  const currentItem = e.currentTarget;
                  const currentIndex = sidebarItems.indexOf(currentItem);
                  
                  if (currentIndex === -1) {
                    // If not found, focus first or last
                    if (e.key === 'ArrowDown') {
                      sidebarItems[0]?.focus();
                    } else if (e.key === 'ArrowUp') {
                      sidebarItems[sidebarItems.length - 1]?.focus();
                    }
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    const nextIndex = currentIndex < sidebarItems.length - 1 ? currentIndex + 1 : 0;
                    sidebarItems[nextIndex]?.focus();
                  } else if (e.key === 'ArrowUp') {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sidebarItems.length - 1;
                    sidebarItems[prevIndex]?.focus();
                  }
                }
              }}
            >
              Dashboard
            </Link>
            <Link
              to="/patient/book-visit"
              className={`sidebar-nav-item ${isActive('/patient/book-visit') ? 'active' : ''}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopImmediatePropagation(); // Stop all other listeners FIRST
                  e.stopPropagation();
                  
                  const sidebarItems = Array.from(
                    sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
                  ).filter(el => {
                    return el.offsetParent !== null && 
                           !el.disabled && 
                           !el.hasAttribute('aria-hidden') &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  });

                  // Use e.currentTarget (the Link/button itself) instead of e.target
                  const currentItem = e.currentTarget;
                  const currentIndex = sidebarItems.indexOf(currentItem);
                  
                  if (currentIndex === -1) {
                    // If not found, focus first or last
                    if (e.key === 'ArrowDown') {
                      sidebarItems[0]?.focus();
                    } else if (e.key === 'ArrowUp') {
                      sidebarItems[sidebarItems.length - 1]?.focus();
                    }
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    const nextIndex = currentIndex < sidebarItems.length - 1 ? currentIndex + 1 : 0;
                    sidebarItems[nextIndex]?.focus();
                  } else if (e.key === 'ArrowUp') {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sidebarItems.length - 1;
                    sidebarItems[prevIndex]?.focus();
                  }
                }
              }}
            >
              Book Visit
            </Link>
            <Link
              to="/patient/history"
              className={`sidebar-nav-item ${isActive('/patient/history') ? 'active' : ''}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopImmediatePropagation(); // Stop all other listeners FIRST
                  e.stopPropagation();
                  
                  const sidebarItems = Array.from(
                    sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
                  ).filter(el => {
                    return el.offsetParent !== null && 
                           !el.disabled && 
                           !el.hasAttribute('aria-hidden') &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  });

                  // Use e.currentTarget (the Link/button itself) instead of e.target
                  const currentItem = e.currentTarget;
                  const currentIndex = sidebarItems.indexOf(currentItem);
                  
                  if (currentIndex === -1) {
                    // If not found, focus first or last
                    if (e.key === 'ArrowDown') {
                      sidebarItems[0]?.focus();
                    } else if (e.key === 'ArrowUp') {
                      sidebarItems[sidebarItems.length - 1]?.focus();
                    }
                    return;
                  }

                  if (e.key === 'ArrowDown') {
                    const nextIndex = currentIndex < sidebarItems.length - 1 ? currentIndex + 1 : 0;
                    sidebarItems[nextIndex]?.focus();
                  } else if (e.key === 'ArrowUp') {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sidebarItems.length - 1;
                    sidebarItems[prevIndex]?.focus();
                  }
                }
              }}
            >
              Visit History
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
                  
                  const sidebarItems = Array.from(
                    sidebarRef.current?.querySelectorAll('.sidebar-nav-item') || []
                  ).filter(el => {
                    return el.offsetParent !== null && 
                           !el.disabled && 
                           !el.hasAttribute('aria-hidden') &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                  });

                  const currentIndex = sidebarItems.indexOf(e.target);
                  if (e.key === 'ArrowDown') {
                    const nextIndex = currentIndex < sidebarItems.length - 1 ? currentIndex + 1 : 0;
                    sidebarItems[nextIndex]?.focus();
                  } else if (e.key === 'ArrowUp') {
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sidebarItems.length - 1;
                    sidebarItems[prevIndex]?.focus();
                  }
                }
              }}
            >
              Logout
            </button>
          </nav>
        </aside>

            <main className="patient-content" role="main" ref={contentRef}>{children}</main>
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
    sidebarRef.current = document.querySelector('.patient-sidebar');
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
          const sidebar = document.querySelector('.patient-sidebar');
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

PatientLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PatientLayout;


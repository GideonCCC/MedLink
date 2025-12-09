import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import backgroundImage from './images/Clinic_login.jpg';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('patient');
  const [specialty, setSpecialty] = useState('');
  const [error, setError] = useState('');
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Track user interaction to avoid interfering with autofill
  const userInteractedRef = useRef(false);
  const lastInputValueRef = useRef({});
  const inputInteractionRef = useRef(new Set());

  useEffect(() => {
    if (user) {
      const redirectTo = location.state?.redirectTo;
      if (redirectTo) {
        navigate(redirectTo);
      } else if (user.role === 'patient') {
        navigate('/patient/dashboard');
      } else if (user.role === 'doctor') {
        navigate('/doctor/availability');
      }
    }
  }, [user, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        await register({
          email,
          password,
          role,
          name,
          phone,
          specialty: role === 'doctor' ? specialty : null,
        });
        // Navigation will be handled by useEffect based on user role
      } else {
        await login(email, password);
        // Navigation will be handled by useEffect based on user role
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  // Mark input as user-interacted to enable arrow key navigation
  const markInputInteracted = (inputId) => {
    if (inputId) {
      inputInteractionRef.current.add(inputId);
    }
  };

  // Arrow key navigation and ESC key for keyboard accessibility
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      // Handle ESC key to trigger back button
      if (e.key === 'Escape') {
        const backButton = document.querySelector('.back-button');
        if (backButton) {
          e.preventDefault();
          backButton.focus();
          backButton.click();
        }
        return;
      }
      
      // Handle arrow keys in all input fields (allow navigation regardless of content)
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
        const input = e.target;
        const isSelect = input.tagName === 'SELECT';
        
        // For SELECT elements, never interfere with arrow keys - let browser handle option selection
        if (isSelect) {
          return; // Let browser handle select dropdown navigation
        }
        
        // For INPUT and TEXTAREA, only allow navigation if user has interacted with this input
        // This prevents interference with browser autofill
        const inputId = input.id || input.name;
        
        // Check if this input has been interacted with by user
        if (!inputInteractionRef.current.has(inputId)) {
          // User hasn't interacted with this input yet, don't navigate
          // This allows browser autofill to work without interference
          return;
        }
        
        // Allow arrow down/up navigation for text input fields
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          // Check if cursor is at the start (for up arrow) or end (for down arrow) of input
          const isTextInput = input.tagName === 'INPUT' && (input.type === 'text' || input.type === 'email' || input.type === 'password' || input.type === 'tel');
          const isTextarea = input.tagName === 'TEXTAREA';
          
          let shouldNavigate = false;
          
          if (isTextarea) {
            // For textarea, check cursor position
            const selectionStart = input.selectionStart || 0;
            const selectionEnd = input.selectionEnd || 0;
            const valueLength = input.value.length;
            
            if (e.key === 'ArrowDown') {
              // Allow navigation if cursor is at the end
              shouldNavigate = selectionEnd === valueLength && selectionStart === valueLength;
            } else if (e.key === 'ArrowUp') {
              // Allow navigation if cursor is at the start
              shouldNavigate = selectionStart === 0 && selectionEnd === 0;
            }
          } else if (isTextInput) {
            // For text inputs, check cursor position
            const selectionStart = input.selectionStart || 0;
            const selectionEnd = input.selectionEnd || 0;
            const valueLength = input.value.length;
            
            if (e.key === 'ArrowDown') {
              // Allow navigation if cursor is at the end or input is empty
              shouldNavigate = (selectionEnd === valueLength && selectionStart === valueLength) || valueLength === 0;
            } else if (e.key === 'ArrowUp') {
              // Allow navigation if cursor is at the start or input is empty
              shouldNavigate = (selectionStart === 0 && selectionEnd === 0) || valueLength === 0;
            }
          }
          
          if (shouldNavigate) {
            e.preventDefault();
            const loginCard = document.querySelector('.login-card');
            if (!loginCard) return;
            
            const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
            const allFocusableElements = Array.from(
              loginCard.querySelectorAll(focusableSelectors)
            ).filter(el => {
              return el.offsetParent !== null && 
                     !el.disabled && 
                     !el.hasAttribute('aria-hidden') &&
                     window.getComputedStyle(el).visibility !== 'hidden';
            });
            
            if (allFocusableElements.length === 0) return;
            
            const currentIndex = allFocusableElements.findIndex(
              el => el === input
            );
            
            if (currentIndex === -1) return;
            
            if (e.key === 'ArrowDown') {
              const nextIndex = currentIndex < allFocusableElements.length - 1 
                ? currentIndex + 1 
                : 0;
              allFocusableElements[nextIndex]?.focus();
            } else if (e.key === 'ArrowUp') {
              const prevIndex = currentIndex > 0 
                ? currentIndex - 1 
                : allFocusableElements.length - 1;
              allFocusableElements[prevIndex]?.focus();
            }
            return;
          }
        }
        
        // For other keys in inputs, don't interfere
        return;
      }
      
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const loginCard = document.querySelector('.login-card');
        if (!loginCard) return;
        
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const allFocusableElements = Array.from(
          loginCard.querySelectorAll(focusableSelectors)
        ).filter(el => {
          return el.offsetParent !== null && 
                 !el.disabled && 
                 !el.hasAttribute('aria-hidden') &&
                 window.getComputedStyle(el).visibility !== 'hidden';
        });
        
        if (allFocusableElements.length === 0) return;
        
        const currentIndex = allFocusableElements.findIndex(
          el => el === document.activeElement
        );
        
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
      }
    };
    
    document.addEventListener('keydown', handleKeyNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyNavigation);
    };
  }, []);

  return (
    <div 
      className="login-container"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <main className="login-card" role="main">
        <button
          className="back-button"
          onClick={handleBackToHome}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBackToHome();
            }
          }}
          aria-label="Back to home"
        >
          ←
        </button>
        <div className="login-header">
          <h1 className="login-title">MedLink</h1>
          <p className="login-subtitle">Your Health, Connected</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          {isRegister && (
            <>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    markInputInteracted('name');
                  }}
                  onFocus={() => markInputInteracted('name')}
                  onClick={() => markInputInteracted('name')}
                  required
                  placeholder="Enter your name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">I am a</label>
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (e.target.value === 'patient') {
                      setSpecialty('');
                    }
                    markInputInteracted('role');
                  }}
                  onFocus={() => markInputInteracted('role')}
                  onClick={() => markInputInteracted('role')}
                  required
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>

              {role === 'doctor' && (
                <div className="form-group">
                  <label htmlFor="specialty">Specialty</label>
                  <input
                    type="text"
                    id="specialty"
                    name="specialty"
                    value={specialty}
                    onChange={(e) => {
                      setSpecialty(e.target.value);
                      markInputInteracted('specialty');
                    }}
                    onFocus={() => markInputInteracted('specialty')}
                    onClick={() => markInputInteracted('specialty')}
                    required
                    placeholder="e.g., General Practice, Cardiology, Pediatrics"
                  />
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete={isRegister ? "email" : "username"}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                markInputInteracted('email');
              }}
              onFocus={() => markInputInteracted('email')}
              onClick={() => markInputInteracted('email')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const passwordInput = document.getElementById('password');
                  if (passwordInput) {
                    passwordInput.focus();
                  }
                }
              }}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                markInputInteracted('password');
              }}
              onFocus={() => markInputInteracted('password')}
              onClick={() => markInputInteracted('password')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Move focus to Sign In/Sign Up button instead of submitting
                  const loginButton = document.querySelector('.login-button');
                  if (loginButton) {
                    loginButton.focus();
                  }
                }
              }}
              required
              placeholder="Enter your password"
              minLength="6"
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="phone">Phone (optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  markInputInteracted('phone');
                }}
                onFocus={() => markInputInteracted('phone')}
                onClick={() => markInputInteracted('phone')}
                placeholder="Enter your phone number"
              />
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            onKeyDown={(e) => {
              if (e.key === ' ') {
                // Space key: prevent default and trigger form submit
                e.preventDefault();
                const form = e.target.closest('form');
                if (form) {
                  const formEvent = new Event('submit', { bubbles: true, cancelable: true });
                  form.dispatchEvent(formEvent);
                }
              }
              // Enter key will trigger form submit naturally via button type="submit"
            }}
          >
            {isRegister ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="login-toggle">
          <button
            type="button"
            tabIndex={0}
            onClick={() => {
              setIsRegister(!isRegister);
              // Reset form fields when switching
              setError('');
              if (!isRegister) {
                // Switching to register - reset to defaults
                setRole('patient');
                setSpecialty('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsRegister(!isRegister);
                setError('');
                if (!isRegister) {
                  setRole('patient');
                  setSpecialty('');
                }
              }
            }}
            className="toggle-button"
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </main>
    </div>
  );
}

Login.propTypes = {
  // Login component doesn't receive props, but we document it for consistency
};

export default Login;

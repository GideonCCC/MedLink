import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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

  useEffect(() => {
    if (user) {
      const redirectTo = location.state?.redirectTo;
      if (redirectTo) {
        navigate(redirectTo);
      } else if (user.role === 'patient') {
        navigate('/patient/dashboard');
      } else if (user.role === 'doctor') {
        navigate('/doctor/dashboard');
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

  return (
    <div className="login-container">
      <div className="login-card">
        <button className="back-button" onClick={handleBackToHome} aria-label="Back to home">
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">I am a</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (e.target.value === 'patient') {
                      setSpecialty('');
                    }
                  }}
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
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
          )}

          <button type="submit" className="login-button">
            {isRegister ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="login-toggle">
          <button
            type="button"
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
            className="toggle-button"
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;


import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './components/Home/Home';
import Login from './components/Login/Login';
import DoctorsList from './components/Doctors/DoctorsList';
import DoctorSchedule from './components/Doctors/DoctorSchedule';
import PatientDashboard from './components/Patient/PatientDashboard';
import AppointmentForm from './components/Patient/AppointmentForm';
import PatientHistory from './components/Patient/PatientHistory';
import BookVisitStart from './components/Patient/BookVisitStart';
import PatientLayout from './components/Patient/PatientLayout';
import PrivateRoute from './components/Shared/PrivateRoute';
import Navbar from './components/Shared/Navbar';
import DoctorsLayout from './components/Doctors/DoctorsLayout';
import DoctorAvailibility from './components/Doctors/Availibility/DoctorAvailibility';
import UpcomingAppointments from './components/Doctors/UpcomingAppointments/UpcomingAppointments';
import PastAppointments from './components/Doctors/PastAppointments/PastAppointments';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Navbar />
                  <Home />
                </>
              }
            />
            <Route
              path="/login"
              element={
                <>
                  <Navbar />
                  <Login />
                </>
              }
            />
            <Route path="/doctors" element={<DoctorsList />} />
            <Route path="/doctors/:id/schedule" element={<DoctorSchedule />} />
            <Route
              path="/patient/*"
              element={
                <PrivateRoute role="patient">
                  <PatientLayout>
                    <Routes>
                      <Route
                        path=""
                        element={<Navigate to="dashboard" replace />}
                      />
                      <Route path="dashboard" element={<PatientDashboard />} />
                      <Route path="book-visit" element={<BookVisitStart />} />
                      <Route
                        path="appointments/new"
                        element={<AppointmentForm />}
                      />
                      <Route
                        path="appointments/:id/edit"
                        element={<AppointmentForm />}
                      />
                      <Route path="history" element={<PatientHistory />} />
                    </Routes>
                  </PatientLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/doctor/*"
              element={
                <PrivateRoute role="doctor">
                  <DoctorsLayout>
                    <Routes>
                      <Route
                        path=""
                        element={<Navigate to="upcoming-appointments" replace />}
                      />
                      <Route
                        path="availability"
                        element={<DoctorAvailibility />}
                      />
                      <Route
                        path="upcoming-appointments"
                        element={<UpcomingAppointments />}
                      />
                      <Route
                        path="past-appointments"
                        element={<PastAppointments />}
                      />
                    </Routes>
                  </DoctorsLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

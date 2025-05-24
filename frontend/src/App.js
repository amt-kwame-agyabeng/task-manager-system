import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import './App.css';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import SetupPassword from './components/SetPassword';
import { Toaster } from 'react-hot-toast';
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwt_decode(token);
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (decoded.exp && decoded.exp < currentTime) {
          // Token expired
          localStorage.removeItem('token');
          setUser(null);
          console.warn('Token expired. Logging out.');
        } else if (decoded.userId && decoded.role) {
          setUser({ userId: decoded.userId, role: decoded.role });
        } else {
          // Invalid token payload
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (err) {
        // Invalid token format
        localStorage.removeItem('token');
        setUser(null);
        console.error('Token decoding failed:', err.message);
      }
    }
    setLoading(false);
  }, []);

  if (loading) return null; // Or a loading spinner

  return (
    <div>
    <Toaster position='top-center' reverseOrder={false} />
    <Router>
      <Routes>
  <Route path="/login" element={<LoginPage setUser={setUser} />} />
  <Route path="/" element={<Navigate to="/login" replace />} />
  <Route path="/setup-password" element={<SetupPassword />} />
  <Route
    path="/admin"
    element={user?.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/login" replace />}
  />
  <Route
    path="/user"
    element={user?.role === 'user' ? <UserDashboard user={user} /> : <Navigate to="/login" replace />}
  />
</Routes>
    </Router>
    </div>

  );
}

export default App;

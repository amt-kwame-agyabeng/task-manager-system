import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { toast } from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_BASE;

export default function LoginPage({ setUser }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorIdentifier, setErrorIdentifier] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    setErrorIdentifier('');
    setErrorPassword('');

    let hasError = false;

    if (!trimmedIdentifier) {
      setErrorIdentifier('Please enter your Email or User ID');
      hasError = true;
    }
    if (!trimmedPassword) {
      setErrorPassword('Please enter your Password');
      hasError = true;
    }

      if (hasError) return;

    const isEmail = trimmedIdentifier.includes('@');
    const payload = isEmail
      ? { contact: trimmedIdentifier, password: trimmedPassword }
      : { userId: trimmedIdentifier, password: trimmedPassword };

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Login failed');

      const { token } = data;

      if (!token) throw new Error('No token returned');

      localStorage.setItem('token', token);
      
     

      const decoded = jwt_decode(token);

      if (!decoded || !decoded.userId || !decoded.role) {
        throw new Error('Invalid token payload');
      }

      localStorage.setItem('userId', decoded.userId);
      localStorage.setItem('role', decoded.role);
  
      setUser({ userId: decoded.userId, role: decoded.role });

      toast.success('Login successful!');


      navigate(decoded.role === 'admin' ? '/admin' : '/user');
    } catch (err) {
  if (err.message === 'Invalid credentials') {
    toast.error('Invalid email or password.');
  } else if (err.message === 'Missing credentials') {
    toast.error('Please provide your credentials.');
  } else {
    toast.error(err.message || 'Something went wrong. Please try again.');
  }
    } finally {
      setLoading(false);
    }
  };

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (errorIdentifier) setErrorIdentifier('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errorPassword) setErrorPassword('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="shadow-md rounded-lg p-8 bg-white w-full max-w-md">
        <h1 className="text-2xl text-blue-800 font-medium mb-4">Task Management System</h1>
        <h2 className="mb-4 text-md text-blue-800">Login to your account</h2>

        {errorIdentifier && <p className="text-red-600 text-sm mt-1 mb-2">{errorIdentifier}</p>}
        <input
          type="text"
          placeholder="Email or User ID"
          value={identifier}
          onChange={handleIdentifierChange}
          onKeyDown={handleKeyDown}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full mb-5"
          disabled={loading}
        />

        {errorPassword && <p className="text-red-600 text-sm mt-1 mb-2">{errorPassword}</p>}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={handlePasswordChange}
          onKeyDown={handleKeyDown}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          disabled={loading}
        />

        <button
          disabled={loading}
          className={`text-white bg-blue-800 border rounded-lg px-4 py-3 mb-2 mt-5 w-full tracking-wide ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleLogin}
        >
          {loading ? 'Login' : 'Login'}
        </button>
      </div>
    </div>
  );
}

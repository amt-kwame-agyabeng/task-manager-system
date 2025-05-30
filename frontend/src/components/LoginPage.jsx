import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode as jwt_decode } from 'jwt-decode';
import { toast } from 'react-hot-toast';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';

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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-400 to-indigo-700">
      <div className="w-full max-w-md px-8 py-10 bg-white rounded-xl shadow-2xl transform transition-all">
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-full bg-blue-100 mb-4">
            <FiLogIn className="text-blue-600 text-3xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to Task Management System</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">Email or User ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="identifier"
                type="text"
                placeholder="Enter your email or user ID"
                value={identifier}
                onChange={handleIdentifierChange}
                onKeyDown={handleKeyDown}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errorIdentifier ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                disabled={loading}
              />
            </div>
            {errorIdentifier && <p className="mt-1 text-sm text-red-600">{errorIdentifier}</p>}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>

            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={handleKeyDown}
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errorPassword ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                disabled={loading}
              />
            </div>
            {errorPassword && <p className="mt-1 text-sm text-red-600">{errorPassword}</p>}
          </div>
          
          <button
            disabled={loading}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            onClick={handleLogin}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <FiLogIn className="mr-2" />
                Sign In
              </span>
            )}
          </button>
          
          <div className="relative my-4">
           
          </div>
          
          
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Task Management System © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
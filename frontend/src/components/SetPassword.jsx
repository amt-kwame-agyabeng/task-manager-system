import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaCheck, FaTimes, FaLock, FaArrowLeft } from 'react-icons/fa';

const PASSWORD_MIN_LENGTH = 8;
const API_BASE = process.env.REACT_APP_API_BASE;

const validatePassword = (pwd) => {
  const lengthCheck = pwd.length >= PASSWORD_MIN_LENGTH;
  const uppercaseCheck = /[A-Z]/.test(pwd);
  const lowercaseCheck = /[a-z]/.test(pwd);
  const numberCheck = /\d/.test(pwd);
  return {
    lengthCheck,
    uppercaseCheck,
    lowercaseCheck,
    numberCheck,
    isValid: lengthCheck && uppercaseCheck && lowercaseCheck && numberCheck,
  };
};

const SetupPassword = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validation, setValidation] = useState({
    lengthCheck: false,
    uppercaseCheck: false,
    lowercaseCheck: false,
    numberCheck: false,
    isValid: false,
  });
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setValidation(validatePassword(newPassword));
  }, [newPassword]);

  useEffect(() => {
    if (!userId || !token) {
      setStatus('Invalid or missing setup link.');
    }
  }, [userId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');

    if (!validation.isValid) {
      setStatus('Password does not meet complexity requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('Passwords do not match.');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/set-password`, {
        userId,
        token,
        newPassword,
      });

      toast.success(response.data.message || 'Password set successfully');
    } catch (error) {
      const msg =
        toast.error.response?.data?.error || 'An error occurred. Try again.';
      setStatus(`Error: ${msg}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="shadow-lg rounded-lg p-8 bg-white w-full max-w-md transition-all">
        <div className="flex items-center justify-center mb-6">
          <FaLock className="text-blue-800 text-3xl mr-3" />
          <h1 className="text-2xl text-blue-800 font-bold">Task Management System</h1>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Set Your Password</h2>

        {status && (
          <div className={`p-3 rounded-md mb-4 ${status.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {status}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            
            <ul className="mt-2 space-y-1 text-sm">
              {[
                { check: validation.lengthCheck, text: `Minimum ${PASSWORD_MIN_LENGTH} characters` },
                { check: validation.uppercaseCheck, text: 'At least one uppercase letter' },
                { check: validation.lowercaseCheck, text: 'At least one lowercase letter' },
                { check: validation.numberCheck, text: 'At least one number' }
              ].map((item, index) => (
                <li key={index} className="flex items-center">
                  {item.check ? (
                    <FaCheck className="text-green-500 mr-2" />
                  ) : (
                    <FaTimes className="text-red-500 mr-2" />
                  )}
                  <span className={item.check ? 'text-green-600' : 'text-red-600'}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-600 text-sm flex items-center mt-1">
                <FaTimes className="mr-1" /> Passwords do not match
              </p>
            )}
          </div>

          <button
            className={`text-white bg-blue-700 hover:bg-blue-800 rounded-lg px-4 py-3 w-full font-medium transition-all ${
              !validation.isValid || newPassword !== confirmPassword
                ? 'opacity-50 cursor-not-allowed'
                : 'transform hover:translate-y-[-1px] hover:shadow-md'
            }`}
            type="submit"
            disabled={!validation.isValid || newPassword !== confirmPassword}
          >
            Set Password
          </button>
          
          <button 
            type="button"
            className="flex items-center justify-center text-blue-700 hover:text-blue-800 bg-white border border-blue-700 rounded-lg px-4 py-3 w-full font-medium transition-all hover:bg-blue-50"
            onClick={() => navigate('/login')}
          >
            <FaArrowLeft className="mr-2" /> Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupPassword;

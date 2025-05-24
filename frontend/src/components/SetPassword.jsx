import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

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
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 ">
        <div className='shadow-lg rounded-lg p-8 bg-white  w-full max-w-md'>
    <h1 className="text-2xl text-blue-800 font-medium mb-4">Task Management System</h1>
      <h2>Set Your Password</h2>

      {status && (
        <p style={{ color: status.startsWith('Error') ? 'red' : 'green' }}>{status}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          
          <label>New Password</label>
          <input
            className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            autoComplete="new-password"
          />
          <ul style={{ fontSize: '0.8rem', marginTop: '0.25rem',  }}>
            <li style={{ color: validation.lengthCheck ? 'green' : 'red' }}>
              Minimum {PASSWORD_MIN_LENGTH} characters
            </li>
            <li style={{ color: validation.uppercaseCheck ? 'green' : 'red' }}>
              At least one uppercase letter
            </li>
            <li style={{ color: validation.lowercaseCheck ? 'green' : 'red' }}>
              At least one lowercase letter
            </li>
            <li style={{ color: validation.numberCheck ? 'green' : 'red' }}>
              At least one number
            </li>
          </ul>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Confirm Password</label>
          <input
          className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            autoComplete="new-password"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p style={{ color: 'red', fontSize: '0.8rem' }}>Passwords do not match</p>
          )}
        </div>

        <button
          className={`text-white bg-blue-800 border rounded-lg px-4 py-3 mb-2 mt-5 w-full tracking-wide ${
            !validation.isValid || newPassword !== confirmPassword
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
          type="submit"
          style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
          disabled={!validation.isValid || newPassword !== confirmPassword}
        >
          Set Password
        </button>
        <button className='text-white bg-blue-800 border rounded-lg px-4 py-3 mb-2 mt-5 w-full tracking-wide'  onClick={() => {
    navigate('/login');
  }}> Back to Login</button>
      </form>
      </div>
    </div>
  );
};

export default SetupPassword;

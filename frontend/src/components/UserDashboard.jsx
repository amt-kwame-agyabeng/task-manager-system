import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {  LayoutDashboard } from 'lucide-react';
import { CircleEllipsis   } from 'lucide-react';
import { ListChecks } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { FileCheck } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE;
const statusOptions = ['Pending', 'In Progress', 'Completed'];

const decodeJwtPayload = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 'Pending':
      return 'text-yellow-700 bg-yellow-100';
    case 'In Progress':
      return 'text-blue-700 bg-blue-100';
    case 'Completed':
      return 'text-green-700 bg-green-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
};

const UserDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');

  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('role');
  const userPayload = decodeJwtPayload(token);

  const headers = {
    Authorization: `Bearer ${token}`,
    'x-user-id': userId,
    'x-user-role': role,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    if (!token || !userPayload) {
      window.location.href = '/login';
    }
  }, [token, userPayload]);


  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tasks/mytasks`, {
        headers,
        params: { userId },
      });
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
      alert('Error fetching tasks');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (taskId, newStatus) => {
    setUpdating((prev) => ({ ...prev, [taskId]: true }));
    try {
      await axios.post(
        `${API_BASE}/tasks/update-status`,
        { taskId, status: newStatus, userId, role },
        { headers }
      );
      fetchTasks();
      toast.success('Status updated successfully');
    } catch (err) {
      console.error('Error updating status', err);
      toast.error('Failed to update status');
    } finally {
      setUpdating((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

const DashboardView = () => {
  if (loading) return <div className='mt-8'>Loading tasks...</div>;

  return (
    <div>
      <div className="flex flex-row gap-5 mb-6 mt-20">
        <div className="p-4 bg-white shadow rounded w-1/3 border-l-4 border-blue-400">
          <div className='flex items-center gap-2 mb-3'>
              <ListChecks color='green' />
                <p>Total Task </p>
              </div>
          <p className="text-3xl fomt-normal">{tasks.length}</p>
        </div>
        <div className="p-4 bg-white shadow rounded w-1/3 border-l-4 border-green-400">
          
          <div className='flex items-center gap-2 mb-3'>
            <FileCheck color='green' />
        <p className="text-gray-700 font-semibold">Completed Tasks</p>
          </div>
          <p className="text-4xl font-normal">{tasks.filter((t) => t.status === 'Completed').length}</p>
        </div>
        <div className="p-4 bg-white shadow rounded w-1/3 border-l-4 border-yellow-400">
         <div className='flex items-center gap-2 mb-3'>
              <CircleEllipsis color='yellow' />
                 <p className="text-gray-700 font-semibold">Pending Tasks</p>
              </div>
        
          <p className="text-3xl font-normal">{tasks.filter((t) => t.status === 'Pending').length}</p>
        </div>
      </div>

      {/* Table showing Task ID and Title */}
      <p className='text-2xl mt-5 mb-4 font-semibold'>Task Assigned</p>
      {tasks.length === 0 ? (
        <p>No tasks assigned</p>
      ) : (
       <table
  className="min-w-full divide-y divide-gray-200"
  style={{ tableLayout: 'fixed' }}
>
  <thead className="bg-gray-50">
    <tr>
      <th
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        style={{ width: '100px' }}
      >
        Task ID
      </th>
      <th
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        style={{ width: '200px' }}
      >
        Title
      </th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {tasks.map((task) => (
      <tr key={task.taskId} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">{task.taskId}</td>
        <td className="px-6 py-4 whitespace-nowrap">{task.title}</td>
      </tr>
    ))}
  </tbody>
</table>

      )}
    </div>
  );
};


  const TasksView = () => {
    if (loading) return <div>Loading tasks...</div>;

    return (
      <div>
        <h2 className="text-2xl font-semibold mb-4 mt-20" >My Tasks</h2>
        {tasks.length === 0 ? (
          <p>No tasks assigned</p>
        ) : (
         <table
  className="min-w-full divide-y divide-gray-200"
  style={{ tableLayout: 'fixed' }}
>
  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>Task ID</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }}>Title</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }}>Deadline</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>Status</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '140px' }}>Update</th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {tasks.map((task) => (
      <tr key={task.taskId} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">{task.taskId}</td>
        <td className="px-6 py-4 whitespace-nowrap">{task.title}</td>
        <td className="px-6 py-4 break-words">{task.description}</td>
        <td className="px-6 py-4 whitespace-nowrap">
          {new Date(task.deadline).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </td>
        <td className={`px-6 py-4 whitespace-nowrap font-semibold ${getStatusClass(task.status)}`}>
          {task.status || 'N/A'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <select
  className="border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
  value={task.status}
  onChange={(e) => updateStatus(task.taskId, e.target.value)}
  disabled={updating[task.taskId]}
>
  {statusOptions.map((status) => (
    <option key={status} value={status}>
      {status}
    </option>
  ))}
</select>

        </td>
      </tr>
    ))}
  </tbody>
</table>

        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen relative">
      {/* Navbar - sits behind sidebar */}
      <nav className="fixed top-0 left-0 w-full 0 p-4 z-0 border border-gray-300  ">
       <p className='text-right'> Welcome, {userPayload?.name || 'User'}</p>
      </nav>

      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-full w-48 bg-gray-100 p-4 z-10 shadow flex flex-col items-start">
        <button
          className={`w-full text-left mt-8 mb-2 px-4 py-2 rounded ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-blue-100'}`}
          onClick={() => setActiveTab('dashboard')}
        >

          <LayoutDashboard className="inline-block mr-2" />
          Dashboard
        </button>
        <button
          className={`w-full text-left mb-2 px-4 py-2 rounded ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'hover:bg-blue-100'}`}
          onClick={() => setActiveTab('tasks')}
        >
          <ListChecks className="inline-block mr-2" />
          Tasks
        </button>
        <button
          onClick={handleLogout}
          className="mt-10 text-left w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          <LogOut className="inline-block mr-2" />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <main className=" flex-1 p-10 overflow-auto ml-48 bg-white ">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'tasks' && <TasksView />}
      </main>
    </div>
  );
};

export default UserDashboard;

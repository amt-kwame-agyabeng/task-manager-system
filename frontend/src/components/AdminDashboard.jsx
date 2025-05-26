import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { LayoutDashboard } from 'lucide-react';
import { Users } from 'lucide-react';
import { ListChecks } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { User } from 'lucide-react';
import { Clock } from 'lucide-react';
import { Pencil } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { Check } from 'lucide-react';
import { X } from 'lucide-react';
import { Plus } from 'lucide-react';
import { Logs } from 'lucide-react';


const API_BASE = process.env.REACT_APP_API_BASE;

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

const InputField = ({ label, id, name, value, onChange, placeholder, type = 'text', ...rest }) => (
  <div className="mb-4 flex flex-col w-full">
    {label && (
      <label htmlFor={id || name} className="mb-1 font-medium text-gray-700">
        {label}
      </label>
    )}
    <input
      id={id || name}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      {...rest}
    />
  </div>
);

// Modal component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, users, tasks
  const [tasks, setTasks] = useState([]);

  // Pagination states
  const [currentTaskPage, setCurrentTaskPage] = useState(1);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [tasksPerPage] = useState(10);
  const [usersPerPage] = useState(10);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [userForm, setUserForm] = useState({ userId: '', name: '', contact: '' });
  const [taskForm, setTaskForm] = useState({
    taskId: '',
    title: '',
    description: '',
    deadline: '',
    assignedTo: '',
  });
  const [assignForm, setAssignForm] = useState({ taskId: '', userId: '' });

  const [userError, setUserError] = useState('');
  const [taskError, setTaskError] = useState('');
  const [assignError, setAssignError] = useState('');

  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingCreateUser, setLoadingCreateUser] = useState(false);
  const [loadingCreateTask, setLoadingCreateTask] = useState(false);
  const [loadingAssignTask, setLoadingAssignTask] = useState(false);
  const [loadingDeleteTask, setLoadingDeleteTask] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  const [editDeadline, setEditDeadline] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [loadingDeleteUser, setLoadingDeleteUser] = useState({});

  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const userPayload = decodeJwtPayload(token);

  useEffect(() => {
    if (!token || !userPayload) {
      window.location.href = '/login';
    }
  }, [token, userPayload]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const res = await axios.get(`${API_BASE}/users`, { headers });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setUsersError('Failed to fetch users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [headers]);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    setTaskError('');
    try {
      const res = await axios.get(`${API_BASE}/tasks`, { headers });
      setTasks(res.data);
    } catch (err) {
      setTaskError('Error fetching tasks');
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  }, [headers]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    }
  }, [fetchTasks, activeTab]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchUsers();
      fetchTasks();
    } else if (activeTab === 'tasks') {
      fetchTasks();
    }
  }, [activeTab, fetchUsers, fetchTasks]);

  const handleUserInput = (e) => setUserForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleTaskInput = (e) => setTaskForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleAssignInput = (e) => setAssignForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const clearUserForm = () => setUserForm({ userId: '', name: '', contact: '' });
  const clearTaskForm = () =>
    setTaskForm({ taskId: '', title: '', description: '', deadline: '', assignedTo: '' });
  const clearAssignForm = () => setAssignForm({ taskId: '', userId: '' });

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const createUser = async () => {
    setUserError('');
    if (!userForm.userId.trim() || !userForm.name.trim() || !isValidEmail(userForm.contact)) {
      setUserError('Please provide valid User ID, Name, and Email.');
      return;
    }
    setLoadingCreateUser(true);
    try {
      await axios.post(`${API_BASE}/users/create`, { ...userForm, role: 'user' }, { headers });
      toast.success('User created successfully');
      clearUserForm();
      fetchUsers();
      setShowUserModal(false);
    } catch (err) {
      toast.error('Failed to create user');
      console.error(err);
    } finally {
      setLoadingCreateUser(false);
    }
  };

  const createTask = async () => {
    setTaskError('');
    if (!taskForm.taskId.trim() || !taskForm.title.trim() || !taskForm.description.trim()) {
      setTaskError('Please provide Task ID, Title, and Description.');
      return;
    }
    setLoadingCreateTask(true);
    try {
      await axios.post(`${API_BASE}/tasks/create`, taskForm, { headers });
      toast.success('Task created successfully');
      clearTaskForm();
      fetchTasks();
      setShowTaskModal(false);
    } catch (err) {
      toast.error('Failed to create task');
      console.error(err);
    } finally {
      setLoadingCreateTask(false);
    }
  };

  const assignTask = async () => {
    setAssignError('');
    if (!assignForm.taskId.trim() || !assignForm.userId.trim()) {
      setAssignError('Please provide Task ID and User ID.');
      return;
    }
    setLoadingAssignTask(true);
    try {
      await axios.post(`${API_BASE}/tasks/assign`, assignForm, { headers });
      toast.success('Task assigned successfully');
      clearAssignForm();
      fetchTasks();
      setShowAssignModal(false);
    } catch (err) {
      toast.error('Failed to assign task,');
      console.error(err);
    } finally {
      setLoadingAssignTask(false);
    }
  };
  
  const deleteTask = async (taskId) => {
    setLoadingDeleteTask(prev => ({ ...prev, [taskId]: true }));
    try {
      await axios.delete(`${API_BASE}/tasks/${taskId}`, { headers });
      toast.success('Task deleted successfully');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to delete task');
      console.error(err);
    } finally {
      setLoadingDeleteTask(prev => ({ ...prev, [taskId]: false }));
    }
  };
  
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userTasks, setUserTasks] = useState([]);
  const [reassignUserId, setReassignUserId] = useState('');
  
  const initiateDeleteUser = async (userId, userName) => {
    // Prevent deleting your own account
    if (userId === userPayload?.userId) {
      toast.error('You cannot delete your own account');
      return;
    }
    
    setLoadingDeleteUser(prev => ({ ...prev, [userId]: true }));
    try {
      // First try to delete normally
      await axios.delete(`${API_BASE}/users/${userId}`, { headers });
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      if (err.response?.data?.error === 'Cannot delete user with assigned tasks') {
        // If user has tasks, show confirmation dialog
        setUserToDelete({ userId, name: userName });
        setUserTasks(err.response.data.tasks || []);
        setShowDeleteConfirm(true);
      } else {
        toast.error('Failed to delete user');
      }
      console.error(err);
    } finally {
      setLoadingDeleteUser(prev => ({ ...prev, [userId]: false }));
    }
  };
  
  const confirmDeleteUser = async (reassign) => {
    if (!userToDelete) return;
    
    setLoadingDeleteUser(prev => ({ ...prev, [userToDelete.userId]: true }));
    try {
      let url = `${API_BASE}/users/${userToDelete.userId}?force=true`;
      
      if (reassign && reassignUserId) {
        url += `&reassignTo=${reassignUserId}`;
      }
      
      await axios.delete(url, { headers });
      
      if (reassign && reassignUserId) {
        toast.success(`User deleted and tasks reassigned to ${reassignUserId}`);
      } else {
        toast.success('User deleted and tasks unassigned');
      }
      
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setUserTasks([]);
      setReassignUserId('');
      fetchUsers();
      fetchTasks();
    } catch (err) {
      toast.error('Failed to delete user');
      console.error(err);
    } finally {
      setLoadingDeleteUser(prev => ({ ...prev, [userToDelete.userId]: false }));
    }
  };
  
  const cancelDeleteUser = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
    setUserTasks([]);
    setReassignUserId('');
  };
  
  const updateTaskDeadline = async () => {
    if (!editingTask || !editDeadline) return;
    
    try {
      await axios.put(`${API_BASE}/tasks/${editingTask}`, { deadline: editDeadline }, { headers });
      toast.success('Deadline updated successfully');
      setEditingTask(null);
      setEditDeadline('');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to update deadline');
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const getStatusClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'text-green-700 bg-green-100 rounded px-2 py-1 text-xs';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100 rounded px-2 py-1 text-xs';
      case 'in progress':
        return 'text-blue-700 bg-blue-100 rounded px-2 py-1 text-xs';
      default:
        return 'text-gray-700 bg-gray-100 rounded px-2 py-1 text-xs';
    }
  };

  const usersWithTasks = users.map(user => ({
    ...user,
    tasks: tasks.filter(task => task.assignedTo === user.userId)
  }));
  
  // Get current users for pagination
  const indexOfLastUser = currentUserPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = usersWithTasks.filter(user => user.role !== 'admin').slice(indexOfFirstUser, indexOfLastUser);
  const totalUserPages = Math.ceil(usersWithTasks.filter(user => user.role !== 'admin').length / usersPerPage);
  
  // Get current tasks for pagination
  const indexOfLastTask = currentTaskPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = tasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalTaskPages = Math.ceil(tasks.length / tasksPerPage);
  
  // Change page
  const paginate = (pageNumber, setPage) => setPage(pageNumber);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gray-50 shadow-sm z-20 flex items-center justify-between px-6">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-blue-600">Task Management</h1>
        </div>
        
        <div className="navbar flex items-center">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <User size={24} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{userPayload?.name || userPayload?.userId || 'Admin'}</p>
              <p className="text-xs text-gray-500 capitalize">Administrator</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-md z-10">
        <nav className="mt-6 px-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            <LayoutDashboard className="mr-3" size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors ${
              activeTab === 'users' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            <Users className="mr-3" size={20} />
            <span className="font-medium">Users</span>
          </button>
          
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors ${
              activeTab === 'tasks' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            <ListChecks className="mr-3" size={20} />
            <span className="font-medium">Tasks</span>
          </button>
          
          <div className="absolute bottom-4 left-0 right-0 px-4">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="mr-3" size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </nav>
        

      </div>

      {/* Main Content */}
      <div className="ml-64 pt-20 px-8 pb-8">
        {activeTab === 'dashboard' && (
          <section>
              <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome back, {userPayload?.name || 'User'}</p>
        </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-blue-500 transition-all hover:shadow-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                      <Users size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500 font-medium">Total Users</p>
                      <p className="text-3xl font-bold text-gray-800">{users.filter(user => user.role !== 'admin').length}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-green-500 transition-all hover:shadow-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 text-green-600">
                      <ListChecks size={24} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500 font-medium">Total Tasks</p>
                      <p className="text-3xl font-bold text-gray-800">{tasks.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-purple-500 transition-all hover:shadow-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500 font-medium">Assigned Tasks</p>
                      <p className="text-3xl font-bold text-gray-800">{tasks.filter(task => task.assignedTo).length}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-orange-500 transition-all hover:shadow-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500 font-medium">Unassigned Tasks</p>
                      <p className="text-3xl font-bold text-gray-800">{tasks.filter(task => !task.assignedTo).length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">User Management</h2>
                <button 
                  onClick={() => fetchUsers()}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Refresh
                </button>
              </div>
           

            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
              
              {loadingUsers && (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              {usersError && <div className="p-6"><p className="text-red-600 mb-4">{usersError}</p></div>}
              {!loadingUsers && users.length === 0 && <div className="p-6 text-center text-gray-500">No users found.</div>}
              {!loadingUsers && users.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.userId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.contact}</td>
                          <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">
                            {user.tasks.length > 0 
                              ? user.tasks.map(task => task.title).join(", ") 
                              : "No tasks assigned"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => initiateDeleteUser(user.userId, user.name)}
                              disabled={loadingDeleteUser[user.userId] || user.userId === userPayload?.userId}
                              className={`p-1 rounded-full ${user.userId === userPayload?.userId ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                              title={user.userId === userPayload?.userId ? "Cannot delete your own account" : "Delete User"}
                            >
                              {loadingDeleteUser[user.userId] ? (
                                <div className="h-4 w-4 border-t-2 border-b-2 border-red-600 rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {totalUserPages > 1 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => paginate(currentUserPage - 1, setCurrentUserPage)}
                          disabled={currentUserPage === 1}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                            currentUserPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => paginate(currentUserPage + 1, setCurrentUserPage)}
                          disabled={currentUserPage === totalUserPages}
                          className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                            currentUserPage === totalUserPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{' '}
                            <span className="font-medium">
                              {indexOfLastUser > usersWithTasks.filter(user => user.role !== 'admin').length 
                                ? usersWithTasks.filter(user => user.role !== 'admin').length 
                                : indexOfLastUser}
                            </span>{' '}
                            of <span className="font-medium">{usersWithTasks.filter(user => user.role !== 'admin').length}</span> users
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => paginate(currentUserPage - 1, setCurrentUserPage)}
                              disabled={currentUserPage === 1}
                              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                                currentUserPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {[...Array(totalUserPages)].map((_, i) => (
                              <button
                                key={i}
                                onClick={() => paginate(i + 1, setCurrentUserPage)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentUserPage === i + 1
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                            <button
                              onClick={() => paginate(currentUserPage + 1, setCurrentUserPage)}
                              disabled={currentUserPage === totalUserPages}
                              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                                currentUserPage === totalUserPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
              <p className="text-gray-600">Create and manage system users</p>
            </div>
            
          
               <div className='flex flex-row justify-between items-center px-6 py-5 border-gray-200 bg-gray-50'>
                 <h2 className="text-lg font-semibold text-gray-800">User Registration</h2>
                <button 
                  onClick={() => setShowUserModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Add New User
                </button>
               </div>
               
              <div className="p-8">
                {/* User registration modal */}
                <Modal 
                  isOpen={showUserModal} 
                  onClose={() => {
                    setShowUserModal(false);
                    clearUserForm();
                    setUserError('');
                  }}
                  title="Register New User"
                >
                  {userError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg shadow-sm" role="alert">
                      <p className="text-red-700 text-sm">{userError}</p>
                    </div>
                  )}
                  <InputField
                    label="User ID"
                    id="userId"
                    name="userId"
                    value={userForm.userId}
                    onChange={handleUserInput}
                    placeholder="Enter user ID"
                  />
                  <InputField
                    label="Name"
                    id="name"
                    name="name"
                    value={userForm.name}
                    onChange={handleUserInput}
                    placeholder="Enter full name"
                  />
                  <InputField
                    label="Email"
                    id="contact"
                    name="contact"
                    type="email"
                    value={userForm.contact}
                    onChange={handleUserInput}
                    placeholder="Enter email address"
                  />
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowUserModal(false);
                        clearUserForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        createUser();
                        if (!userError) setShowUserModal(false);
                      }}
                      disabled={
                        loadingCreateUser ||
                        !userForm.userId.trim() ||
                        !userForm.name.trim() ||
                        !userForm.contact.trim()
                      }
                      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
                        loadingCreateUser || !userForm.userId.trim() || !userForm.name.trim() || !userForm.contact.trim()
                          ? 'opacity-50 cursor-not-allowed' 
                          : ''
                      }`}
                    >
                      {loadingCreateUser ? 'Processing...' : 'Register User'}
                    </button>
                  </div>
                </Modal>
              </div>
           
          </section>
        )}

        {activeTab === 'tasks' && (
          <section>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-800">Task Management</h1>
              <p className="text-gray-600">Create, assign and manage tasks</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="">
                <div className=" flex flex-row gap-2">
                  
                  <button 

                    onClick={() => setShowTaskModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center"
                  >
                    <Plus  className='mr-2'/>
                    Create Task
                  </button>
                   <button 
                    onClick={() => setShowAssignModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center"
                  >
                    <Logs className='mr-2' />
                    Assign Task
                  </button>
                </div>
                <div className="p-8">
                  {/* Task creation modal */}
                  <Modal 
                    isOpen={showTaskModal} 
                    onClose={() => {
                      setShowTaskModal(false);
                      clearTaskForm();
                      setTaskError('');
                    }}
                    title="Create New Task"
                  >
                    {taskError && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg shadow-sm" role="alert">
                        <p className="text-red-700 text-sm">{taskError}</p>
                      </div>
                    )}
                    <InputField
                      label="Task ID"
                      id="taskId"
                      name="taskId"
                      value={taskForm.taskId}
                      onChange={handleTaskInput}
                      placeholder="Enter task ID"
                    />
                    <InputField
                      label="Title"
                      id="title"
                      name="title"
                      value={taskForm.title}
                      onChange={handleTaskInput}
                      placeholder="Enter task title"
                    />
                    <InputField
                      label="Description"
                      id="description"
                      name="description"
                      value={taskForm.description}
                      onChange={handleTaskInput}
                      placeholder="Enter task description"
                    />
                    <InputField
                      label="Deadline"
                      id="deadline"
                      name="deadline"
                      type="datetime-local"
                      value={taskForm.deadline}
                      onChange={handleTaskInput}
                    />
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowTaskModal(false);
                          clearTaskForm();
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          createTask();
                          if (!taskError) setShowTaskModal(false);
                        }}
                        disabled={
                          loadingCreateTask ||
                          !taskForm.taskId.trim() ||
                          !taskForm.title.trim() ||
                          !taskForm.description.trim()
                        }
                        className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ${
                          loadingCreateTask || !taskForm.taskId.trim() || !taskForm.title.trim() || !taskForm.description.trim()
                            ? 'opacity-50 cursor-not-allowed' 
                            : ''
                        }`}
                      >
                        {loadingCreateTask ? 'Create Task' : 'Create Task'}
                      </button>
                    </div>
                  </Modal>
                </div>
              </div>
              
              <div >
                <div >
                  
                 
                </div>
                <div className="p-8">
                  {/* Task assignment modal */}
                  <Modal 
                    isOpen={showAssignModal} 
                    onClose={() => {
                      setShowAssignModal(false);
                      clearAssignForm();
                      setAssignError('');
                    }}
                    title="Assign Task to User"
                  >
                    {assignError && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg shadow-sm" role="alert">
                        <p className="text-red-700 text-sm">{assignError}</p>
                      </div>
                    )}
                    <div className="mb-4">
                      <label htmlFor="assignTaskId" className="mb-1 font-medium text-gray-700">
                        Select Task
                      </label>
                      <div className="relative">
                        <select
                          id="assignTaskId"
                          name="taskId"
                          value={assignForm.taskId}
                          onChange={handleAssignInput}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                        >
                          <option value="" disabled>Choose a task to assign</option>
                          {tasks.map(task => (
                            <option 
                              key={task.taskId || task.id} 
                              value={task.taskId || task.id}
                            >
                              {task.title} ({task.taskId || task.id}) {task.assignedTo ? '- Currently assigned' : ''}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Select the task you want to assign (tasks can be reassigned)</p>
                    </div>
                    <div className="mb-4 flex flex-col w-full">
                      <label htmlFor="assignUserId" className="mb-1 font-medium text-gray-700">
                        Select User
                      </label>
                      <div className="relative">
                        <select
                          id="assignUserId"
                          name="userId"
                          value={assignForm.userId}
                          onChange={handleAssignInput}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                        >
                          <option value="" disabled>Choose a user to assign</option>
                          {users
                            .filter(user => user.role === 'user')
                            .map(user => (
                              <option key={user.userId} value={user.userId}>
                                {user.name} ({user.userId})
                              </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Select the user who will be responsible for this task</p>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowAssignModal(false);
                          clearAssignForm();
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          assignTask();
                          if (!assignError) setShowAssignModal(false);
                        }}
                        disabled={
                          loadingAssignTask ||
                          !assignForm.taskId.trim() ||
                          !assignForm.userId.trim()
                        }
                        className={`px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 ${
                          loadingAssignTask || !assignForm.taskId.trim() || !assignForm.userId.trim()
                            ? 'opacity-50 cursor-not-allowed' 
                            : ''
                        }`}
                      >
                        {loadingAssignTask ? 'Assigning...' : 'Assign Task'}
                      </button>
                    </div>
                  </Modal>
                </div>
              </div>
            <div className="px-6 py-4 border-gray-200 bg-gray-50 flex flex-row justify-between ">
    <h2 className="text-lg font-semibold text-gray-800">All Tasks</h2>
  
</div>

            </div>

            
            
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              
              {loadingTasks && (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              {!loadingTasks && taskError && <div className="p-6"><p className="text-red-600 mb-4">{taskError}</p></div>}
              {!loadingTasks && tasks.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-500 mb-4">
                    <ListChecks size={32} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">No Tasks Created</h2>
                  <p className="text-gray-600">Create your first task to get started.</p>
                </div>
              )}
              {!loadingTasks && tasks.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentTasks.map((task) => (
                        <tr key={task.taskId || task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.taskId || task.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.title}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{task.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTask === (task.taskId || task.id) ? (
                              <input
                                type="datetime-local"
                                value={editDeadline}
                                onChange={(e) => setEditDeadline(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              <div className="flex items-center">
                                <Clock size={16} className="mr-1 text-gray-400" />
                                {new Date(task.deadline).toLocaleString('en-US', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={getStatusClass(task.status)}>{task.status || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {editingTask === (task.taskId || task.id) ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={updateTaskDeadline}
                                  className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                                  title="Save"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingTask(null);
                                    setEditDeadline('');
                                  }}
                                  className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingTask(task.taskId || task.id);
                                  setEditDeadline(task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '');
                                }}
                                className="p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                                title="Edit Deadline"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => deleteTask(task.taskId || task.id)}
                              disabled={loadingDeleteTask[task.taskId || task.id]}
                              className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                              title="Delete Task"
                            >
                              {loadingDeleteTask[task.taskId || task.id] ? (
                                <div className="h-4 w-4 border-t-2 border-b-2 border-red-600 rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {totalTaskPages > 1 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => paginate(currentTaskPage - 1, setCurrentTaskPage)}
                          disabled={currentTaskPage === 1}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                            currentTaskPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => paginate(currentTaskPage + 1, setCurrentTaskPage)}
                          disabled={currentTaskPage === totalTaskPages}
                          className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                            currentTaskPage === totalTaskPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{indexOfFirstTask + 1}</span> to{' '}
                            <span className="font-medium">
                              {indexOfLastTask > tasks.length ? tasks.length : indexOfLastTask}
                            </span>{' '}
                            of <span className="font-medium">{tasks.length}</span> tasks
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => paginate(currentTaskPage - 1, setCurrentTaskPage)}
                              disabled={currentTaskPage === 1}
                              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                                currentTaskPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {[...Array(totalTaskPages)].map((_, i) => (
                              <button
                                key={i}
                                onClick={() => paginate(i + 1, setCurrentTaskPage)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentTaskPage === i + 1
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                            <button
                              onClick={() => paginate(currentTaskPage + 1, setCurrentTaskPage)}
                              disabled={currentTaskPage === totalTaskPages}
                              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                                currentTaskPage === totalTaskPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delete User with Assigned Tasks</h3>
            <p className="text-gray-600 mb-4">
              User <span className="font-semibold">{userToDelete?.name}</span> has {userTasks.length} assigned tasks. 
              What would you like to do with these tasks?
            </p>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Assigned Tasks:</h4>
              <ul className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                {userTasks.map(task => (
                  <li key={task.taskId} className="text-sm py-1 border-b border-gray-100 last:border-0">
                    {task.title || task.taskId}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Reassign tasks to another user (optional):
              </label>
              <select
                value={reassignUserId}
                onChange={(e) => setReassignUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value=""> Leave tasks unassigned </option>
                {users
                  .filter(u => u.userId !== userToDelete?.userId && u.role !== 'admin')
                  .map(user => (
                    <option key={user.userId} value={user.userId}>
                      {user.name} ({user.userId})
                    </option>
                  ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteUser}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteUser(!!reassignUserId)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
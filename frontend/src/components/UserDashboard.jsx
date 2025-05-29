import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { LayoutDashboard } from 'lucide-react';
import { CircleEllipsis } from 'lucide-react';
import { ListChecks } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { FileCheck } from 'lucide-react';
import { Clock } from 'lucide-react';
import { User } from 'lucide-react';

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
      return 'text-yellow-700 bg-yellow-100 rounded px-2 py-1 text-xs';
    case 'In Progress':
      return 'text-blue-700 bg-blue-100 rounded px-2 py-1 text-xs';
    case 'Completed':
      return 'text-green-700 bg-green-100 rounded px-2 py-1 text-xs';
    default:
      return 'text-gray-700 bg-gray-100 rounded px-2 py-1 text-xs';
  }
};

const UserDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(10);

  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('role');
  const userPayload = decodeJwtPayload(token);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'x-user-id': userId,
    'x-user-role': role,
    'Content-Type': 'application/json',
  }), [token, userId, role]);

  useEffect(() => {
    if (!token || !userPayload) {
      window.location.href = '/login';
    }
  }, [token, userPayload]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/tasks/mytasks`, {
        headers,
        params: { userId },
      });
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
      toast.error('Error fetching tasks');
    } finally {
      setLoading(false);
    }
  }, [headers, userId]);

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
  }, [fetchTasks]);

  const DashboardView = () => {
    if (loading) return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
    
    // For recent tasks in dashboard, we'll show first 5 tasks without pagination

    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome back, {userPayload?.name || 'User'}</p>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-blue-500 transition-all hover:shadow-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <ListChecks size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 font-medium">Total Tasks</p>
                  <p className="text-3xl font-bold text-gray-800">{tasks.length}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-green-500 transition-all hover:shadow-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <FileCheck size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 font-medium">Completed</p>
                  <p className="text-3xl font-bold text-gray-800">{completedTasks}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-yellow-500 transition-all hover:shadow-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <CircleEllipsis size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 font-medium">Pending</p>
                  <p className="text-3xl font-bold text-gray-800">{pendingTasks}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-blue-500 transition-all hover:shadow-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Clock size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-gray-800">{inProgressTasks}</p>
                </div>
              </div>
            </div>
          </div>
        
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">Task Progress</h2>
          </div>
          <div className="p-6">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div className="flex rounded-full h-4">
                <div 
                  className="bg-green-500 rounded-l-full" 
                  style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }}
                ></div>
                <div 
                  className="bg-blue-500" 
                  style={{ width: `${tasks.length ? (inProgressTasks / tasks.length) * 100 : 0}%` }}
                ></div>
                <div 
                  className="bg-yellow-500 rounded-r-full" 
                  style={{ width: `${tasks.length ? (pendingTasks / tasks.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span>Completed ({completedTasks})</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                <span>In Progress ({inProgressTasks})</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                <span>Pending ({pendingTasks})</span>
              </div>
            </div>
          </div>
        </div>
          
        <div className="px-6 py-4 border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Recent Tasks</h2>
            <button 
              onClick={() => setActiveTab('tasks')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          
          {tasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No tasks assigned</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.slice(0, 5).map((task) => (
                    <tr key={task.taskId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.taskId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusClass(task.status)}>{task.status || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(task.deadline).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TasksView = () => {
    if (loading) return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
    
    // Get current tasks for pagination
    const indexOfLastTask = currentPage * tasksPerPage;
    const indexOfFirstTask = indexOfLastTask - tasksPerPage;
    const currentTasks = tasks.slice(indexOfFirstTask, indexOfLastTask);
    const totalPages = Math.ceil(tasks.length / tasksPerPage);
    
    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">My Tasks</h1>
          <p className="text-gray-600">Manage and update your assigned tasks</p>
        </div>
        
        {tasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-500 mb-4">
              <ListChecks size={32} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Tasks Assigned</h2>
            <p className="text-gray-600">You don't have any tasks assigned to you at the moment.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Update</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentTasks.map((task) => (
                    <tr key={task.taskId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.taskId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{task.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock size={16} className="mr-1 text-gray-400" />
                          {new Date(task.deadline).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusClass(task.status)}>{task.status || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {updating[task.taskId] ? (
                          <span className="text-sm text-gray-500">Updating...</span>
                        ) : (
                          <select
                            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
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
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => paginate(i + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === i + 1
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
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
          </div>
        )}
      </div>
    );
  };
  

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-600 to-blue-800 shadow-md z-20 flex items-center justify-between px-6">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white mr-2">
            <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"></path>
            <circle cx="18" cy="18" r="3"></circle>
            <path d="M18 14v1"></path>
            <path d="M18 21v1"></path>
            <path d="M22 18h-1"></path>
            <path d="M15 18h-1"></path>
          </svg>
          <h1 className="text-xl font-bold text-white">Task Management System</h1>
        </div>
        
        <div className="navbar flex items-center">
          <div className="flex items-center bg-white/10 rounded-full pl-2 pr-4 py-1.5 backdrop-blur-sm">
            <div className="p-1.5 rounded-full bg-white/20 text-white mr-2">
              <User size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{userPayload?.name || 'User'}</p>
              <p className="text-xs text-white/70">{userId}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-md z-10">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold">
                {userPayload?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userPayload?.name || 'User'}</p>
                <p className="text-xs text-gray-500">Team Member</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            <div className="mb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Main</div>
            <button
              className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard className="mr-3" size={18} />
              <span className="font-medium">Dashboard</span>
            </button>
            
            <div className="mb-2 mt-6 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Work</div>
            <button
              className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors ${
                activeTab === 'tasks' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('tasks')}
            >
              <ListChecks className="mr-3" size={18} />
              <span className="font-medium">Tasks</span>
            </button>
          </nav>
          
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="mr-3" size={18} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 pt-20 px-8 pb-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'tasks' && <TasksView />}
      </div>
    </div>
  );
};

export default UserDashboard;
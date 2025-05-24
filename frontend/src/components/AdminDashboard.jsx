import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { LayoutDashboard } from 'lucide-react';
import { Users } from 'lucide-react';
import { ListChecks } from 'lucide-react';
import { LogOut } from 'lucide-react';




const API_BASE = process.env.REACT_APP_API_BASE;
;

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
      <label htmlFor={id || name} className="mb-1 font-semibold">
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
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...rest}
    />
  </div>
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, users, tasks
  const [tasks, setTasks] = useState([]);

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
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');

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
}, [activeTab, fetchUsers,fetchTasks]);

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
    } catch (err) {
      toast.error('Failed to assign task,');
      console.error(err);
    } finally {
      setLoadingAssignTask(false);
    }
  };
  

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  // const getStatusClass = (status) => {
  //   switch ((status || '').toLowerCase()) {
  //     case 'completed':
  //       return 'text-green-600 font-light';
  //     case 'pending':
  //       return 'text-orange-500 font-light';
  //     case 'in progress':
  //       return 'text-blue-600 font-light';
  //     default:
  //       return 'text-gray-500 font-medium';
  //   }
  // };

const usersWithTasks = users.map(user => ({
  ...user,
  tasks: tasks.filter(task => task.assignedTo === user.userId)
}));




  return (
    <div className="flex flex-col min-h-screen ">
      {/* Navbar */}
     <header className="ml-48 border border-gray-200  px-6 py-4 z-10 relative flex justify-between items-center">
     
        <div>

        </div>
        <p>Welcome, {userPayload?.name || userPayload?.userId || 'Admin'} </p>

      </header>

      
      <div className="flex flex-1 ">
        {/* Sidebar */}
        <nav className="fixed top-0 left-0 h-full w-48 bg-gray-100 z-50 shadow p-4 space-y-4 flex flex-col ">
          <button
         
            onClick={() => setActiveTab('dashboard')}
            className={`text-left px-3 py-2 rounded mt-14 ${
              activeTab === 'dashboard'
                ? 'bg-blue-500 text-white '
                : 'hover:bg-blue-200'
            }`}
          >
            <LayoutDashboard className="inline-block mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`text-left px-3 py-3 rounded ${
              activeTab === 'users' ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-blue-200'
            }`}
          >
            <Users className="inline-block mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`text-left px-3 py-3 mb-8 rounded ${
              activeTab === 'tasks' ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-blue-200'
            }`}
          >
            <ListChecks className="inline-block mr-2" />
            Tasks
          </button>
        
           <button
          onClick={handleLogout}
          className="text-left bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-3 rounded"
        >
          <LogOut className="inline-block mr-1"/>
          Logout
        </button>
        </nav>

        {/* Main Content */}
       <main className="flex-1 p-6 overflow-auto ml-48 bg-white">
    {activeTab === 'dashboard' && (
  <section className="max-w-5xl overflow-auto p-6">
    <div className='flex flex-row gap-5'>
    <div className='shadow-lg px-3 py-4 w-1/2 bg-white rounded border-l-8 border-blue-500'>
    <div className='flex items-center gap-2 mb-3'>
    <LayoutDashboard color='blue' />
      <p>Number of Users </p>
    </div>
     
      <div>
   <p className='text-3xl fomt-normal'>{users.length}</p>
      </div>  
    </div>
     <div className='shadow-lg px-3 py-4 w-1/2 bg-white rounded border-l-8 border-green-500'>
    <div className='flex items-center gap-2 mb-3'>
    <ListChecks color='green' />
      <p>Number of Task </p>
    </div>
     
      <div>
   <p className='text-3xl fomt-normal'>{tasks.length}</p>
      </div>  
    </div>
    
    </div>
    
    <h2 className="text-2xl font-semibold mb-4  mt-16"> Users</h2>
    {loadingUsers && <p>Loading users...</p>}
    {usersError && <p className="text-red-600">{usersError}</p>}
    {!loadingUsers && users.length === 0 && <p>No users found.</p>}
    {!loadingUsers && users.length > 0 && (
     <table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> ID</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
    </tr>
  </thead>
   <tbody className="bg-white divide-y divide-gray-200">
       {usersWithTasks
  .filter(user => user.role !== 'admin') // Exclude admins
  .map((user) => (
    <tr key={user.id}>
      <td className="px-6 py-4 whitespace-nowrap">{user.userId}</td>
      <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
      <td className="px-6 py-4 whitespace-nowrap">{user.contact}</td>
      <td className="px-6 py-4 whitespace-normal break-words">
        {user.tasks.length > 0 
          ? user.tasks.map(task => task.title).join(", ") 
          : "No tasks assigned"}
      </td>
    </tr>
))}
      </tbody>
</table>

    )}
  </section>
)}

          {activeTab === 'users' && (
            <section className="max-w-lg ">
              <h2 className="text-2xl font-semibold mb-4">Create User</h2>
              {userError && (
                <p className="text-red-600 font-semibold mb-2" role="alert">
                  {userError}
                </p>
              )}
              <InputField
                label="User ID"
                id="userId"
                name="userId"
                value={userForm.userId}
                onChange={handleUserInput}
                placeholder="User ID"
              />
              <InputField
                label="Name"
                id="name"
                name="name"
                value={userForm.name}
                onChange={handleUserInput}
                placeholder="Name"
              />
              <InputField
                label="Email"
                id="contact"
                name="contact"
                type="email"
                value={userForm.contact}
                onChange={handleUserInput}
                placeholder="Email"
              />
              <button
                onClick={createUser}
                disabled={
                  loadingCreateUser ||
                  !userForm.userId.trim() ||
                  !userForm.name.trim() ||
                  !userForm.contact.trim()
                }
                className={`text-white bg-black rounded-lg px-4 py-3 mt-4 tracking-wide  ${
                  loadingCreateUser ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loadingCreateUser ? 'Create User' : 'Create User'}
              </button>
            </section>
          )}

          {activeTab === 'tasks' && (
            <>
              <section className="max-w-5xl p-6 rounded  mb-8">
                <h2 className="text-2xl font-semibold mb-4">Create Task</h2>
                {taskError && (
                  <p className="text-red-600 font-semibold mb-2" role="alert">
                    {taskError}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Task ID"
                    id="taskId"
                    name="taskId"
                    value={taskForm.taskId}
                    onChange={handleTaskInput}
                    placeholder="Task ID"
                  />
                  <InputField
                    label="Title"
                    id="title"
                    name="title"
                    value={taskForm.title}
                    onChange={handleTaskInput}
                    placeholder="Title"
                  />
                  <InputField
                    label="Description"
                    id="description"
                    name="description"
                    value={taskForm.description}
                    onChange={handleTaskInput}
                    placeholder="Description"
                  />
                  <InputField
                    label="Deadline"
                    id="deadline"
                    name="deadline"
                    type="datetime-local"
                    value={taskForm.deadline}
                    onChange={handleTaskInput}
                  />
                </div>
                <button
                  onClick={createTask}
                  disabled={
                    loadingCreateTask ||
                    !taskForm.taskId.trim() ||
                    !taskForm.title.trim() ||
                    !taskForm.description.trim()
                  }
                  className={`text-white bg-black rounded-lg px-4 py-3 mt-4 tracking-wide  ${
                    loadingCreateTask ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loadingCreateTask ? 'Create Task' : 'Create Task'}
                </button>
              </section>

              <section className="max-w-5xl p-6  mb-8">
                <h2 className="text-2xl font-semibold mb-4">Assign Task</h2>
                {assignError && (
                  <p className="text-red-600 font-semibold mb-2" role="alert">
                    {assignError}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Task ID"
                    id="assignTaskId"
                    name="taskId"
                    value={assignForm.taskId}
                    onChange={handleAssignInput}
                    placeholder="Task ID"
                  />
                  <InputField
                    label="User ID"
                    id="assignUserId"
                    name="userId"
                    value={assignForm.userId}
                    onChange={handleAssignInput}
                    placeholder="User ID"
                  />
                </div>
                <button
                  onClick={assignTask}
                  disabled={
                    loadingAssignTask ||
                    !assignForm.taskId.trim() ||
                    !assignForm.userId.trim()
                  }
                  className={`text-white bg-black rounded-lg px-4 py-3 mt-4  ${
                    loadingAssignTask ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loadingAssignTask ? 'Assign Task' : 'Assign Task'}
                </button>
              </section>

     <section className="max-w-9xl p-6">
  <h2 className="text-2xl font-semibold mb-4">All Tasks</h2>
  {loadingTasks && <p>Loading tasks...</p>}
  {!loadingTasks && taskError && <p className="text-red-600">{taskError}</p>}
  {!loadingTasks && tasks.length === 0 && <p>No tasks found.</p>}
  {!loadingTasks && tasks.length > 0 && (
   <div className="overflow-x-auto max-w-full">
  <table
    className="tasks-table min-w-full divide-y divide-gray-200"
    style={{ tableLayout: 'fixed' }}
  >
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>Task ID</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }}>Title</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }}>Deadline</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>Status</th>
        {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '140px' }}>Assigned To</th> */}
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {tasks.map((task) => (
        <tr key={task.taskId || task.id}>

   
          <td className="px-6 py-4 whitespace-nowrap">{task.taskId || task.id}</td>
          <td className="px-6 py-4 whitespace-nowrap">{task.title}</td>
          <td className="px-6 py-4 break-words">{task.description}</td>
          <td className="px-6 py-4 whitespace-nowrap">{new Date(task.deadline).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })}</td>
          <td className="px-6 py-4 whitespace-nowrap">{task.status || 'N/A'}</td>
        {/* <td className="px-6 py-4 whitespace-normal break-words" >{task.assignedTo || 'N/A'}</td> */}

        </tr>
      ))}
    </tbody>
  </table>
</div>

  )}
</section>



            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

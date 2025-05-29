'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


const USERS_TABLE = process.env.USERS_TABLE;
const TASKS_TABLE = process.env.TASKS_TABLE;
const DEFAULT_ADMIN_ID = process.env.DEFAULT_ADMIN_ID;
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL;
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.APP_URL;
const FROM_EMAIL = process.env.FROM_EMAIL;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
};



// // RBAC utility
// function checkRole(event, allowedRoles) {
//   const role = event.headers['x-user-role'];
//   return role && allowedRoles.includes(role);
// }

// Utility to generate a random string
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}



// Verify JWT token from Authorization header, return decoded payload or null
function verifyToken(event) {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7); // Remove "Bearer "
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}


// RBAC utility: check token role
function checkRole(event, allowedRoles) {
  const decoded = verifyToken(event);
  if (!decoded || !decoded.role) return false;
  return allowedRoles.includes(decoded.role);
}

// 
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,     
    pass: process.env.GMAIL_APP_PASS,  
  },
});



// login handler with JWT token generation
module.exports.login = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { userId, contact, password } = body;


    if (!password || (!userId && !contact)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing credentials' }),
      };
    }

    let user;

    if (contact) {
      // Query using GSI: ContactIndex
      const result = await dynamoDb.query({
        TableName: USERS_TABLE,
        IndexName: 'ContactIndex',
        KeyConditionExpression: 'contact = :c',
        ExpressionAttributeValues: {
          ':c': contact,
        },
      }).promise();
      user = result.Items[0];
    } else {
      // Fallback to userId
      const result = await dynamoDb.get({
        TableName: USERS_TABLE,
        Key: { userId },
      }).promise();
      user = result.Item;
    }

    if (!user || !user.password) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    // Create JWT token with payload (userId, role, name)
    const tokenPayload = {
      userId: user.userId,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '24h', // token expiry
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({message: 'Login successful',
        token, // return JWT token here
        userId: user.userId,
        role: user.role,
        name: user.name,
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};



// Initial admin setup handler (only admin) - disabled on first run
module.exports.initAdmin = async () => {
  try {
    console.log('InitAdmin started');
    const getParams = {
      TableName: USERS_TABLE,
      Key: { userId: DEFAULT_ADMIN_ID },
    };

    const result = await dynamoDb.get(getParams).promise();
    console.log('Admin fetch result:', result);

    if (result.Item) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Admin creation is disabled after initial setup' }),
      };
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    console.log('Hashed password:', hashedPassword);

    const putParams = {
      TableName: USERS_TABLE,
      Item: {
        userId: DEFAULT_ADMIN_ID,
        name: 'Admin',
        role: 'admin',
        contact: DEFAULT_ADMIN_EMAIL,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    await dynamoDb.put(putParams).promise();
    console.log('Admin created successfully');

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Admin user created successfully' }),
    };
  } catch (err) {
    console.error('Error in initAdmin:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to initialize admin', details: err.message }),
    };
  }
};



// Create a new user (only admin)
module.exports.createUser = async (event) => {
  if (!checkRole(event, ['admin'])) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: only admins can create users' }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const { userId, name, role, contact } = data;

  if (!userId || !name || !role || !contact) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields' }),
    };
  }

  const token = generateToken();
  const hashedToken = await bcrypt.hash(token, 10);
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId,
      name,
      role,
      contact,
      password: '',
      passwordSetupToken: hashedToken,
      tokenExpiresAt: expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const setupLink = `${APP_URL}/setup-password?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;

  try {
    await dynamoDb.put(params).promise();

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: contact,
      subject: 'Set up your account password',
      text: `Hello ${name},\
      \nAn account has been created for you.
      \nClick the link below to set your password (valid for 24 hours):
      \n\n${setupLink}\n\nIf you didn’t expect this email, you can ignore it.`,
    });

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'User created successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
    };
  }
};



// Create a new task (only admin)
module.exports.createTask = async (event) => {
  if (!checkRole(event, ['admin'])) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: only admins can create tasks' }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const { taskId, title, description, deadline, assignedTo } = data;

  if (!taskId || !title || !deadline) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields' }),
    };
  }

  const item = {
    taskId,
    title,
    description: description || '',
    status: 'Pending',
    deadline,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (assignedTo) item.assignedTo = assignedTo;

  try {
    await dynamoDb.put({ TableName: TASKS_TABLE, Item: item }).promise();
    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Task created successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not create task', details: error.message }),
    };
  }
};




module.exports.assignTask = async (event) => {
  console.log('Assign Task Lambda triggered', event);

  if (!checkRole(event, ['admin'])) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: only admins can assign tasks' }),
    };
  }

  let taskId, userId;
  try {
    ({ taskId, userId } = JSON.parse(event.body));
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  if (!taskId || !userId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields: taskId or userId' }),
    };
  }

  try {
    const userResult = await dynamoDb.get({
      TableName: USERS_TABLE,
      Key: { userId },
    }).promise();

    if (!userResult.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: `User with ID ${userId} does not exist` }),
      };
    }

    const taskResult = await dynamoDb.get({
      TableName: TASKS_TABLE,
      Key: { taskId },
    }).promise();

    if (!taskResult.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Task with ID ${taskId} does not exist` }),
      };
    }

    const user = userResult.Item;
    const task = taskResult.Item;

    await dynamoDb.update({
      TableName: TASKS_TABLE,
      Key: { taskId },
      UpdateExpression: 'set assignedTo = :userId, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'UPDATED_NEW',
    }).promise();

    const formattedDeadline = new Date(task.deadline).toLocaleString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true,
});

    const emailText = `
Hello ${user.name},

You have been assigned a new task:

Title: ${task.title}
Deadline: ${formattedDeadline}

Please log in to your dashboard to view and manage the task.

Best regards, 
Task Management Team
    `.trim();

    

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: user.contact, // Make sure user.email exists
      subject: 'Task Assignment',
      text: emailText,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Task assigned and user notified successfully' }),
    };
  } catch (error) {
    console.error('Error assigning task:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not assign task', details: error.message }),
    };
  }
};





// Get all tasks (only admin)
module.exports.getAllTasks = async (event) => {
  if (!checkRole(event, ['admin'])) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: only admins can view all tasks' }),
    };
  }

  try {
    const result = await dynamoDb.scan({ TableName: TASKS_TABLE }).promise();
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not fetch tasks', details: error.message }),
    };
  }
};

// Get tasks assigned to the logged-in user (only user role)
module.exports.getMyTasks = async (event) => {
  console.log('Received event:', JSON.stringify(event));

  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing or invalid Authorization header');
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing or invalid Authorization header' }),
    };
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid or expired token' }),
    };
  }

  const userId = decoded.userId;
  const role = decoded.role;

  if (role !== 'user') {
    console.log('Access denied: not a user');
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: only team members can view their tasks' }),
    };
  }

  const params = {
    TableName: TASKS_TABLE,
    IndexName: 'AssignedToIndex',
    KeyConditionExpression: 'assignedTo = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  };

  try {
    const result = await dynamoDb.query(params).promise();
    console.log('Tasks fetched:', result.Items.length);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error('DynamoDB query error:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not fetch tasks', details: error.message }),
    };
  }
};

// Get upcoming deadlines for the logged-in user
module.exports.getUpcomingDeadlines = async (event) => {
  console.log('Getting upcoming deadlines');

  const decoded = verifyToken(event);
  if (!decoded) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized: Invalid or missing token' }),
    };
  }

  const userId = decoded.userId;
  const role = decoded.role;
  
  try {
    let tasks;
    
    if (role === 'admin') {
      // Admins can see all upcoming deadlines
      const result = await dynamoDb.scan({
        TableName: TASKS_TABLE,
        FilterExpression: '#status <> :completed',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':completed': 'Completed',
        },
      }).promise();
      tasks = result.Items;
    } else {
      // Users can only see their own upcoming deadlines
      const result = await dynamoDb.query({
        TableName: TASKS_TABLE,
        IndexName: 'AssignedToIndex',
        KeyConditionExpression: 'assignedTo = :userId',
        FilterExpression: '#status <> :completed',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':completed': 'Completed',
        },
      }).promise();
      tasks = result.Items;
    }
    
    // Sort tasks by deadline (ascending)
    tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    // Calculate time remaining for each task
    const now = new Date();
    const tasksWithTimeRemaining = tasks.map(task => {
      const deadlineDate = new Date(task.deadline);
      const timeRemaining = deadlineDate - now;
      const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return {
        ...task,
        timeRemaining: {
          days: daysRemaining,
          hours: hoursRemaining,
          total: timeRemaining,
          isPastDue: timeRemaining < 0
        }
      };
    });
    
    // Group tasks by urgency
    const pastDue = tasksWithTimeRemaining.filter(task => task.timeRemaining.isPastDue);
    const dueSoon = tasksWithTimeRemaining.filter(task => 
      !task.timeRemaining.isPastDue && 
      task.timeRemaining.total <= 24 * 60 * 60 * 1000 // Due within 24 hours
    );
    const upcoming = tasksWithTimeRemaining.filter(task => 
      !task.timeRemaining.isPastDue && 
      task.timeRemaining.total > 24 * 60 * 60 * 1000
    );
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        pastDue,
        dueSoon,
        upcoming,
        totalTasks: tasksWithTimeRemaining.length
      }),
    };
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not fetch upcoming deadlines', details: error.message }),
    };
  }
};



// Update task status (both admin and assigned user)
module.exports.updateTaskStatus = async (event) => {
  const data = JSON.parse(event.body);
  const { taskId, status } = data;

  // Get user info from JWT token instead of headers
  const decoded = verifyToken(event);
  if (!decoded) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized: Invalid or missing token' }),
    };
  }

  const userId = decoded.userId;
  const role = decoded.role;

  if (!taskId || !status) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields' }),
    };
  }

  // Fetch the task
  try {
    const getParams = {
      TableName: TASKS_TABLE,
      Key: { taskId },
    };

    const taskResult = await dynamoDb.get(getParams).promise();

    if (!taskResult.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Task not found' }),
      };
    }

    const task = taskResult.Item;

    // Check permissions: admin can update any task, user can only update their assigned tasks
    if (role !== 'admin' && task.assignedTo !== userId) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'You are not authorized to update this task' }),
      };
    }

    // Update the task status
    const updateParams = {
      TableName: TASKS_TABLE,
      Key: { taskId },
      UpdateExpression: 'set #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'UPDATED_NEW',
    };

    await dynamoDb.update(updateParams).promise();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Task status updated successfully' }),
    };
  } catch (error) {
    console.error('Error updating task status:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not update task status', details: error.message }),
    };
  }
};




// Set password fuction
module.exports.setPassword = async (event) => {
  console.log("Received event:", JSON.stringify(event)); 

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    console.error("JSON parsing error:", error);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const { userId, token, newPassword } = data;

  if (!userId || !token || !newPassword) {
    console.warn("Missing fields:", { userId, token, newPassword });
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields' }),
    };
  }

  try {
    const result = await dynamoDb.get({
      TableName: USERS_TABLE,
      Key: { userId },
    }).promise();

    const user = result.Item;
    if (!user || !user.passwordSetupToken || !user.tokenExpiresAt) {
      console.warn("User record invalid or token info missing");
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      };
    }

    if (Date.now() > user.tokenExpiresAt) {
      console.warn("Token expired");
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Token has expired' }),
      };
    }

    const isValid = await bcrypt.compare(token, user.passwordSetupToken);
    if (!isValid) {
      console.warn("Token does not match");
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await dynamoDb.update({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET #password = :pwd, updatedAt = :now REMOVE passwordSetupToken, tokenExpiresAt',
      ExpressionAttributeNames: {
        '#password': 'password',
      },
      ExpressionAttributeValues: {
        ':pwd': hashedPassword,
        ':now': new Date().toISOString(),
      },
    }).promise();

    console.log("Password updated successfully");
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Password set successfully' }),
    };

  } catch (err) {
    console.error("Server error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server error', details: err.message }),
    };
  }
};


// Delete task (only admin)
module.exports.deleteTask = async (event) => {
  console.log('Delete task event:', JSON.stringify(event));
  
  if (!checkRole(event, ['admin'])) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: only admins can delete tasks' }),
    };
  }

  const taskId = event.pathParameters?.taskId;
  if (!taskId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing task ID' }),
    };
  }

  try {
    console.log(`Attempting to delete task with ID: ${taskId}`);
    
    // Check if task exists
    const getResult = await dynamoDb.get({
      TableName: TASKS_TABLE,
      Key: { taskId },
    }).promise();

    console.log('Task lookup result:', JSON.stringify(getResult));

    if (!getResult.Item) {
      console.log(`Task with ID ${taskId} not found`);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Task not found' }),
      };
    }

    // Delete the task
    await dynamoDb.delete({
      TableName: TASKS_TABLE,
      Key: { taskId },
    }).promise();

    console.log(`Task ${taskId} deleted successfully`);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Task deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting task:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not delete task', details: error.message }),
    };
  }
};

// Update task details (admin and assigned users)
module.exports.updateTaskDetails = async (event) => {
  // Get user info from JWT token
  const decoded = verifyToken(event);
  if (!decoded) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized: Invalid or missing token' }),
    };
  }
  
  const userId = decoded.userId;
  const role = decoded.role;

  const taskId = event.pathParameters?.taskId;
  if (!taskId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing task ID' }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const { title, description, deadline, status } = data;
  if (!title && !description && !deadline && !status) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing update fields: provide at least one of title, description, deadline, or status' }),
    };
  }

  try {
    // Check if task exists
    const getResult = await dynamoDb.get({
      TableName: TASKS_TABLE,
      Key: { taskId },
    }).promise();

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Task not found' }),
      };
    }
    
    const task = getResult.Item;
    
    // Check permissions: admin can update any task, user can only update their assigned tasks
    if (role !== 'admin' && task.assignedTo !== userId) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'You are not authorized to update this task' }),
      };
    }

    // Build update expression and attribute values dynamically
    let updateExpression = 'set updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString(),
    };
    let expressionAttributeNames = null;

    if (title) {
      updateExpression += ', title = :title';
      expressionAttributeValues[':title'] = title;
    }

    if (description !== undefined) {
      updateExpression += ', description = :description';
      expressionAttributeValues[':description'] = description;
    }

    if (deadline) {
      updateExpression += ', deadline = :deadline';
      expressionAttributeValues[':deadline'] = deadline;
    }
    
    if (status) {
      updateExpression += ', #status = :status';
      expressionAttributeNames = expressionAttributeNames || {};
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
    }

    // Update the task details
    const updateParams = {
      TableName: TASKS_TABLE,
      Key: { taskId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'UPDATED_NEW',
    };
    
    // Add ExpressionAttributeNames if needed
    if (expressionAttributeNames) {
      updateParams.ExpressionAttributeNames = expressionAttributeNames;
    }
    
    await dynamoDb.update(updateParams).promise();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Task details updated successfully' }),
    };
  } catch (error) {
    console.error('Error updating task details:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not update task details', details: error.message }),
    };
  }
};

// Get all users (only admin)
module.exports.getAllUsers = async (event) => {
  if (!checkRole(event, ['admin'])) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: only admins can view users' }),
    };
  }

  try {
    const result = await dynamoDb.scan({ TableName: USERS_TABLE }).promise();
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error('Error fetching users:', error.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not fetch users', details: error.message }),
    };
  }
};

// Delete user (only admin)
module.exports.deleteUser = async (event) => {
  console.log('Delete user event:', JSON.stringify(event));
  
  if (!checkRole(event, ['admin'])) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: only admins can delete users' }),
    };
  }

  const userId = event.pathParameters?.userId;
  if (!userId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing user ID' }),
    };
  }

  // Don't allow deleting the admin user
  if (userId === DEFAULT_ADMIN_ID) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Cannot delete the admin user' }),
    };
  }

  // Parse query parameters to check for force delete
  const queryParams = event.queryStringParameters || {};
  const forceDelete = queryParams.force === 'true';
  const reassignTo = queryParams.reassignTo;

  try {
    console.log(`Attempting to delete user with ID: ${userId}`);
    
    // Check if user exists
    const getResult = await dynamoDb.get({
      TableName: USERS_TABLE,
      Key: { userId },
    }).promise();

    console.log('User lookup result:', JSON.stringify(getResult));

    if (!getResult.Item) {
      console.log(`User with ID ${userId} not found`);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    // Check if user has assigned tasks
    const tasksResult = await dynamoDb.query({
      TableName: TASKS_TABLE,
      IndexName: 'AssignedToIndex',
      KeyConditionExpression: 'assignedTo = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }).promise();

    const hasTasks = tasksResult.Items && tasksResult.Items.length > 0;
    
    if (hasTasks && !forceDelete) {
      console.log(`User ${userId} has ${tasksResult.Items.length} assigned tasks`);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Cannot delete user with assigned tasks', 
          count: tasksResult.Items.length,
          tasks: tasksResult.Items.map(task => ({ taskId: task.taskId, title: task.title }))
        }),
      };
    }

    // If force delete and there are tasks, handle them
    if (hasTasks && forceDelete) {
      console.log(`Force deleting user ${userId} with ${tasksResult.Items.length} tasks`);
      
      // If reassignTo is provided, reassign tasks to another user
      if (reassignTo) {
        console.log(`Reassigning tasks to user ${reassignTo}`);
        
        // Verify the reassignTo user exists
        const reassignUserResult = await dynamoDb.get({
          TableName: USERS_TABLE,
          Key: { userId: reassignTo },
        }).promise();
        
        if (!reassignUserResult.Item) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: `Reassign user ${reassignTo} not found` }),
          };
        }
        
        // Reassign all tasks
        for (const task of tasksResult.Items) {
          await dynamoDb.update({
            TableName: TASKS_TABLE,
            Key: { taskId: task.taskId },
            UpdateExpression: 'set assignedTo = :newUserId, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':newUserId': reassignTo,
              ':updatedAt': new Date().toISOString(),
            },
          }).promise();
        }
        
        console.log(`Reassigned ${tasksResult.Items.length} tasks to user ${reassignTo}`);
      } else {
        // If no reassignTo, remove assignment from tasks
        console.log('Removing task assignments');
        
        for (const task of tasksResult.Items) {
          await dynamoDb.update({
            TableName: TASKS_TABLE,
            Key: { taskId: task.taskId },
            UpdateExpression: 'REMOVE assignedTo SET updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':updatedAt': new Date().toISOString(),
            },
          }).promise();
        }
        
        console.log(`Removed assignments from ${tasksResult.Items.length} tasks`);
      }
    }

    // Delete the user
    await dynamoDb.delete({
      TableName: USERS_TABLE,
      Key: { userId },
    }).promise();

    console.log(`User ${userId} deleted successfully`);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'User deleted successfully',
        tasksHandled: hasTasks ? tasksResult.Items.length : 0,
        tasksReassigned: reassignTo ? true : false
      }),
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not delete user', details: error.message }),
    };
  }
};
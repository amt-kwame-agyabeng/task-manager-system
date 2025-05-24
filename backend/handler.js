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
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-user-id,x-user-role',
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
      expiresIn: '22h', // token expiry
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


// Update task status  (assigned user)
// Update task status (assigned user)
module.exports.updateTaskStatus = async (event) => {
  const data = JSON.parse(event.body);
  const { taskId, status } = data;

  const userId = event.headers['x-user-id'] || event.headers['X-User-Id'];
  const role = event.headers['x-user-role'] || event.headers['X-User-Role'];

  if (!taskId || !status || !userId || !role) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields or headers' }),
    };
  }

  if (role !== 'user') {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: only assigned users can update task status' }),
    };
  }

  // Fetch the task to verify assignment
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

    if (task.assignedTo !== userId) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'You are not assigned to this task' }),
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
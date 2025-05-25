'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// Function to check for upcoming deadlines and send notifications
exports.checkDeadlines = async (event) => {
  console.log('Checking for upcoming task deadlines');
  
  try {
    // Get all tasks
    const tasksResult = await dynamoDb.scan({
      TableName: process.env.TASKS_TABLE,
    }).promise();
    
    const tasks = tasksResult.Items;
    const now = new Date();
    const notificationThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Filter tasks that are:
    // 1. Assigned to someone
    // 2. Not completed
    // 3. Have a deadline within the next 24 hours
    // 4. Haven't been notified yet for this deadline window
    const upcomingDeadlineTasks = tasks.filter(task => {
      if (!task.assignedTo || task.status === 'Completed' || task.deadlineNotificationSent) {
        return false;
      }
      
      const deadlineDate = new Date(task.deadline);
      const timeUntilDeadline = deadlineDate - now;
      
      // Task deadline is within the next 24 hours
      return timeUntilDeadline > 0 && timeUntilDeadline <= notificationThreshold;
    });
    
    console.log(`Found ${upcomingDeadlineTasks.length} tasks with upcoming deadlines`);
    
    // Process each task with upcoming deadline
    for (const task of upcomingDeadlineTasks) {
      // Get user information
      const userResult = await dynamoDb.get({
        TableName: process.env.USERS_TABLE,
        Key: { userId: task.assignedTo }
      }).promise();
      
      const user = userResult.Item;
      if (!user) {
        console.log(`User ${task.assignedTo} not found for task ${task.taskId}`);
        continue;
      }
      
      // Format deadline for display
      const deadlineDate = new Date(task.deadline);
      const formattedDeadline = deadlineDate.toLocaleString('en-US', {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true
      });
      
      // Calculate hours remaining
      const hoursRemaining = Math.round((deadlineDate - now) / (60 * 60 * 1000));
      
      // Send email notification
      const emailText = `
Hello ${user.name},

REMINDER: You have a task due in approximately ${hoursRemaining} hours.

Task Details:
- Title: ${task.title}
- Description: ${task.description || 'No description provided'}
- Deadline: ${formattedDeadline}
- Current Status: ${task.status}

Please log in to your dashboard to update the task status or contact your administrator if you need assistance.

Best regards,
Task Management System
      `.trim();
      
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: user.contact,
        subject: `⚠️ REMINDER: Task "${task.title}" due in ${hoursRemaining} hours`,
        text: emailText,
      });
      
      console.log(`Deadline notification sent to ${user.contact} for task ${task.taskId}`);
      
      // Update task to mark that a notification was sent
      await dynamoDb.update({
        TableName: process.env.TASKS_TABLE,
        Key: { taskId: task.taskId },
        UpdateExpression: 'SET deadlineNotificationSent = :sent, updatedAt = :now',
        ExpressionAttributeValues: {
          ':sent': true,
          ':now': new Date().toISOString()
        }
      }).promise();
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully processed ${upcomingDeadlineTasks.length} tasks with upcoming deadlines`
      })
    };
    
  } catch (error) {
    console.error('Error checking deadlines:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process deadline notifications',
        details: error.message
      })
    };
  }
};

// Function to reset notification flags for tasks that are no longer within the notification window
exports.resetNotificationFlags = async (event) => {
  console.log('Resetting notification flags for tasks outside notification window');
  
  try {
    // Get all tasks that have been notified
    const tasksResult = await dynamoDb.scan({
      TableName: process.env.TASKS_TABLE,
      FilterExpression: 'attribute_exists(deadlineNotificationSent)',
    }).promise();
    
    const notifiedTasks = tasksResult.Items;
    const now = new Date();
    const notificationThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Find tasks that are no longer within the notification window
    const tasksToReset = notifiedTasks.filter(task => {
      if (task.status === 'Completed') {
        return true; // Always reset completed tasks
      }
      
      const deadlineDate = new Date(task.deadline);
      const timeUntilDeadline = deadlineDate - now;
      
      // Reset if deadline has passed or is more than 24 hours away
      return timeUntilDeadline <= 0 || timeUntilDeadline > notificationThreshold;
    });
    
    console.log(`Found ${tasksToReset.length} tasks to reset notification flags`);
    
    // Reset notification flags
    for (const task of tasksToReset) {
      await dynamoDb.update({
        TableName: process.env.TASKS_TABLE,
        Key: { taskId: task.taskId },
        UpdateExpression: 'REMOVE deadlineNotificationSent SET updatedAt = :now',
        ExpressionAttributeValues: {
          ':now': new Date().toISOString()
        }
      }).promise();
      
      console.log(`Reset notification flag for task ${task.taskId}`);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully reset notification flags for ${tasksToReset.length} tasks`
      })
    };
    
  } catch (error) {
    console.error('Error resetting notification flags:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to reset notification flags',
        details: error.message
      })
    };
  }
};
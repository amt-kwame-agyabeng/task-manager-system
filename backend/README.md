# Task Management System - Backend

This is the serverless backend for the Task Management System, built with AWS Lambda, API Gateway, and DynamoDB to provide a scalable and cost-effective solution.

## Overview

The backend provides a complete API for task management, user authentication, and data storage. It uses a serverless architecture to ensure high availability and automatic scaling based on demand.

## Technologies Used

- **AWS Lambda**: For serverless function execution
- **Amazon API Gateway**: For RESTful API endpoints
- **Amazon DynamoDB**: For NoSQL database storage
- **Serverless Framework**: For infrastructure as code and deployment
- **Node.js**: Runtime environment
- **JWT**: For secure authentication
- **bcryptjs**: For password hashing
- **Nodemailer**: For sending email notifications for user registration and task assignments

## Project Structure

```
backend/
├── handler.js          # Main Lambda functions
├── deadlineNotifier.js # Scheduled functions for deadline notifications
├── serverless.yml      # Serverless Framework configuration
├── package.json        # Dependencies and scripts
└── .env                # Environment variables (not in repository)
```

## API Endpoints

### Authentication

- **POST /login**: Authenticate user and return JWT token
- **POST /set-password**: Set or reset user password

### User Management

- **GET /users**: Get all users (admin only)
- **POST /users/create**: Create a new user (admin only)
- **DELETE /users/{userId}**: Delete a user (admin only)

### Task Management

- **GET /tasks**: Get all tasks (admin only)
- **GET /tasks/mytasks**: Get tasks assigned to the logged-in user
- **GET /tasks/upcoming-deadlines**: Get tasks with upcoming deadlines
- **POST /tasks/create**: Create a new task (admin only)
- **POST /tasks/assign**: Assign a task to a user (admin only)
- **POST /tasks/update-status**: Update task status
- **PUT /tasks/{taskId}**: Update task details
- **DELETE /tasks/{taskId}**: Delete a task (admin only)

## Database Schema

### Users Table

- **userId** (String): Primary key
- **name** (String): User's full name
- **role** (String): User role ('admin' or 'user/team member')
- **contact** (String): Email address (with GSI for lookup)
- **password** (String): Hashed password
- **createdAt** (String): ISO timestamp
- **updatedAt** (String): ISO timestamp

### Tasks Table

- **taskId** (String): Primary key
- **title** (String): Task title
- **description** (String): Task description
- **status** (String): Task status ('Pending', 'In Progress', 'Completed')
- **deadline** (String): ISO timestamp for deadline
- **assignedTo** (String): User ID of assigned user (with GSI for lookup)
- **createdAt** (String): ISO timestamp
- **updatedAt** (String): ISO timestamp

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- AWS account
- AWS CLI configured with appropriate permissions
- Serverless Framework installed globally (`npm install -g serverless`)

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
DEFAULT_ADMIN_ID=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=securepassword
JWT_SECRET=your-jwt-secret-key
APP_URL=http://localhost:3000
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASS=your-gmail-app-password
```

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Deploy to AWS:
   ```
   serverless deploy
   ```

3. Initialize the admin user(this is a one-time operation; the function is disabled after first run):
   ```
   curl -X POST https://your-api-endpoint.execute-api.region.amazonaws.com/dev/init-admin
   ```

## Deployment

The backend is deployed using the Serverless Framework, which creates all necessary AWS resources automatically.

### Deploy to AWS

```
serverless deploy
```

This command deploys:
- Lambda functions
- API Gateway endpoints
- DynamoDB tables
- IAM roles and permissions
- CloudWatch event triggers for scheduled functions

### Environment-Specific Deployment

```
serverless deploy --stage production
```

## Security Features

1. **Password Security**:
   - Passwords are hashed using bcrypt
   - Password reset tokens are time-limited

2. **Authentication**:
   - JWT tokens with expiration
   - Role-based access control

3. **Data Protection**:
   - Input validation on all endpoints
   - DynamoDB encryption at rest

## Email Notifications

The system uses Nodemailer with Gmail SMTP to send automated emails for:

1. **User Registration**: 
   - When an admin creates a new user, the system sends an email with a password setup link
   - The link contains a secure token valid for 24 hours

2. **Task Assignment**: 
   - When a task is assigned to a user, they receive an email notification
   - The email includes task details, deadline, and instructions to access the dashboard

## Scheduled Functions

The system includes scheduled Lambda functions that:

1. **Check Deadlines**: Runs hourly to check for upcoming task deadlines
2. **Reset Notification Flags**: Runs every 6 hours to reset notification flags

## Troubleshooting

### Common Issues

1. **Deployment Failures**:
   - Check AWS credentials are properly configured
   - Verify you have sufficient permissions in your AWS account
   - Look at CloudFormation logs for detailed error information

2. **API Errors**:
   - Check Lambda logs in CloudWatch
   - Verify environment variables are set correctly
   - Test endpoints with Postman or curl to isolate issues

3. **Email Notification Issues**:
   - Verify GMAIL_USER and GMAIL_APP_PASS are correct
   - Check if Gmail's "Less secure app access" settings need adjustment
   - Look for email sending errors in Lambda logs
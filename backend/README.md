# Task Management System - Backend

The backend component of the Task Management System, built with Serverless Framework, AWS Lambda, and DynamoDB.

## Architecture

This backend follows a serverless architecture pattern using:

- **AWS Lambda**: For executing code in response to events
- **API Gateway**: For handling HTTP requests
- **DynamoDB**: NoSQL database for storing application data
- **Serverless Framework**: For infrastructure as code and deployment

## Core Components

### 1. API Endpoints

| Endpoint | Method | Description | Role |
|----------|--------|-------------|------|
| `/login` | POST | Authenticate users | Public |
| `/set-password` | POST | Set user password | Public |
| `/users` | GET | Get all users | Admin |
| `/users/create` | POST | Create a new user | Admin |
| `/users/{userId}` | DELETE | Delete a user | Admin |
| `/tasks` | GET | Get all tasks | Admin |
| `/tasks/create` | POST | Create a new task | Admin |
| `/tasks/assign` | POST | Assign task to user | Admin |
| `/tasks/mytasks` | GET | Get tasks assigned to current user | User |
| `/tasks/upcoming-deadlines` | GET | Get tasks with upcoming deadlines | User/Admin |
| `/tasks/update-status` | POST | Update task status | User |
| `/tasks/{taskId}` | DELETE | Delete a task | Admin |
| `/tasks/{taskId}` | PUT | Update task deadline | Admin |

### 2. Database Schema

#### Users Table

| Attribute | Type | Description |
|-----------|------|-------------|
| userId | String | Primary key |
| name | String | User's full name |
| role | String | User role (admin/user) |
| contact | String | User's email address |
| password | String | Hashed password |
| passwordSetupToken | String | Token for password setup (temporary) |
| tokenExpiresAt | Number | Expiration timestamp for setup token |
| createdAt | String | Creation timestamp |
| updatedAt | String | Last update timestamp |

#### Tasks Table

| Attribute | Type | Description |
|-----------|------|-------------|
| taskId | String | Primary key |
| title | String | Task title |
| description | String | Task description |
| status | String | Task status (Pending/In Progress/Completed) |
| deadline | String | Task deadline timestamp |
| assignedTo | String | User ID of assigned user |
| deadlineNotificationSent | Boolean | Whether notification has been sent |
| createdAt | String | Creation timestamp |
| updatedAt | String | Last update timestamp |

### 3. Core Files

- **handler.js**: Contains all API endpoint handlers
- **deadlineNotifier.js**: Contains scheduled functions for deadline notifications
- **authMiddleware.js**: Authentication and authorization utilities
- **serverless.yml**: Infrastructure configuration

## Authentication & Authorization

- JWT-based authentication system
- Role-based access control (RBAC)
- Secure password handling with bcrypt

## Scheduled Tasks

| Function | Schedule | Description |
|----------|----------|-------------|
| checkDeadlines | Every hour | Checks for upcoming deadlines and sends notifications |
| resetNotificationFlags | Every 6 hours | Resets notification flags for tasks outside notification window |

## Environment Variables

| Variable | Description |
|----------|-------------|
| USERS_TABLE | DynamoDB table name for users |
| TASKS_TABLE | DynamoDB table name for tasks |
| DEFAULT_ADMIN_ID | Default admin user ID |
| DEFAULT_ADMIN_EMAIL | Default admin email |
| DEFAULT_ADMIN_PASSWORD | Default admin password |
| JWT_SECRET | Secret key for JWT signing |
| APP_URL | Frontend application URL |
| GMAIL_USER | Gmail account for sending notifications |
| GMAIL_APP_PASS | Gmail app password |

## Setup & Deployment

### Prerequisites

- Node.js (v14+)
- AWS Account with appropriate permissions
- Serverless Framework CLI
- AWS CLI configured with credentials

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with required environment variables:
   ```
   cp .env.example .env
   ```

3. Run locally using Serverless Offline (if needed):
   ```
   serverless offline
   ```

### Deployment

Deploy to AWS:
```
serverless deploy
```

For a specific stage (e.g., dev, prod):
```
serverless deploy --stage prod
```

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens expire after 23 hours
- CORS is configured to allow only specific origins
- IAM roles are configured with least privilege principle
- Environment variables are used for sensitive information

## Monitoring & Logging

- CloudWatch Logs for Lambda function logs
- CloudWatch Metrics for monitoring function performance
- Error handling with detailed logging

## Testing

Run tests:
```
npm test
```
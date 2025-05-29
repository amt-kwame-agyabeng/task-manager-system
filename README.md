# Task Management System

A comprehensive task management application built with React frontend and AWS serverless backend that allows organizations to manage tasks, assign them to team members, and track their progress.

**Live Demo:** [https://d3g452bocfjgmb.cloudfront.net/](https://d3g452bocfjgmb.cloudfront.net/)

## Overview

This Task Management System provides a complete solution for task management with separate interfaces for administrators and regular users. Administrators can create, assign, and manage tasks, while users can view and update the status of tasks assigned to them.

## Features

- **User Authentication**: Secure login system with JWT-based authentication
- **Role-Based Access Control**: Different interfaces and permissions for admins and regular users
- **Task Management**: Create, assign, update, and delete tasks
- **User Management**: Add and manage team members
- **Status Tracking**: Track task progress with status updates (Pending, In Progress, Completed)
- **Dashboard**: Visual overview of task statistics and progress
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

The project is organized into two main directories:

- **`/frontend`**: Contains the React application for the user interface
- **`/backend`**: Contains the serverless AWS Lambda functions and API definitions

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- AWS account (for deployment)
- AWS CLI configured locally

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/task-management-system.git
   cd task-management-system
   ```

2. Install dependencies for both frontend and backend:
   ```
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the backend directory (see backend README for details)
   - Create a `.env` file in the frontend directory (see frontend README for details)

### Running Locally

1. Start the frontend development server:
   ```
   cd frontend
   npm start
   ```

2. For backend development, you can use the Serverless Framework offline plugin:
   ```
   cd backend
   npm run dev
   ```

## Deployment

### Frontend Deployment

The frontend can be deployed to AWS S3 and CloudFront. See the frontend README for detailed instructions.

### Backend Deployment

The backend is deployed using the Serverless Framework to AWS Lambda and API Gateway. See the backend README for detailed instructions.

## Initial Setup

After deployment, you'll need to:

1. Initialize the admin user by making a request to the init-admin endpoint
2. Log in with the default admin credentials (specified in your backend .env file)
3. Start creating users and tasks

## Documentation

For more detailed information, please refer to:

- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)



## Acknowledgments

- React for the frontend framework
- AWS for serverless infrastructure
- Serverless Framework for deployment
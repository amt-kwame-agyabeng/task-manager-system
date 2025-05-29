# Task Management System - Frontend

This is the frontend application for the Task Management System, built with React and modern web technologies to provide an intuitive interface for task management.

## Overview

The frontend application provides two main interfaces:

1. **Admin Dashboard**: For administrators to manage users, create tasks, assign tasks to users, and monitor overall progress
2. **User Dashboard**: For team members to view and update the status of tasks assigned to them

## Technologies Used

- **React**: JavaScript library for building user interfaces
- **Axios**: HTTP client for API requests
- **React Router**: For navigation between different views
- **Tailwind CSS**: For styling and responsive design
- **Lucide React**: For icons
- **React Hot Toast**: For notifications
- **JWT**: For secure authentication

## Project Structure

```
frontend/
├── public/             # Public assets
├── src/                # Source code
│   ├── components/     # React components
│   │   ├── AdminDashboard.jsx  # Admin interface
│   │   ├── UserDashboard.jsx   # User interface
│   │   ├── Login.jsx           # Login page
│   │   └── ...                 # Other components
│   ├── App.js          # Main application component
│   ├── index.js        # Entry point
│   └── ...             # Other files
├── package.json        # Dependencies and scripts
└── .env                # Environment variables
```

## Key Components

### AdminDashboard.jsx

The admin dashboard provides functionality for:
- Creating and managing users
- Creating tasks
- Assigning tasks to users
- Updating task details and status
- Deleting tasks
- Viewing statistics and progress

### UserDashboard.jsx

The user dashboard allows team members to:
- View tasks assigned to them
- Update task status (Pending, In Progress, Completed)
- View task details and deadlines

### Login.jsx

Handles user authentication with:
- Login form
- JWT token storage
- Role-based redirection

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```
REACT_APP_API_BASE=https://your-api-endpoint.execute-api.region.amazonaws.com/dev
```

Replace the URL with your actual API endpoint.

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Build for production:
   ```
   npm run build
   ```

## Deployment

### Build the Application

```
npm run build
```

This creates a `build` directory with optimized production files.

### Deploy to AWS S3 and CloudFront

1. Create an S3 bucket for hosting:
   ```
   aws s3 mb s3://your-bucket-name
   ```

2. Configure the bucket for static website hosting:
   ```
   aws s3 website s3://your-bucket-name --index-document index.html --error-document index.html
   ```

3. Upload the build files:
   ```
   aws s3 sync build/ s3://your-bucket-name --acl public-read
   ```

4. Set up CloudFront distribution for better performance and HTTPS:
   - The application is currently available at: [https://d3g452bocfjgmb.cloudfront.net/](https://d3g452bocfjgmb.cloudfront.net/)

## Usage

### Login

- Use the provided credentials to log in
- The system will automatically redirect to the appropriate dashboard based on user role

### Admin Functions

- **Create Users**: Add team members with email notifications
- **Create Tasks**: Define tasks with titles, descriptions, and deadlines
- **Assign Tasks**: Assign tasks to specific team members
- **Monitor Progress**: View task status and completion rates

### User Functions

- **View Tasks**: See all assigned tasks
- **Update Status**: Change task status as work progresses
- **Dashboard**: View task statistics and upcoming deadlines

## Troubleshooting

### Common Issues

1. **API Connection Problems**:
   - Check that the REACT_APP_API_BASE environment variable is set correctly
   - Verify that CORS is properly configured on the backend

2. **Authentication Issues**:
   - Clear browser storage and try logging in again
   - Check that the JWT token is being properly stored and sent with requests

3. **Display Problems**:
   - If the UI looks broken, make sure Tailwind CSS is properly installed
   - Check for console errors in the browser developer tools
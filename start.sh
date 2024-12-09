#!/bin/bash

# Function to cleanup child processes
cleanup() {
    echo "Cleaning up..."
    kill $(jobs -p)
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Start the backend and frontend servers based on NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
    echo "Starting in production mode..."
    # Start the backend server in production mode
    cd /app/backend && npm run start &

    # Start the frontend in production mode with forced port 5173
    cd /app && npm run preview -- --host --port 5173 &
else
    echo "Starting in development mode..."
    # Start the backend server in watch mode
    cd /app/backend && npm run dev &

    # Start the frontend development server with host binding and port 5173
    cd /app && npm run dev -- --host --port 5173 &
fi

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?

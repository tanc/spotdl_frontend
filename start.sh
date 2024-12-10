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
if [ "$NODE_ENV" != "development" ]; then
    echo "Starting in production mode..."
    # Start the backend server in production mode (which also serves the frontend)
    cd /app/backend && npm run start
else
    echo "Starting in development mode..."
    # Start the backend server
    cd /app/backend && npm run start &

    # Start the frontend dev server
    cd /app && npm run dev -- --host &
fi

# Wait for all background processes
wait

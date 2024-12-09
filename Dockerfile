# Use Node.js base image
FROM node:20-slim

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3-full \
    python3-pip \
    python3-venv \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install spotdl in virtual environment
RUN pip install spotdl

# Create app user and group
ARG USER_ID=1000
ARG GROUP_ID=1000

# Add group if it doesn't exist
RUN if ! getent group $GROUP_ID > /dev/null 2>&1; then \
      groupadd -g $GROUP_ID appuser; \
    else \
      groupmod -n appuser $(getent group $GROUP_ID | cut -d: -f1); \
    fi

# Add user if it doesn't exist
RUN if ! getent passwd $USER_ID > /dev/null 2>&1; then \
      useradd -u $USER_ID -g appuser -m -s /bin/bash appuser; \
    else \
      usermod -l appuser -g appuser -d /home/appuser -m $(getent passwd $USER_ID | cut -d: -f1); \
    fi

# Set working directory
WORKDIR /app

# Copy package.json files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install frontend dependencies
RUN npm install

# Install backend dependencies
WORKDIR /app/backend
RUN rm -rf node_modules && npm install

# Return to app directory
WORKDIR /app

# Copy the rest of the application
COPY . .

# Copy and set permissions for start script
COPY start.sh .
RUN chmod +x start.sh

# Create directories and set permissions
RUN mkdir -p /downloads /music && \
    chown -R appuser:appuser /app /downloads /music /opt/venv && \
    chmod -R 755 /app

# Switch to app user
USER appuser

# Build the frontend
RUN npm run build

# Start both servers using a shell script
CMD ["./start.sh"]

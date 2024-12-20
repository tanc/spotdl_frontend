# Use Node.js Alpine base image
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    bash

# Create and activate virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install spotdl in virtual environment
RUN pip install spotdl

# Create the .spotdl directory
RUN mkdir -p /.spotdl && chmod 777 /.spotdl

# Set working directory
WORKDIR /app

# Copy package.json files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install frontend dependencies
RUN npm ci

# Install backend dependencies
WORKDIR /app/backend
RUN rm -rf node_modules && npm ci

# Copy the rest of the application
WORKDIR /app
COPY . .

# Update browserslist database and build the frontend for production
RUN npx browserslist@latest --update-db && \
    npm run build

# Create mount directories and set permissions
RUN mkdir -p /downloads /music && \
    chmod -R 777 /downloads /music /opt/venv /app && \
    chmod +x start.sh

# Default command
CMD ["./start.sh"]

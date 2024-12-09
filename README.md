# ⚠️ Educational Purposes Only

This project is created purely for educational purposes. It should not be used to download music without proper ownership or rights. Please respect copyright laws and support artists by purchasing their music through official channels.

# SpotDL Frontend

A web-based frontend for SpotDL, allowing you to download Spotify tracks through a user-friendly interface.

## Features

- Web-based interface for SpotDL
- Real-time download progress
- Configurable download settings
- Automatic M3U playlist generation for downloaded playlists
- Docker support for easy deployment

## Docker Setup

### Using Docker Compose (Recommended)

1. Download the docker-compose.yml file:
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/tanc/SpotDL-Frontend/main/docker-compose.yml.example
```

2. Edit the docker-compose.yml file to configure your paths:
```yaml
# Customize ports if needed (format is "host:container")
ports:
  - "5173:5173"  # Frontend - change first number to use different host port
  - "3001:3001"  # Backend - change first number to use different host port

# Configure volume paths
volumes:
  - ./downloads:/downloads  # Can keep as is for local downloads
  - /path/to/your/music:/music  # Change this to your music library path
  - ./config:/app/backend/config  # Can keep as is for local config
```

3. Create the necessary directories (if you haven't changed the paths above):
```bash
mkdir -p downloads config
```

4. Start the container:
```bash
docker compose up -d
```

The application will be available at:
- Frontend: http://localhost:5173 (or your custom port)
- Backend API: http://localhost:3001 (or your custom port)

#### Environment Variables

- `NODE_ENV`: Set to `production` for production mode or `development` for development mode
- `USER_ID`: User ID for file permissions (defaults to 1000)
- `GROUP_ID`: Group ID for file permissions (defaults to 1000)

### Using Docker Run

If you prefer using docker run directly:

```bash
# Create necessary directories
mkdir -p downloads config

# Run the container
docker run -d \
  -p 5173:5173 \
  -p 3001:3001 \
  -v $(pwd)/downloads:/downloads \
  -v $(pwd)/config:/app/backend/config \
  -v /path/to/your/music:/music \
  -e NODE_ENV=production \
  -e USER_ID=$(id -u) \
  -e GROUP_ID=$(id -g) \
  ghcr.io/tanc/spotdl_frontend:latest
```

## Volume Mounts Explained

The project uses several important volume mounts:

### Persistent Data Volumes
1. `./downloads:/downloads`
   - Where downloaded songs are temporarily stored
   - Should be persistent between container restarts
   - Used for in-progress downloads

2. `/path/to/your/music:/music`
   - The final destination for downloaded music
   - Should point to your music library
   - Persists your music collection

### Development Volumes (Docker Compose Only)
3. `./config:/app/backend/config`
   - Stores application configuration
   - Persists settings between container restarts

4. `/app/node_modules` and `/app/backend/node_modules`
   - Anonymous volumes for node_modules
   - Prevents overwriting container dependencies with local ones
   - Ensures consistent dependencies in the container

## Development Mode

To run in development mode:

1. Set `NODE_ENV=development` in your docker-compose.yml
2. Start the container with:
```bash
docker compose up
```

In development mode, the application will:
- Enable hot-reloading
- Show detailed error messages
- Mount source directories for live editing

## Production Mode

For production deployment:

1. Ensure `NODE_ENV=production` in your docker-compose.yml
2. Start the container with:
```bash
docker compose up -d
```

Production mode provides:
- Optimized builds
- Minimized logging
- Better performance

## Troubleshooting

### Permission Issues
If you encounter permission issues with the mounted volumes:
1. Ensure USER_ID and GROUP_ID match your host system's user
2. Check the permissions of your mounted directories
3. Restart the container after changing permissions

### Port Conflicts
If you see port binding errors:
1. Check if ports 5173 or 3001 are already in use
2. Modify the port mappings in docker-compose.yml if needed
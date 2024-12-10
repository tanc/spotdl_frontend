#!/bin/sh

# Function to update ownership of specified directories
update_ownership() {
    user="appuser"
    group="appuser"
    
    # Default to UID 65532 if USER_ID not provided
    USER_ID=${USER_ID:-65532}
    GROUP_ID=${GROUP_ID:-65532}
    
    # Always update the UID/GID to match what's requested
    usermod -u "$USER_ID" "$user"
    groupmod -g "$GROUP_ID" "$group"
    
    # Update ownership of container-specific directories
    chown -R $user:$group /opt/venv /home/$user
    
    # Ensure the app directory is owned by our user
    # but skip mounted subdirectories
    find /app -maxdepth 0 -exec chown $user:$group {} +
    find /app/src -exec chown $user:$group {} +
    find /app/backend -type f -exec chown $user:$group {} +
    
    # Create mount point directories with correct ownership if they don't exist
    mkdir -p /downloads /music
    chown $user:$group /downloads /music
}

# First run the ownership updates as root
update_ownership

# Then switch to appuser and exec the command
exec su-exec appuser "$@"

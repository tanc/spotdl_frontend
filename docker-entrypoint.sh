#!/bin/bash

# Function to update ownership of specified directories
update_ownership() {
    user="appuser"
    group="appuser"
    
    # Update user and group IDs if needed
    if [ -n "$USER_ID" ] && [ "$USER_ID" != "$(id -u $user)" ]; then
        usermod -u "$USER_ID" "$user"
        # Update ownership of container-specific directories
        chown -R $user:$group /opt/venv /home/$user
    fi
    
    if [ -n "$GROUP_ID" ] && [ "$GROUP_ID" != "$(id -g $group)" ]; then
        groupmod -g "$GROUP_ID" "$group"
        # Update ownership of container-specific directories
        chown -R $user:$group /opt/venv /home/$user
    fi
    
    # Ensure the app directory is owned by our user
    # but skip mounted subdirectories
    find /app -maxdepth 0 -exec chown $user:$group {} +
    find /app/src -exec chown $user:$group {} +
    find /app/backend -type f -exec chown $user:$group {} +
    
    # Create mount point directories with correct ownership if they don't exist
    mkdir -p /downloads /music
    chown $user:$group /downloads /music
}

# Update ownership
update_ownership

# Execute the main command
exec "$@"

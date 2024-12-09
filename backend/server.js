const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs').promises;
const os = require('node:os');

const app = express();
const port = process.env.NODE_ENV === 'production' ? 5173 : 3001;
const DOWNLOADS_DIR = '/downloads';
const MUSIC_DIR = '/music';

// Configure multer for file uploads
const upload = multer({ dest: os.tmpdir() });

app.use(cors());
app.use(express.json());

// Load config
const CONFIG_DIR = path.join(__dirname, 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

async function loadConfig() {
  try {
    // Ensure config directory exists
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Return and save default config if file doesn't exist
      const defaultConfig = {
        audio_providers: ["youtube-music"],
        lyrics_providers: ["genius", "azlyrics", "musixmatch"],
        format: "mp3",
        playlist_output: "{playlist}/{artists} - {title}.{output-ext}",
        album_output: "{album}/{artists} - {title}.{output-ext}",
        threads: 4
      };
      
      await saveConfig(defaultConfig);
      return defaultConfig;
    }
    throw error;
  }
}

async function saveConfig(config) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Function to recursively list files and directories
async function listFilesAndDirs(dir) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  const result = [];

  for (const item of items) {
    // Skip .gitkeep files
    if (item.name === '.gitkeep') continue;

    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(DOWNLOADS_DIR, fullPath);
    const stats = await fs.stat(fullPath);

    if (item.isDirectory()) {
      const children = await listFilesAndDirs(fullPath);
      // Only add directory if it has children or isn't empty (ignoring .gitkeep)
      if (children.length > 0) {
        result.push({
          type: 'directory',
          path: fullPath,
          relativePath,
          name: item.name,
          size: children.reduce((acc, child) => acc + (child.type === 'file' ? child.size : 0), 0),
          modified: stats.mtime,
          children
        });
      }
    } else {
      result.push({
        type: 'file',
        path: fullPath,
        relativePath,
        name: item.name,
        size: stats.size,
        modified: stats.mtime
      });
    }
  }

  // Sort directories first, then files, both alphabetically
  return result.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'directory' ? -1 : 1;
  });
}

// Function to recursively delete a directory
async function deleteDirectory(dir) {
  const items = await fs.readdir(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      await deleteDirectory(fullPath);
    } else {
      await fs.unlink(fullPath);
    }
  }
  
  await fs.rmdir(dir);
}

// Helper function to check if a path exists
async function pathExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// Helper function to ensure directory exists
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

// Helper function to copy a file
async function copyFile(source, target) {
  try {
    await fs.copyFile(source, target);
    await fs.unlink(source); // Delete source after successful copy
  } catch (error) {
    // If copy fails, ensure we don't leave a partial file
    try {
      await fs.unlink(target);
    } catch (unlinkError) {
      // Ignore error if target doesn't exist
      if (unlinkError.code !== 'ENOENT') {
        console.error('Error cleaning up partial file:', unlinkError);
      }
    }
    throw error;
  }
}

// Helper function to move file or directory
async function moveItem(sourcePath, targetPath) {
  try {
    // Check if source exists before proceeding
    if (!(await pathExists(sourcePath))) {
      console.warn(`Source path does not exist, skipping: ${sourcePath}`);
      return;
    }

    const stats = await fs.stat(sourcePath);
    
    if (stats.isDirectory()) {
      // Create target directory if it doesn't exist
      await ensureDir(targetPath);

      // Move all contents
      const items = await fs.readdir(sourcePath);
      for (const item of items) {
        const sourceItemPath = path.join(sourcePath, item);
        const targetItemPath = path.join(targetPath, item);
        try {
          await moveItem(sourceItemPath, targetItemPath);
        } catch (error) {
          console.error(`Error moving item ${sourceItemPath}:`, error);
          // Continue with other items even if one fails
        }
      }

      // Only remove directory if it exists and is empty
      if (await pathExists(sourcePath)) {
        const remainingItems = await fs.readdir(sourcePath);
        if (remainingItems.length === 0) {
          try {
            await fs.rmdir(sourcePath);
          } catch (error) {
            console.warn(`Could not remove source directory ${sourcePath}:`, error);
          }
        }
      }
    } else {
      // For files, only move if target doesn't exist
      const targetExists = await pathExists(targetPath);
      if (!targetExists) {
        // Create parent directory if it doesn't exist
        await ensureDir(path.dirname(targetPath));
        
        try {
          // Try rename first (faster, but won't work across devices)
          await fs.rename(sourcePath, targetPath);
        } catch (error) {
          if (error.code === 'EXDEV') {
            // If cross-device, fall back to copy+delete
            await copyFile(sourcePath, targetPath);
            
            // Verify the copy was successful before deleting source
            if (await pathExists(sourcePath) && await pathExists(targetPath)) {
              const sourceStats = await fs.stat(sourcePath);
              const targetStats = await fs.stat(targetPath);
              
              if (targetStats.size === sourceStats.size) {
                // Only delete if source still exists and sizes match
                try {
                  await fs.unlink(sourcePath);
                } catch (error) {
                  console.warn(`Could not remove source file ${sourcePath}:`, error);
                }
              } else {
                console.warn(`File size mismatch after copy: ${sourcePath}`);
              }
            }
          } else if (error.code === 'ENOENT') {
            console.warn(`Source file disappeared during move: ${sourcePath}`);
          } else {
            throw error;
          }
        }
      } else {
        console.log(`File already exists at target path: ${targetPath}, skipping...`);
      }
    }
  } catch (error) {
    console.error(`Error moving ${sourcePath} to ${targetPath}:`, error);
    throw error;
  }
}

// Helper function to create m3u file for a playlist
async function createM3uFile(directory, playlistName) {
  try {
    console.log(`Creating M3U file in directory: ${directory} for playlist: ${playlistName}`);
    const files = await fs.readdir(directory);
    console.log("Found files in directory:", files);
    
    const audioFiles = files.filter(file => 
      file.endsWith('.mp3') || file.endsWith('.m4a') || file.endsWith('.opus')
    ).sort();
    console.log("Found audio files:", audioFiles);

    if (audioFiles.length === 0) {
      console.log('No audio files found in directory');
      return;
    }

    const m3uContent = `#EXTM3U
#PLAYLIST:${playlistName}
${audioFiles.map(file => file).join('\n')}`;
    const m3uPath = path.join(directory, `${playlistName}.m3u8`);
    await fs.writeFile(m3uPath, m3uContent, 'utf8');
    console.log(`Successfully created M3U file: ${m3uPath}`);
  } catch (error) {
    console.error('Error creating M3U file:', error);
  }
}

// Routes
app.get('/api/config', async (req, res) => {
  const config = await loadConfig();
  res.json(config);
});

app.post('/api/config', async (req, res) => {
  try {
    await saveConfig(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/download', upload.single('cookieFile'), async (req, res) => {
  try {
    console.log('Received download request:', {
      body: req.body,
      file: req.file
    });

    const { type, query, format, bitrate, useYTMusicPremium } = req.body;
    
    if (!query) {
      throw new Error('No query provided');
    }

    const config = await loadConfig();
    const args = ['download'];

    // Add the query
    args.push(query);
    
    // Add format option
    if (format) {
      args.push('--format', format);
    }

    // Add bitrate option if not auto
    if (bitrate && bitrate !== 'auto') {
      args.push('--bitrate', bitrate);
    }

    // Add cookie file if provided and using YT Music Premium
    if (req.file && useYTMusicPremium === 'true') {
      args.push('--cookie-file', req.file.path);
    }

    // Determine if this is a playlist or album from the URL
    let isPlaylist = false;
    if (query.includes('spotify.com/')) {
      isPlaylist = query.includes('/playlist/') || type === 'playlist';
    } else if (query.startsWith('playlist:')) {
      isPlaylist = true;
    }

    // Add output path with the appropriate template
    const outputTemplate = isPlaylist ? config.playlist_output : config.album_output;
    args.push('--output', `/downloads/${outputTemplate || '{artists} - {title}.{output-ext}'}`);

    // Add threads option
    if (config.threads) {
      args.push('--threads', config.threads.toString());
    }

    // Add user auth for special queries
    if (['saved', 'all-user-playlists', 'all-saved-playlists', 'all-user-followed-artists', 'all-user-saved-albums'].includes(type)) {
      args.push('--user-auth');
    }

    console.log('Running spotdl with args:', args);
    
    const spotdl = spawn('/opt/venv/bin/spotdl', args, {
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/opt/venv/bin`,  // Add virtual env to PATH
        PYTHONPATH: '/opt/venv/lib/python3.11/site-packages'  // Add Python packages path
      }
    });
    
    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    let downloadDirectory = null;
    let playlistName = null;
    
    spotdl.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('spotdl output:', output);
      
      // Try to extract the download directory from the output
      if (isPlaylist) {
        console.log('Processing playlist output for directory detection');
        
        // First try to get the playlist name
        if (!playlistName) {
          const playlistMatch = output.match(/Found \d+ songs in (.*?) \(Playlist\)/);
          if (playlistMatch) {
            playlistName = playlistMatch[1];
            console.log(`Found playlist name: ${playlistName}`);
            // Construct the expected directory path based on the output template
            downloadDirectory = path.join('/downloads/Various Artists', playlistName);
            console.log(`Constructed download directory: ${downloadDirectory}`);
          }
        }
      }
      
      res.write(output);
    });

    spotdl.stderr.on('data', (data) => {
      console.error('spotdl error:', data.toString());
      res.write(data.toString());
    });
    
    spotdl.on('close', async (code) => {
      console.log('spotdl process exited with code:', code);
      
      // Create M3U file if this was a playlist and we found the download directory
      if (isPlaylist) {
        console.log(`Playlist download completed. Directory: ${downloadDirectory}, Name: ${playlistName}`);
        if (downloadDirectory && playlistName) {
          // Ensure the directory exists before trying to create the m3u file
          try {
            await fs.access(downloadDirectory);
            await createM3uFile(downloadDirectory, playlistName);
          } catch (error) {
            console.error(`Directory does not exist: ${downloadDirectory}`);
          }
        } else {
          console.log('Could not create M3U file: missing directory or playlist name');
        }
      }
      
      res.end();
      
      // Clean up cookie file if it was uploaded
      if (req.file) {
        fs.unlink(req.file.path).catch(console.error);
      }
    });
    
    spotdl.on('error', (error) => {
      console.error('Failed to start spotdl:', error);
      res.status(500).json({ error: `Failed to start download process: ${error.message}` });
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/save', async (req, res) => {
  const { query, saveFile } = req.body;
  const args = ['save', query, '--save-file', saveFile];
  
  const spotdl = spawn('spotdl', args);
  spotdl.stdout.pipe(res);
  spotdl.stderr.pipe(res);
});

app.post('/api/sync', async (req, res) => {
  const { saveFile } = req.body;
  const args = ['sync', '--save-file', saveFile];
  
  const spotdl = spawn('spotdl', args);
  spotdl.stdout.pipe(res);
  spotdl.stderr.pipe(res);
});

app.post('/api/meta', async (req, res) => {
  const { query } = req.body;
  const args = ['meta', query];
  
  const spotdl = spawn('spotdl', args);
  spotdl.stdout.pipe(res);
  spotdl.stderr.pipe(res);
});

app.post('/api/url', async (req, res) => {
  const { query } = req.body;
  const args = ['url', query];
  
  const spotdl = spawn('spotdl', args);
  spotdl.stdout.pipe(res);
  spotdl.stderr.pipe(res);
});

// New endpoint to list downloaded files and directories
app.get('/api/files', async (req, res) => {
  try {
    const files = await listFilesAndDirs(DOWNLOADS_DIR);
    res.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Updated endpoint to delete files or directories
app.delete('/api/files', async (req, res) => {
  try {
    const { path: itemPath } = req.body;
    if (!itemPath) {
      throw new Error('No path provided');
    }

    // Ensure the path is within the downloads directory
    const normalizedPath = path.normalize(itemPath);
    if (!normalizedPath.startsWith(DOWNLOADS_DIR)) {
      throw new Error('Invalid path');
    }

    const stats = await fs.stat(normalizedPath);
    if (stats.isDirectory()) {
      await deleteDirectory(normalizedPath);
    } else {
      await fs.unlink(normalizedPath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to move files to music directory
app.post('/api/move-to-music', async (req, res) => {
  try {
    const { sourcePath } = req.body;
    if (!sourcePath) {
      throw new Error('No source path provided');
    }

    // Ensure source path is within downloads directory
    const normalizedSourcePath = path.normalize(sourcePath);
    if (!normalizedSourcePath.startsWith(DOWNLOADS_DIR)) {
      throw new Error('Invalid source path');
    }

    // Calculate target path by replacing /downloads with /music
    const targetPath = normalizedSourcePath.replace(DOWNLOADS_DIR, MUSIC_DIR);

    // Move the item
    await moveItem(normalizedSourcePath, targetPath);

    res.json({ 
      success: true,
      targetPath: path.relative(MUSIC_DIR, targetPath)
    });
  } catch (error) {
    console.error('Error moving item:', error);
    res.status(500).json({ error: error.message });
  }
});

// In production, serve static files and handle client-side routing
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the dist directory
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

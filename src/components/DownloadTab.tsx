import { Button, TextInput, Label, Alert, Card, FileInput, Checkbox } from 'flowbite-react';
import { useState, useRef, useEffect } from 'react';

type DownloadType = 'song' | 'album' | 'playlist' | 'artist' | 'search' | 'youtube-match' | 'saved' | 'all-user-playlists' | 'all-user-saved-albums';

interface YouTubeMatch {
  youtubeUrl: string;
  spotifyUrl: string;
}

interface AudioSettings {
  useYTMusicPremium: boolean;
}

interface DownloadedItem {
  type: 'file' | 'directory';
  path: string;
  relativePath: string;
  name: string;
  size: number;
  modified: string;
  children?: DownloadedItem[];
}

export default function DownloadTab() {
  const [downloadType, setDownloadType] = useState<DownloadType>('album');
  const [query, setQuery] = useState('');
  const [youtubeMatch, setYoutubeMatch] = useState<YouTubeMatch>({
    youtubeUrl: '',
    spotifyUrl: ''
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [queuedDownloads, setQueuedDownloads] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    useYTMusicPremium: false
  });
  const [downloadedFiles, setDownloadedFiles] = useState<DownloadedItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [movingItems, setMovingItems] = useState<Set<string>>(new Set());
  const cookieFileRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    fetchDownloadedFiles();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (statusRef.current) {
      statusRef.current.scrollTop = statusRef.current.scrollHeight;
    }
  }, [status]);

  /**
   * Fetches the list of downloaded files from the server
   * Updates the downloadedFiles state with the fetched data
   * Sets an error message if the fetch fails
   */
  const fetchDownloadedFiles = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/files');
      if (!response.ok) throw new Error('Failed to fetch files');
      const files = await response.json();
      setDownloadedFiles(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to fetch downloaded files');
    }
  };

  /**
   * Deletes a file or directory from the server and updates the UI
   * @param filePath - The absolute path of the file or directory to delete
   */
  const deleteFile = async (filePath: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      });

      if (!response.ok) throw new Error('Failed to delete file');
      
      // Update the file list recursively
      setDownloadedFiles(prev => {
        const updateChildren = (items: DownloadedItem[]): DownloadedItem[] => {
          return items.filter(item => {
            // Remove the item and its children if it matches the deleted path
            if (item.path === filePath || item.path.startsWith(`${filePath}/`)) {
              return false;
            }
            // Recursively update children if it's a directory
            if (item.type === 'directory' && item.children) {
              item.children = updateChildren(item.children);
            }
            return true;
          });
        };
        return updateChildren(prev);
      });

      // Also remove from expanded directories set if it was a directory
      setExpandedDirs(prev => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    }
  };

  /**
   * Formats a file size in bytes to a human-readable string
   * @param bytes - The size in bytes to format
   * @returns A formatted string with appropriate unit (B, KB, MB, GB)
   */
  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  /**
   * Adds the current query to the download queue based on the selected download type
   * Handles different query formats for various download types (youtube-match, search, etc.)
   * Clears the input fields after adding to queue
   */
  const addToQueue = () => {
    let downloadQuery = '';
    
    switch (downloadType) {
      case 'youtube-match':
        downloadQuery = `${youtubeMatch.youtubeUrl}|${youtubeMatch.spotifyUrl}`;
        break;
      case 'search':
        downloadQuery = `'${query}'`; // Add quotes for search queries
        break;
      case 'saved':
      case 'all-user-playlists':
      case 'all-user-saved-albums':
        downloadQuery = downloadType;
        break;
      default:
        downloadQuery = query;
    }

    if (!downloadQuery.trim()) {
      setError('Please enter a URL or search query');
      return;
    }

    setError(''); // Clear any existing error
    setQueuedDownloads(prev => [...prev, downloadQuery]);
    setQuery('');
    setYoutubeMatch({ youtubeUrl: '', spotifyUrl: '' });
  };

  /**
   * Processes all queued downloads sequentially
   * Handles different download types, formats, and settings
   * Updates status and error states during the download process
   * Refreshes the downloaded files list upon completion
   */
  const handleDownload = async () => {
    try {
      // Get the downloads to process before clearing the queue
      const downloadsToProcess = [...queuedDownloads];
      
      if (downloadsToProcess.length === 0) {
        setError('Please add at least one item to the download queue');
        return;
      }

      // Clear the queue immediately
      setQueuedDownloads([]);
      setStatus('Starting download...');
      setError('');
      setIsDownloading(true);
      // Process each download in sequence
      for (const currentQuery of downloadsToProcess) {
        // Special queries that don't need a URL
        const specialQueries = [
          'saved',
          'all-user-playlists',
          'all-saved-playlists',
          'all-user-followed-artists',
          'all-user-saved-albums'
        ];

        let currentDownloadType = downloadType;

        // Determine if this is a special query
        if (specialQueries.includes(currentQuery)) {
          currentDownloadType = currentQuery as DownloadType;
          setDownloadType(currentDownloadType);
        }
        // Check if this is a YouTube|Spotify match
        else if (currentQuery.includes('|')) {
          currentDownloadType = 'youtube-match';
          setDownloadType(currentDownloadType);
          const [youtubeUrl, spotifyUrl] = currentQuery.split('|');
          setYoutubeMatch({ youtubeUrl: youtubeUrl.trim(), spotifyUrl: spotifyUrl.trim() });
        }
        // Check if this is a search query
        else if (currentQuery.startsWith('album:') || currentQuery.startsWith('playlist:') || currentQuery.startsWith('artist:')) {
          currentDownloadType = 'search';
          setDownloadType(currentDownloadType);
        }

        const formData = new FormData();
        
        // Get audio settings from localStorage
        const format = localStorage.getItem('audioFormat') || 'mp3';
        const bitrate = localStorage.getItem('audioBitrate') || 'auto';
        
        formData.append('type', currentDownloadType);
        formData.append('query', currentQuery);
        formData.append('format', format);
        formData.append('bitrate', bitrate);
        formData.append('useYTMusicPremium', String(audioSettings.useYTMusicPremium));

        // Add cookie file if YT Music Premium is enabled
        if (audioSettings.useYTMusicPremium && cookieFileRef.current?.files?.[0]) {
          formData.append('cookieFile', cookieFileRef.current.files[0]);
        }

        setStatus(prev => `${prev}\nProcessing: ${currentQuery}`);

        const response = await fetch('http://localhost:3001/api/download', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Download failed');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = new TextDecoder().decode(value);
          setStatus(prev => `${prev}\n${text}`);
        }
      }

      setStatus(prev => `${prev}\nAll downloads complete!`);
      setQuery(''); // Clear the query input
      
      // Refresh the downloaded files list
      await fetchDownloadedFiles();
      setStatus(prev => `${prev}\nDownload successful!`);
    } catch (error) {
      console.error('Error during download:', error);
      setError('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Toggles the expanded/collapsed state of a directory in the file list
   * @param path - The path of the directory to toggle
   */
  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  /**
   * Moves a file or directory to the music library
   * @param path - The path of the item to move
   */
  const moveToMusic = async (path: string) => {
    try {
      setMovingItems(prev => new Set(prev).add(path));
      const response = await fetch('http://localhost:3001/api/move-to-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourcePath: path }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to move item');
      }

      // Remove the moved item from the list
      setDownloadedFiles(prev => prev.filter(item => !item.path.startsWith(path)));
      setStatus(prev => `${prev}\nMoved ${path} to music library`);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to move item');
      }
    } finally {
      setMovingItems(prev => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  };

  /**
   * Renders a file or directory item in the file list
   * @param item - The file or directory item to render
   * @param depth - The nesting depth of the item (for indentation)
   * @returns JSX element representing the file or directory
   */
  const renderFileItem = (item: DownloadedItem, depth: number = 0) => {
    const isExpanded = expandedDirs.has(item.path);
    const isMoving = movingItems.has(item.path);
    const marginLeft = `${depth * 1.5}rem`;

    return (
      <div key={item.path}>
        <div 
          className={`flex items-center justify-between p-2 ${
            item.type === 'directory' 
              ? 'bg-gray-100 dark:bg-gray-800' 
              : 'bg-white dark:bg-gray-900'
          } hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200`}
          style={{ marginLeft }}
        >
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center">
              {item.type === 'directory' && (
                <button
                  type="button"
                  onClick={() => toggleDirectory(item.path)}
                  className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(item.size)} • {new Date(item.modified).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="xs"
              color="success"
              onClick={() => moveToMusic(item.path)}
              disabled={isMoving}
            >
              {isMoving ? 'Moving...' : 'Move to Library'}
            </Button>
            <Button 
              size="xs" 
              color="failure"
              onClick={() => deleteFile(item.path)}
              disabled={isMoving}
            >
              Delete {item.type === 'directory' ? 'Directory' : 'File'}
            </Button>
          </div>
        </div>
        {item.type === 'directory' && isExpanded && item.children?.map(child => 
          renderFileItem(child, depth + 1)
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <h5 className="text-xl font-bold mb-4">Download Settings</h5>
        <div className="space-y-4">
          {downloadType === 'youtube-match' ? (
            <div className="space-y-4">
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="youtubeUrl" value="YouTube URL" />
                </div>
                <TextInput
                  id="youtubeUrl"
                  value={youtubeMatch.youtubeUrl}
                  onChange={(e) => setYoutubeMatch({...youtubeMatch, youtubeUrl: e.target.value})}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="spotifyUrl" value="Spotify URL" />
                </div>
                <TextInput
                  id="spotifyUrl"
                  value={youtubeMatch.spotifyUrl}
                  onChange={(e) => setYoutubeMatch({...youtubeMatch, spotifyUrl: e.target.value})}
                  placeholder="https://open.spotify.com/track/..."
                />
              </div>
            </div>
          ) : ['saved', 'all-user-playlists', 'all-user-saved-albums'].includes(downloadType) ? (
            <div className="text-sm text-gray-600">
              Click Add to Queue to download your {downloadType.replace(/-/g, ' ')}
            </div>
          ) : (
            <div>
              <div className="mb-2 block">
                <Label htmlFor="query" value="Enter URL or Search Query" />
              </div>
              <TextInput
                id="query"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError(''); // Clear error when user starts typing
                }}
                className="mb-4"
                color={error ? "failure" : undefined}
                helperText={error}
              />
            </div>
          )}

          <Button onClick={addToQueue} disabled={isDownloading}>
            Add to Queue
          </Button>
        </div>
      </Card>

      <Card>
        <h5 className="text-xl font-bold mb-4">Additional Settings</h5>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="ytMusicPremium"
              checked={audioSettings.useYTMusicPremium}
              onChange={(e) => setAudioSettings({...audioSettings, useYTMusicPremium: e.target.checked})}
            />
            <Label htmlFor="ytMusicPremium">
              Use YouTube Music Premium (Higher Quality)
            </Label>
          </div>
          {audioSettings.useYTMusicPremium && (
            <div className="mt-2">
              <div className="mb-2 block">
                <Label htmlFor="cookieFile" value="Upload cookies.txt file" />
              </div>
              <FileInput
                id="cookieFile"
                ref={cookieFileRef}
                accept=".txt"
              />
            </div>
          )}
        </div>
      </Card>

      {queuedDownloads.length > 0 && (
        <Card>
          <h5 className="text-xl font-bold mb-4">Download Queue</h5>
          <div className="space-y-2">
            {queuedDownloads.map((download) => (
              <div key={`download-${crypto.randomUUID()}`} className="flex items-center justify-between">
                <span className="text-sm">{download}</span>
                <Button 
                  size="xs" 
                  color="failure"
                  onClick={() => setQueuedDownloads(prev => prev.filter((_, i) => i !== prev.indexOf(download)))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {downloadedFiles.length > 0 && (
        <Card>
          <h5 className="text-xl font-bold mb-4">Downloaded Files</h5>
          <div className="space-y-2">
            {downloadedFiles.map(item => renderFileItem(item))}
          </div>
        </Card>
      )}

      <Button onClick={handleDownload} disabled={queuedDownloads.length === 0}>
        Start Download
      </Button>

      {status && (
        <div className="relative">
          <Alert color="info" className="max-h-[400px] overflow-y-auto">
            <pre ref={statusRef} className="whitespace-pre-wrap">{status}</pre>
            <button
              type="button"
              onClick={() => setStatus('')}
              className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 text-sm font-semibold rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="Clear status"
            >
              ×
            </button>
          </Alert>
        </div>
      )}

      {error && (
        <div className="relative">
          <Alert color="failure">
            {error}
            <button
              type="button"
              onClick={() => setError('')}
              className="absolute top-2 right-2 inline-flex items-center justify-center w-6 h-6 text-sm font-semibold rounded-lg bg-red-100 text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-300"
              aria-label="Clear error"
            >
              ×
            </button>
          </Alert>
        </div>
      )}
    </div>
  );
}

import { Button, TextInput, Label, Select, Alert, Card } from 'flowbite-react';
import { useState, useEffect } from 'react';

interface Config {
  audio_providers: string[];
  lyrics_providers: string[];
  format: string;
  bitrate: 'auto' | 'disable' | '128k' | '256k' | '320k';
  album_output: string;
  playlist_output: string;
  threads: number;
}

export default function SettingsTab() {
  const [config, setConfig] = useState<Config>({
    audio_providers: ['youtube-music'],
    lyrics_providers: ['genius', 'azlyrics', 'musixmatch'],
    format: localStorage.getItem('audioFormat') || 'mp3',
    bitrate: localStorage.getItem('audioBitrate') as Config['bitrate'] || 'auto',
    album_output: '{album-artist}/{album}/{title}.{output-ext}',
    playlist_output: 'Various Artists/{list-name}/{list-position} {title}.{output-ext}',
    threads: 4
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();
      setConfig(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to load config');
      }
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to save config');
      
      setStatus('Settings saved successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  return (
    <Card className="max-w-2xl">
      <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        SpotDL Settings
      </h5>
      
      <div className="space-y-4">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="format" value="Audio Format" />
          </div>
          <Select
            id="format"
            value={config.format}
            onChange={(e) => {
              localStorage.setItem('audioFormat', e.target.value);
              setConfig({...config, format: e.target.value});
            }}
          >
            <option value="mp3">MP3</option>
            <option value="m4a">M4A</option>
            <option value="opus">Opus</option>
            <option value="flac">FLAC</option>
          </Select>
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="bitrate" value="Audio Bitrate" />
          </div>
          <Select
            id="bitrate"
            value={config.bitrate}
            onChange={(e) => {
              const newBitrate = e.target.value as Config['bitrate'];
              setConfig({...config, bitrate: newBitrate});
              localStorage.setItem('audioBitrate', newBitrate);
            }}
          >
            <option value="auto">Auto (Recommended)</option>
            <option value="disable">Disable Conversion</option>
            <option value="128k">128k</option>
            <option value="256k">256k</option>
            <option value="320k">320k</option>
          </Select>
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="album_output" value="Album Output Template" />
          </div>
          <TextInput
            id="album_output"
            value={config.album_output}
            onChange={(e) => setConfig({...config, album_output: e.target.value})}
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="playlist_output" value="Playlist Output Template" />
          </div>
          <TextInput
            id="playlist_output"
            value={config.playlist_output}
            onChange={(e) => setConfig({...config, playlist_output: e.target.value})}
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="threads" value="Download Threads" />
          </div>
          <TextInput
            id="threads"
            type="number"
            value={config.threads}
            onChange={(e) => setConfig({...config, threads: Number.parseInt(e.target.value)})}
          />
        </div>

        <Button onClick={handleSave}>
          Save Settings
        </Button>

        {status && (
          <Alert color="success">
            {status}
          </Alert>
        )}

        {error && (
          <Alert color="failure">
            {error}
          </Alert>
        )}
      </div>
    </Card>
  );
}

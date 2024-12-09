import { Button, TextInput, Label, Select, Alert, Card } from 'flowbite-react';
import { useState, useEffect } from 'react';

interface Config {
  client_id: string;
  client_secret: string;
  auth_token: string | null;
  user_auth: boolean;
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
    client_id: '',
    client_secret: '',
    auth_token: null,
    user_auth: false,
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
      const response = await fetch('http://localhost:3001/api/config');
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
      const response = await fetch('http://localhost:3001/api/config', {
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
            <Label htmlFor="client_id" value="Spotify Client ID" />
          </div>
          <TextInput
            id="client_id"
            value={config.client_id}
            onChange={(e) => setConfig({...config, client_id: e.target.value})}
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="client_secret" value="Spotify Client Secret" />
          </div>
          <TextInput
            id="client_secret"
            type="password"
            value={config.client_secret}
            onChange={(e) => setConfig({...config, client_secret: e.target.value})}
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="format" value="Output Format" />
          </div>
          <Select
            id="format"
            value={config.format}
            onChange={(e) => {
              const newFormat = e.target.value;
              setConfig({...config, format: newFormat});
              localStorage.setItem('audioFormat', newFormat);
            }}
          >
            <option value="mp3">MP3 (Best Compatibility)</option>
            <option value="m4a">M4A (Best for YT Music Premium)</option>
            <option value="opus">OPUS (Best Quality/Size)</option>
            <option value="flac">FLAC (Lossless)</option>
            <option value="ogg">OGG</option>
            <option value="wav">WAV</option>
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
            onChange={(e) => setConfig({...config, threads: parseInt(e.target.value)})}
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

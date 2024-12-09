import { Button, TextInput, Label, Alert, Select } from 'flowbite-react';
import { useState } from 'react';

type QueryType = 'url' | 'album' | 'playlist' | 'artist' | 'saved' | 'all-user-playlists' | 'all-saved-playlists' | 'all-user-followed-artists' | 'all-user-saved-albums' | 'youtube-match';

interface YouTubeMatch {
  youtubeUrl: string;
  spotifyUrl: string;
}

export default function QueryTab() {
  const [queryType, setQueryType] = useState<QueryType>('url');
  const [query, setQuery] = useState('');
  const [youtubeMatch, setYoutubeMatch] = useState<YouTubeMatch>({
    youtubeUrl: '',
    spotifyUrl: ''
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleQuery = async () => {
    try {
      setStatus('Processing query...');
      setError('');

      let finalQuery = query;

      // Format query based on type
      if (queryType === 'album') {
        finalQuery = `album:${query}`;
      } else if (queryType === 'playlist') {
        finalQuery = `playlist:${query}`;
      } else if (queryType === 'artist') {
        finalQuery = `artist:${query}`;
      } else if (queryType === 'youtube-match') {
        finalQuery = `${youtubeMatch.youtubeUrl}|${youtubeMatch.spotifyUrl}`;
      } else if (['saved', 'all-user-playlists', 'all-saved-playlists', 'all-user-followed-artists', 'all-user-saved-albums'].includes(queryType)) {
        finalQuery = queryType;
      }
      
      const response = await fetch('http://localhost:3001/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: finalQuery }),
      });

      if (!response.ok) throw new Error('Query failed');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        setStatus(prev => prev + text);
      }
      
      setStatus(prev => prev + '\nQuery complete!');
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 block">
          <Label htmlFor="queryType" value="Query Type" />
        </div>
        <Select
          id="queryType"
          value={queryType}
          onChange={(e) => setQueryType(e.target.value as QueryType)}
        >
          <option value="url">Direct URL</option>
          <option value="album">Album Search</option>
          <option value="playlist">Playlist Search</option>
          <option value="artist">Artist Search</option>
          <option value="saved">Liked Songs</option>
          <option value="all-user-playlists">All User Playlists</option>
          <option value="all-saved-playlists">Created Playlists</option>
          <option value="all-user-followed-artists">Followed Artists</option>
          <option value="all-user-saved-albums">Saved Albums</option>
          <option value="youtube-match">YouTube Match</option>
        </Select>
      </div>

      {queryType === 'youtube-match' ? (
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
      ) : queryType === 'url' ? (
        <div>
          <div className="mb-2 block">
            <Label htmlFor="query" value="Enter Spotify URL" />
          </div>
          <TextInput
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="https://open.spotify.com/..."
          />
        </div>
      ) : ['saved', 'all-user-playlists', 'all-saved-playlists', 'all-user-followed-artists', 'all-user-saved-albums'].includes(queryType) ? (
        <div className="text-sm text-gray-600">
          Click Query to fetch your {queryType.replace(/-/g, ' ')}
        </div>
      ) : (
        <div>
          <div className="mb-2 block">
            <Label htmlFor="query" value={`Enter ${queryType} name to search`} />
          </div>
          <TextInput
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Enter ${queryType} name...`}
          />
        </div>
      )}
      
      <Button onClick={handleQuery}>
        Query
      </Button>

      {status && (
        <Alert color="info">
          <pre className="whitespace-pre-wrap">{status}</pre>
        </Alert>
      )}

      {error && (
        <Alert color="failure">
          {error}
        </Alert>
      )}
    </div>
  );
}

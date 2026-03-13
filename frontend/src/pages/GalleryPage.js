import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import './GalleryPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function GalleryPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchVideos = useCallback(async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/api/videos`);
      setVideos(res.data.data || []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      setError('Could not load videos. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, [fetchVideos]);

  const formatCount = (n) => n === 1 ? '1 video' : `${n} videos`;

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
    </div>
  );

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <div>
          <h1>🎬 Video Gallery</h1>
          <p>All uploaded and processed videos • Auto-refreshes every 15s</p>
        </div>
        <div className="gallery-actions">
          {lastRefresh && <span className="refresh-time">Updated {lastRefresh}</span>}
          <button className="btn btn-secondary" onClick={fetchVideos}>🔄 Refresh</button>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <span>❌</span> {error}
          <button onClick={fetchVideos} style={{ marginLeft: 12, textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }}>Retry</button>
        </div>
      )}

      {videos.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <h3>No videos yet</h3>
          <p>Upload your first video to get started!</p>
          <a href="/" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>📤 Upload Video</a>
        </div>
      ) : (
        <>
          <div className="gallery-stats">
            <span className="badge badge-info">📹 {formatCount(videos.length)}</span>
          </div>
          <div className="grid-2">
            {videos.map(video => (
              <VideoCard key={video.id} video={video} onRefresh={fetchVideos} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default GalleryPage;

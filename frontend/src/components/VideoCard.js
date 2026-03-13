import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VideoCard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const downloadFile = (s3Key, filename) => {
  window.location.href =
    `${API_URL}/api/videos/download?key=${encodeURIComponent(s3Key)}&filename=${filename}`;
};
function VideoCard({ video, onRefresh }) {
  const [status, setStatus] = useState(null);
  const [metadata, setMetadata] = useState(video.metadata);
  const [showMeta, setShowMeta] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/videos/${video.id}/status`);

      const newStatus = res.data.data;

      setStatus(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newStatus)) {
          return newStatus;
        }
        return prev;
      });

    } catch (err) {
      console.log(err);
    }
  };

  fetchStatus();

  const interval = setInterval(fetchStatus, 2000); // faster refresh

  return () => clearInterval(interval);

}, [video.id]);

  useEffect(() => {
    if (!metadata) {
      const fetchMeta = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/videos/${video.id}/metadata`);
          setMetadata(res.data.data);
        } catch {}
      };
      fetchMeta();
    }
  }, [video.id, metadata]);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatSize = (bytes) => bytes ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : 'Unknown';

  const tasks = [
    { key: 'compressed', label: 'Compressed', icon: '⚡' },
    { key: 'thumbnail', label: 'Thumbnail', icon: '🖼️' },
    { key: 'preview', label: 'Preview', icon: '🎬' },
    { key: 'watermark', label: 'Watermark', icon: '💧' },
    { key: 'metadata', label: 'Metadata', icon: '📊' },
    { key: 'converted', label: 'WebM', icon: '🔄' },
  ];
const progress = status?.progress ?? 0;
  const isDone = status?.done;

  return (
    <div className="video-card">
      {/* Thumbnail */}
      <div className="video-thumbnail">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt="thumbnail" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="thumb-placeholder">🎬</div>
        )}
        <div className="video-duration-badge">
          {isDone ? <span className="badge badge-success">✅ Done</span> : <span className="badge badge-warning">⏳ Processing</span>}
        </div>
      </div>

      {/* Info */}
      <div className="video-body">
        <div className="video-name" title={video.name}>{video.name}</div>
        <div className="video-meta-row">
          <span>📅 {formatDate(video.uploadedAt)}</span>
          <span>💾 {formatSize(video.size)}</span>
        </div>

        {/* Progress */}
        <div className="processing-progress">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            <span>Processing Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Tasks status */}
        <div className="tasks-status">
          {tasks.map(t => (
            <div key={t.key} className={`task-pill ${status?.[t.key] ? 'done' : 'pending'}`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span>{status?.[t.key] ? '✓' : '…'}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="card-tabs">
          <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Info</button>
          <button className={`tab-btn ${activeTab === 'download' ? 'active' : ''}`} onClick={() => setActiveTab('download')}>Downloads</button>
          {metadata && <button className={`tab-btn ${activeTab === 'meta' ? 'active' : ''}`} onClick={() => setActiveTab('meta')}>Metadata</button>}
        </div>

        {activeTab === 'info' && (
          <div className="tab-content">
            <div className="info-row"><span>Video ID</span><code>{video.id.slice(0, 16)}...</code></div>
            {metadata && <>
              <div className="info-row"><span>Resolution</span><span>{metadata.video?.resolution}</span></div>
              <div className="info-row"><span>Duration</span><span>{metadata.duration}</span></div>
              <div className="info-row"><span>Format</span><span>{metadata.video?.codec?.toUpperCase()}</span></div>
            </>}
          </div>
        )}
{activeTab === 'download' && (
  <div className="tab-content download-grid">

    {video.originalUrl &&
      <button
        className="dl-btn"
        onClick={() =>
          downloadFile(
            `uploads/${video.id}${video.name.substring(video.name.lastIndexOf('.'))}`,
            video.name
          )
        }
      >
        📥 Original
      </button>
    }

    {status?.compressed &&
      <button
        className="dl-btn success"
        onClick={() =>
          downloadFile(`processed/${video.id}_compressed.mp4`, 'compressed.mp4')
        }
      >
        ⚡ Compressed
      </button>
    }

    {status?.thumbnail &&
      <button
        className="dl-btn"
        onClick={() =>
          downloadFile(`thumbnails/${video.id}_thumb.jpg`, 'thumbnail.jpg')
        }
      >
        🖼️ Thumbnail
      </button>
    }

    {status?.preview &&
      <button
        className="dl-btn"
        onClick={() =>
          downloadFile(`preview/${video.id}_preview.mp4`, 'preview.mp4')
        }
      >
        🎬 Preview Clip
      </button>
    }

    {status?.watermark &&
      <button
        className="dl-btn"
        onClick={() =>
          downloadFile(`processed/${video.id}_watermark.mp4`, 'watermarked.mp4')
        }
      >
        💧 Watermarked
      </button>
    }

    {status?.converted &&
      <button
        className="dl-btn"
        onClick={() =>
          downloadFile(`processed/${video.id}.webm`, 'converted.webm')
        }
      >
        🔄 WebM
      </button>
    }

  </div>
)}
        {activeTab === 'meta' && metadata && (
          <div className="tab-content">
            <div className="info-row"><span>File Size</span><span>{metadata.fileSize}</span></div>
            <div className="info-row"><span>Bitrate</span><span>{metadata.bitrate}</span></div>
            <div className="info-row"><span>FPS</span><span>{metadata.video?.frameRate}</span></div>
            <div className="info-row"><span>Audio</span><span>{metadata.audio?.codec} {metadata.audio?.sampleRate}Hz</span></div>
            <div className="info-row"><span>Format</span><span style={{ fontSize: 11 }}>{metadata.format}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoCard;

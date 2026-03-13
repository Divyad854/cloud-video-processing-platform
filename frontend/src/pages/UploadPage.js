import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './UploadPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.avi', '.mov', '.webm', '.mkv'] },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        }
      });
      setResult(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="upload-page">
      <div className="page-header">
        <h1>📤 Upload Video</h1>
        <p>Upload your video and our cloud platform will automatically process it</p>
      </div>

      {/* Features banner */}
      <div className="features-grid">
        {[
          { icon: '⚡', label: 'Compression', desc: 'Reduce file size up to 75%' },
          { icon: '🖼️', label: 'Thumbnails', desc: 'Auto-generated previews' },
          { icon: '🎬', label: 'Preview Clip', desc: '10-second preview video' },
          { icon: '💧', label: 'Watermark', desc: 'Brand protection added' },
          { icon: '📊', label: 'Metadata', desc: 'Full video info extracted' },
          { icon: '🔄', label: 'Convert', desc: 'MP4 + WebM formats' },
        ].map(f => (
          <div key={f.label} className="feature-card">
            <span className="feature-icon">{f.icon}</span>
            <div>
              <div className="feature-label">{f.label}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}>
          <input {...getInputProps()} />
          {file ? (
            <div className="file-selected">
              <span className="file-icon">🎥</span>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatSize(file.size)}</div>
              </div>
              <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                ✕ Remove
              </button>
            </div>
          ) : (
            <div className="dropzone-content">
              <div className="drop-icon">🎬</div>
              <div className="drop-title">
                {isDragActive ? 'Drop your video here!' : 'Drag & drop your video here'}
              </div>
              <div className="drop-subtitle">or click to browse files</div>
              <div className="drop-formats">MP4 · AVI · MOV · WebM · MKV · up to 500MB</div>
            </div>
          )}
        </div>

        {file && !result && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading}
              style={{ fontSize: 16, padding: '14px 40px' }}
            >
              {uploading ? '⏳ Uploading...' : '🚀 Upload & Process Video'}
            </button>
          </div>
        )}

        {uploading && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#94a3b8' }}>
              <span>Uploading to AWS S3...</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <span>❌</span> {error}
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="success-card">
          <div className="success-header">
            <span className="success-icon">✅</span>
            <div>
              <h3>Video Uploaded Successfully!</h3>
              <p>Processing jobs have been queued in AWS SQS</p>
            </div>
          </div>

          <div className="result-details">
            <div className="result-row">
              <span className="result-label">Video ID</span>
              <code className="result-value">{result.videoId}</code>
            </div>
            <div className="result-row">
              <span className="result-label">File Name</span>
              <span className="result-value">{result.originalName}</span>
            </div>
            <div className="result-row">
              <span className="result-label">S3 Location</span>
              <code className="result-value small">{result.s3Key}</code>
            </div>
            <div className="result-row">
              <span className="result-label">Queue Status</span>
              <span className="badge badge-warning">⏳ Processing in queue</span>
            </div>
          </div>

          <div className="processing-tasks">
            <div className="tasks-title">Processing Tasks Queued:</div>
            <div className="tasks-grid">
              {result.tasks.map(task => (
                <div key={task} className="task-item">
                  <span className="task-spinner">⏳</span>
                  <span>{task}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="success-actions">
            <Link to="/gallery" className="btn btn-primary">🎬 View Gallery</Link>
            <button className="btn btn-secondary" onClick={() => { setFile(null); setResult(null); }}>
              📤 Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPage;

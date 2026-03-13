import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import GalleryPage from './pages/GalleryPage';
import './App.css';

function Navbar() {
  const location = useLocation();
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">☁️</span>
        <span className="brand-text">CloudVideo<span className="brand-accent">Platform</span></span>
      </div>
      <div className="navbar-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          📤 Upload
        </Link>
        <Link to="/gallery" className={`nav-link ${location.pathname === '/gallery' ? 'active' : ''}`}>
          🎬 Gallery
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
          </Routes>
        </main>
        <footer className="footer">
          <p>☁️ Cloud Video Processing Platform — Built with AWS S3 · SQS · EC2 · CloudWatch</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;

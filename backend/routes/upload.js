const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { uploadToS3 } = require('../services/s3Service');
const { sendJobToQueue } = require('../services/sqsService');

const router = express.Router();

// Store files temporarily
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tmpDir = '/tmp/video-uploads';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mkv'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp4|avi|mov|webm|mkv|flv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// POST /api/upload
router.post('/', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }

    const videoId = path.basename(req.file.filename, path.extname(req.file.filename));
    const ext = path.extname(req.file.originalname) || '.mp4';
    const s3Key = `uploads/${videoId}${ext}`;

    console.log(`📤 Uploading ${req.file.originalname} to S3...`);

    // Upload to S3
    const s3Url = await uploadToS3(req.file.path, s3Key, req.file.mimetype);

    // Send job to SQS
    const messageId = await sendJobToQueue(s3Key, videoId, req.file.originalname);

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Video uploaded successfully! Processing has started.',
      data: {
        videoId,
        originalName: req.file.originalname,
        s3Key,
        s3Url,
        messageId,
        status: 'queued',
        tasks: ['compress', 'thumbnail', 'preview', 'watermark', 'metadata', 'convert']
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

const express = require('express');
const { getAllVideos, getSignedUrl, deleteFromS3, listS3Files, s3, BUCKET } = require('../services/s3Service');

const router = express.Router();

// GET /api/videos - Get all videos
router.get('/', async (req, res) => {
  try {
    const videos = await getAllVideos();
    res.json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.get('/download', async (req, res) => {
  try {
    const { key, filename } = req.query;

    const data = await s3.getObject({
      Bucket: BUCKET,
      Key: key
    }).promise();

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    res.setHeader(
      'Content-Type',
      data.ContentType || 'application/octet-stream'
    );

    res.send(data.Body);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/videos/:videoId/status - Check processing status
router.get('/:videoId/status', async (req, res) => {
  const { videoId } = req.params;
  
  try {
    const status = {
      videoId,
      compressed: false,
      thumbnail: false,
      preview: false,
      watermark: false,
      metadata: false,
      converted: false
    };

    const checkKey = async (key) => {
      try {
        await s3.headObject({ Bucket: BUCKET, Key: key }).promise();
        return true;
      } catch { return false; }
    };

    status.compressed = await checkKey(`processed/${videoId}_compressed.mp4`);
    status.thumbnail = await checkKey(`thumbnails/${videoId}_thumb.jpg`);
    status.preview = await checkKey(`preview/${videoId}_preview.mp4`);
    status.watermark = await checkKey(`processed/${videoId}_watermark.mp4`);
    status.metadata = await checkKey(`metadata/${videoId}.json`);
    status.converted = await checkKey(`processed/${videoId}.webm`);

    const completed = Object.values(status).filter(v => v === true).length;
    status.progress = Math.round((completed / 6) * 100);
    status.done = completed === 6;

    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/videos/:videoId/metadata - Get video metadata
router.get('/:videoId/metadata', async (req, res) => {
  const { videoId } = req.params;
  try {
    const data = await s3.getObject({ Bucket: BUCKET, Key: `metadata/${videoId}.json` }).promise();
    const metadata = JSON.parse(data.Body.toString());
    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Metadata not found yet' });
  }
});

module.exports = router;



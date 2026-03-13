const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const BUCKET = process.env.S3_BUCKET_NAME;

// Upload file to S3
const uploadToS3 = async (filePath, s3Key, contentType = 'video/mp4') => {
  const fileContent = fs.readFileSync(filePath);
  const params = {
    Bucket: BUCKET,
    Key: s3Key,
    Body: fileContent,
    ContentType: contentType
  };
  const result = await s3.upload(params).promise();
  console.log(`✅ Uploaded to S3: ${s3Key}`);
  return result.Location;
};

// Upload buffer to S3
const uploadBufferToS3 = async (buffer, s3Key, contentType = 'image/jpeg') => {
  const params = {
    Bucket: BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType
  };
  const result = await s3.upload(params).promise();
  return result.Location;
};

// Download file from S3
const downloadFromS3 = async (s3Key, localPath) => {
  const params = { Bucket: BUCKET, Key: s3Key };
  const data = await s3.getObject(params).promise();
  fs.writeFileSync(localPath, data.Body);
  console.log(`✅ Downloaded from S3: ${s3Key}`);
  return localPath;
};

// List files in S3 folder
const listS3Files = async (prefix) => {
  const params = { Bucket: BUCKET, Prefix: prefix };
  const result = await s3.listObjectsV2(params).promise();
  return result.Contents;
};

// Get signed URL for a file
const getSignedUrl = (s3Key, expiresIn = 3600) => {
  const params = { Bucket: BUCKET, Key: s3Key, Expires: expiresIn };
  return s3.getSignedUrl('getObject', params);
};

// Delete file from S3
const deleteFromS3 = async (s3Key) => {
  const params = { Bucket: BUCKET, Key: s3Key };
  await s3.deleteObject(params).promise();
  console.log(`🗑️ Deleted from S3: ${s3Key}`);
};

// Get all processed videos info
const getAllVideos = async () => {
  try {
    const uploads = await listS3Files('uploads/');
    const videos = [];

    for (const item of uploads) {
      if (item.Key === 'uploads/') continue;
      
      const videoId = path.basename(item.Key, path.extname(item.Key));
      const originalName = path.basename(item.Key);
      
      // Check for thumbnail
      let thumbnailUrl = null;
      try {
        const thumbKey = `thumbnails/${videoId}_thumb.jpg`;
        thumbnailUrl = getSignedUrl(thumbKey);
      } catch(e) {}

      // Check for preview
      let previewUrl = null;
      try {
        const previewKey = `preview/${videoId}_preview.mp4`;
        previewUrl = getSignedUrl(previewKey);
      } catch(e) {}

      // Get metadata
      let metadata = null;
      try {
        const metaKey = `metadata/${videoId}.json`;
        const metaData = await s3.getObject({ Bucket: BUCKET, Key: metaKey }).promise();
        metadata = JSON.parse(metaData.Body.toString());
      } catch(e) {}

      videos.push({
        id: videoId,
        name: originalName,
        uploadedAt: item.LastModified,
        size: item.Size,
        originalUrl: getSignedUrl(item.Key),
        thumbnailUrl,
        previewUrl,
        metadata,
        processedUrl: (() => {
          try { return getSignedUrl(`processed/${videoId}_compressed.mp4`); } catch(e) { return null; }
        })(),
        watermarkUrl: (() => {
          try { return getSignedUrl(`processed/${videoId}_watermark.mp4`); } catch(e) { return null; }
        })()
      });
    }

    return videos;
  } catch (error) {
    console.error('Error getting videos:', error);
    throw error;
  }
};

module.exports = {
  uploadToS3,
  uploadBufferToS3,
  downloadFromS3,
  listS3Files,
  getSignedUrl,
  deleteFromS3,
  getAllVideos,
  s3,
  BUCKET
};

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const dotenv = require('dotenv');

dotenv.config();

const execAsync = promisify(exec);

// AWS Setup
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const sqs = new AWS.SQS({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const BUCKET = process.env.S3_BUCKET_NAME;
const QUEUE_URL = process.env.SQS_QUEUE_URL;
const TMP_DIR = '/tmp/video-processing';

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ─── LOGGING ────────────────────────────────────────────────────────────────
const log = (msg) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
};

// ─── S3 HELPERS ─────────────────────────────────────────────────────────────
const downloadFromS3 = async (key, localPath) => {
  log(`⬇️  Downloading ${key} from S3...`);
  const data = await s3.getObject({ Bucket: BUCKET, Key: key }).promise();
  fs.writeFileSync(localPath, data.Body);
  log(`✅ Downloaded: ${localPath}`);
};

const uploadToS3 = async (localPath, key, contentType = 'video/mp4') => {
  log(`⬆️  Uploading ${key} to S3...`);
  const body = fs.readFileSync(localPath);
  await s3.upload({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }).promise();
  log(`✅ Uploaded: ${key}`);
};

// ─── VIDEO PROCESSING TASKS ──────────────────────────────────────────────────

// 1. Compress video
const compressVideo = async (inputPath, videoId) => {
  const outputPath = path.join(TMP_DIR, `${videoId}_compressed.mp4`);
  log('🔧 Compressing video...');
  await execAsync(`ffmpeg -i "${inputPath}" -vcodec libx264 -crf 28 -preset fast -acodec aac -y "${outputPath}"`);
  await uploadToS3(outputPath, `processed/${videoId}_compressed.mp4`, 'video/mp4');
  fs.unlinkSync(outputPath);
  log('✅ Compression done');
};

// 2. Generate thumbnails at multiple timestamps
const generateThumbnails = async (inputPath, videoId) => {
  log('🖼️  Generating thumbnails...');
  const timestamps = ['00:00:03', '00:00:05', '00:00:10'];
  for (let i = 0; i < timestamps.length; i++) {
    const thumbPath = path.join(TMP_DIR, `${videoId}_thumb${i + 1}.jpg`);
    try {
      await execAsync(`ffmpeg -i "${inputPath}" -ss ${timestamps[i]} -vframes 1 -q:v 2 -y "${thumbPath}"`);
      await uploadToS3(thumbPath, `thumbnails/${videoId}_thumb${i + 1}.jpg`, 'image/jpeg');
      fs.unlinkSync(thumbPath);
    } catch (e) {
      log(`⚠️ Thumbnail ${i + 1} failed (video may be shorter): ${e.message}`);
    }
  }
  // Also create main thumb
  const mainThumb = path.join(TMP_DIR, `${videoId}_thumb.jpg`);
  try {
    await execAsync(`ffmpeg -i "${inputPath}" -ss 00:00:02 -vframes 1 -q:v 2 -y "${mainThumb}"`);
    await uploadToS3(mainThumb, `thumbnails/${videoId}_thumb.jpg`, 'image/jpeg');
    fs.unlinkSync(mainThumb);
  } catch (e) {
    log('⚠️ Main thumbnail failed');
  }
  log('✅ Thumbnails done');
};

// 3. Generate preview clip (first 10 seconds)
const generatePreview = async (inputPath, videoId) => {
  const previewPath = path.join(TMP_DIR, `${videoId}_preview.mp4`);
  log('🎬 Generating preview clip...');
  try {
    await execAsync(`ffmpeg -i "${inputPath}" -t 10 -vcodec libx264 -crf 30 -acodec aac -y "${previewPath}"`);
    await uploadToS3(previewPath, `preview/${videoId}_preview.mp4`, 'video/mp4');
    fs.unlinkSync(previewPath);
    log('✅ Preview done');
  } catch (e) {
    log(`⚠️ Preview failed: ${e.message}`);
  }
};

// 4. Add watermark
// 4. Add watermark
const addWatermark = async (inputPath, videoId) => {
  const watermarkPath = path.join(TMP_DIR, `${videoId}_watermark.mp4`);
  log('💧 Adding watermark...');

  try {
    await execAsync(
`ffmpeg -i "${inputPath}" -vf "drawbox=x=0:y=0:w=iw:h=80:color=black@0.6:t=fill,drawtext=text='© CloudVideoPlatform':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=20" -codec:a copy -y "${watermarkPath}"`
);

    await uploadToS3(
      watermarkPath,
      `processed/${videoId}_watermark.mp4`,
      'video/mp4'
    );

    fs.unlinkSync(watermarkPath);

    log('✅ Watermark done');

  } catch (e) {
    log(`⚠️ Watermark failed: ${e.message}`);
  }
};

// 5. Extract metadata
const extractMetadata = async (inputPath, videoId, originalName) => {
  log('📊 Extracting metadata...');
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`
    );
    const probeData = JSON.parse(stdout);
    const videoStream = probeData.streams.find(s => s.codec_type === 'video') || {};
    const audioStream = probeData.streams.find(s => s.codec_type === 'audio') || {};
    const format = probeData.format || {};

    const metadata = {
      videoId,
      originalName,
      duration: parseFloat(format.duration || 0).toFixed(2) + ' seconds',
      fileSize: (parseInt(format.size || 0) / (1024 * 1024)).toFixed(2) + ' MB',
      bitrate: (parseInt(format.bit_rate || 0) / 1000).toFixed(0) + ' kbps',
      format: format.format_long_name,
      video: {
        codec: videoStream.codec_name,
        resolution: `${videoStream.width}x${videoStream.height}`,
        frameRate: videoStream.r_frame_rate,
        bitrate: videoStream.bit_rate
      },
      audio: {
        codec: audioStream.codec_name,
        sampleRate: audioStream.sample_rate,
        channels: audioStream.channels
      },
      processedAt: new Date().toISOString()
    };

    const metaBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
    await s3.upload({
      Bucket: BUCKET,
      Key: `metadata/${videoId}.json`,
      Body: metaBuffer,
      ContentType: 'application/json'
    }).promise();

    log('✅ Metadata done');
    return metadata;
  } catch (e) {
    log(`⚠️ Metadata extraction failed: ${e.message}`);
  }
};

// 6. Convert to WebM
const convertFormat = async (inputPath, videoId) => {
  const webmPath = path.join(TMP_DIR, `${videoId}.webm`);
  log('🔄 Converting to WebM format...');
  try {
    await execAsync(`ffmpeg -i "${inputPath}" -c:v libvpx -b:v 1M -c:a libvorbis -y "${webmPath}"`);
    await uploadToS3(webmPath, `processed/${videoId}.webm`, 'video/webm');
    fs.unlinkSync(webmPath);
    log('✅ Format conversion done');
  } catch (e) {
    log(`⚠️ Format conversion failed: ${e.message}`);
  }
};

// ─── MAIN PROCESS JOB ────────────────────────────────────────────────────────
const processJob = async (message) => {
  let localInputPath = null;
  
  try {
    const job = JSON.parse(message.Body);
    const { videoKey, videoId, originalName } = job;

    log(`\n🎬 ===== PROCESSING JOB: ${videoId} =====`);
    log(`📁 File: ${originalName}`);
    log(`☁️  S3 Key: ${videoKey}`);

    // Download video from S3
    const ext = path.extname(videoKey) || '.mp4';
    localInputPath = path.join(TMP_DIR, `${videoId}_input${ext}`);
    await downloadFromS3(videoKey, localInputPath);

    // Run all processing tasks
    await compressVideo(localInputPath, videoId);
    await generateThumbnails(localInputPath, videoId);
    await generatePreview(localInputPath, videoId);
    await addWatermark(localInputPath, videoId);
    await extractMetadata(localInputPath, videoId, originalName);
    await convertFormat(localInputPath, videoId);

    log(`✅ ===== ALL TASKS COMPLETE FOR: ${videoId} =====\n`);

  } catch (error) {
    log(`❌ Error processing job: ${error.message}`);
  } finally {
    // Always clean up input file
    if (localInputPath && fs.existsSync(localInputPath)) {
      fs.unlinkSync(localInputPath);
    }
  }
};

// ─── WORKER LOOP ─────────────────────────────────────────────────────────────
const startWorker = async () => {
  log('🚀 Video Processing Worker Started');
  log(`📡 Queue: ${QUEUE_URL}`);
  log(`🪣 Bucket: ${BUCKET}`);
  log('⏳ Waiting for jobs...\n');

  while (true) {
    try {
      const result = await sqs.receiveMessage({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All']
      }).promise();

      const messages = result.Messages || [];

      if (messages.length === 0) {
        log('⏳ No jobs in queue. Waiting...');
        continue;
      }

      for (const message of messages) {
        await processJob(message);

        // Delete message after processing
        await sqs.deleteMessage({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle
        }).promise();
        log('🗑️  Message removed from queue');
      }

    } catch (error) {
      log(`❌ Worker error: ${error.message}`);
      log('⏳ Retrying in 5 seconds...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
};

startWorker();

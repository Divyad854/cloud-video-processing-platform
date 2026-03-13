# ☁️ Cloud Video Processing Platform
### Built with React + Node.js + AWS (S3, EC2, SQS, CloudWatch, IAM)

---

## ✅ Your Completed Steps (1-10)
- Step 1: AWS Account ✅
- Step 2: S3 Bucket `cloud-video-processing-project` with 5 folders ✅
- Step 3: SQS Queue `video-processing-queue` ✅
- Step 4: IAM Role ✅
- Step 5: EC2 Instance `video-processing-server` (IP: 13.233.127.175) ✅
- Step 6: Connected to EC2 ✅
- Step 7: Server updated ✅
- Step 8: Node.js + npm installed ✅
- Step 9: FFmpeg installed ✅
- Step 10: PM2 installed ✅

---

## 🔴 IMPORTANT: Rotate Your AWS Keys First!
Your old keys were exposed. Before starting:
1. Go to AWS Console → IAM → Users → Security credentials
2. Deactivate the old access key: AKIAQLIUQ3S2BDBCLNFC
3. Create a new access key
4. Update `backend/.env` with the new keys

---

## 📁 Project Structure
```
cloud-video-platform/
├── backend/
│   ├── server.js          ← Express API server
│   ├── worker.js          ← SQS video processing worker
│   ├── .env               ← AWS credentials (UPDATE THIS)
│   ├── package.json
│   ├── routes/
│   │   ├── upload.js      ← POST /api/upload
│   │   └── videos.js      ← GET /api/videos
│   └── services/
│       ├── s3Service.js   ← S3 operations
│       └── sqsService.js  ← SQS operations
└── frontend/
    ├── .env               ← API URL config
    ├── package.json
    └── src/
        ├── App.js
        ├── pages/
        │   ├── UploadPage.js   ← Drag & drop upload UI
        │   └── GalleryPage.js  ← Video gallery
        └── components/
            └── VideoCard.js    ← Individual video card
```

---

## 🚀 REMAINING STEPS (11 onwards)

### STEP 11 — Update Your AWS Keys in .env

On your EC2 server, open the backend .env file:
```bash
nano backend/.env
```

Update these values with your NEW keys:
```
AWS_ACCESS_KEY_ID=YOUR_NEW_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_NEW_SECRET_HERE
```

Also update in `frontend/.env` if backend is on EC2:
```
REACT_APP_API_URL=http://13.233.127.175:5000
```

---

### STEP 12 — Upload Backend to EC2

**Option A: Copy files using SCP from your computer:**
```bash
# Run this on your local computer (not EC2)
scp -i video-project-key.pem -r ./cloud-video-platform/backend ubuntu@13.233.127.175:~/
```

**Option B: Create files directly on EC2 using nano:**
```bash
# On EC2, create the project folder
mkdir -p ~/video-processing-backend/routes
mkdir -p ~/video-processing-backend/services
cd ~/video-processing-backend

# Then use nano to create each file (paste content from the zip)
nano server.js
nano worker.js
# etc.
```

**Option C: Use Git (recommended):**
```bash
# On EC2
sudo apt install git -y
git clone YOUR_GITHUB_REPO_URL
cd cloud-video-platform/backend
```

---

### STEP 13 — Install Backend Dependencies on EC2

```bash
cd ~/video-processing-backend
npm install
```

This installs: express, aws-sdk, multer, cors, dotenv, uuid, etc.

---

### STEP 14 — Start the Backend Server on EC2

```bash
# Start the API server
pm2 start server.js --name "video-api"

# Start the worker (processes SQS jobs)
pm2 start worker.js --name "video-worker"

# Check both are running
pm2 list

# See logs
pm2 logs video-api
pm2 logs video-worker

# Auto-start on reboot
pm2 startup
pm2 save
```

---

### STEP 15 — Test Backend is Working

From your browser or Postman:
```
http://13.233.127.175:5000/api/health
```

You should see:
```json
{"status":"OK","message":"Cloud Video Processing Platform is running"}
```

---

### STEP 16 — Set Up React Frontend (On Your Local Computer)

```bash
cd cloud-video-platform/frontend
npm install
npm start
```

React opens at: http://localhost:3000

The `.env` file already points to your EC2:
```
REACT_APP_API_URL=http://13.233.127.175:5000
```

---

### STEP 17 — Test the Full Flow

1. Open http://localhost:3000
2. Upload a video (MP4/AVI/MOV/WebM)
3. Watch it upload to S3 with progress bar
4. Go to Gallery page
5. See the video card with processing status
6. Watch tasks complete: Compressed ✅ Thumbnail ✅ Preview ✅ etc.

---

### STEP 18 — Enable CloudWatch Logging (Optional but good for marks)

On EC2:
```bash
# Install CloudWatch agent
sudo apt install amazon-cloudwatch-agent -y

# Configure it
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

Or just view PM2 logs which already show all processing steps.

---

### STEP 19 — Build React for Production (Deploy to EC2)

```bash
# On your local computer
cd frontend
npm run build

# Copy build to EC2
scp -i video-project-key.pem -r ./build ubuntu@13.233.127.175:~/frontend-build

# On EC2, install nginx to serve React
sudo apt install nginx -y
sudo cp -r ~/frontend-build/* /var/www/html/
sudo systemctl restart nginx
```

Now your full app runs at: http://13.233.127.175

---

### STEP 20 — Open Required Ports in EC2 Security Group

In AWS Console → EC2 → Security Groups:
Add inbound rules:
| Port | Protocol | Source    | Purpose      |
|------|----------|-----------|--------------|
| 22   | TCP      | Anywhere  | SSH          |
| 80   | TCP      | Anywhere  | HTTP/Nginx   |
| 3000 | TCP      | Anywhere  | React dev    |
| 5000 | TCP      | Anywhere  | Node API     |

---

## 🔄 Complete System Flow

```
User Upload Video
      ↓
React Frontend (localhost:3000)
      ↓
POST /api/upload
      ↓
Node Backend (EC2:5000)
      ↓
Upload Video → S3 (uploads/videoId.mp4)
      ↓
Send Job → SQS Queue
      ↓
Worker.js (reads SQS every 20s)
      ↓
Download video from S3
      ↓
FFmpeg Processing:
  ├── Compress (libx264)
  ├── Thumbnail (frame extract)
  ├── Preview clip (first 10s)
  ├── Watermark (text overlay)
  ├── Metadata (ffprobe JSON)
  └── Convert to WebM
      ↓
Upload all results → S3
      ↓
Delete SQS message
      ↓
React Gallery shows results
```

---

## 👥 Work Division for 4 Members

| Member | Task |
|--------|------|
| Member 1 | React Frontend (UploadPage + GalleryPage) |
| Member 2 | Node Backend API (server.js + routes) |
| Member 3 | AWS Infrastructure (S3 + SQS + IAM + EC2) |
| Member 4 | Video Processing Worker (worker.js + FFmpeg) |

---

## 📝 Resume Description

> Built a scalable **Distributed Cloud Video Processing Platform** using **AWS S3, EC2, SQS, CloudWatch, and IAM** with a **React** frontend and **Node.js/Express** backend. The system supports asynchronous video transcoding, compression (up to 75% size reduction), thumbnail generation, watermarking, metadata extraction, and preview clip generation using **FFmpeg**, with queue-based job processing via **Amazon SQS**.

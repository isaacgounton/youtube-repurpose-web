# Coolify Deployment Guide

## 🚀 **Deploying YouTube Repurpose Web to Coolify**

This guide covers deploying the application with video clip generation capabilities to Coolify.

## 📋 **Prerequisites**

1. **Coolify instance** running and accessible
2. **GitHub repository** with your code
3. **S3 bucket** (optional, for cloud storage)
4. **Domain name** (optional, for custom domain)

## 🔧 **Step 1: Prepare Your Repository**

Ensure these files are in your repository:
- ✅ `Dockerfile` (already created)
- ✅ `next.config.ts` (updated for standalone build)
- ✅ `.env.example` (environment variables template)

## 🌐 **Step 2: Create Application in Coolify**

1. **Login to Coolify**
2. **Create New Application**
   - Choose "Docker" as deployment type
   - Connect your GitHub repository
   - Select the branch (usually `main`)

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Dockerfile path: `./Dockerfile`
   - Port: `3000`

## ⚙️ **Step 3: Environment Variables**

### **Required Variables (Local Storage)**
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=/app/public/clips
LOCAL_BASE_URL=https://your-domain.com
```

### **Optional Variables (S3 Storage)**
```env
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

### **Additional Configuration**
```env
DEFAULT_VIDEO_QUALITY=medium
MAX_CLIP_DURATION=300
DOWNLOAD_TIMEOUT=600000
MAX_DOWNLOADS_PER_HOUR=10
DEBUG_VIDEO_DOWNLOADS=false
```

## 🐳 **Step 4: Docker Configuration**

The provided `Dockerfile` includes:
- ✅ **Node.js 18 Alpine** base image
- ✅ **Python 3** for yt-dlp
- ✅ **ffmpeg** for video processing
- ✅ **yt-dlp** installation
- ✅ **Standalone Next.js build**
- ✅ **Proper file permissions**

## 📁 **Step 5: Storage Configuration**

### **Option A: Local Storage (Default)**
- Files stored in container at `/app/public/clips`
- Accessible at `https://your-domain.com/clips/filename.mp4`
- **Note**: Files will be lost when container restarts
- **Recommended**: Use persistent volumes in Coolify

### **Option B: S3 Storage (Recommended for Production)**
1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://your-clips-bucket
   ```

2. **Set Bucket Policy** (public read access)
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-clips-bucket/*"
       }
     ]
   }
   ```

3. **Create IAM User** with S3 permissions
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::your-clips-bucket/*"
       }
     ]
   }
   ```

## 🔒 **Step 6: Security Considerations**

### **Rate Limiting**
- Set `MAX_DOWNLOADS_PER_HOUR` to prevent abuse
- Consider implementing IP-based rate limiting

### **Input Validation**
- YouTube URL validation is built-in
- Duration limits enforced via `MAX_CLIP_DURATION`

### **File Access**
- Local files served through Next.js API routes
- S3 files served directly from bucket (faster)

## 🚀 **Step 7: Deploy**

1. **Push to Repository**
   ```bash
   git add .
   git commit -m "Add video clip generation"
   git push origin main
   ```

2. **Deploy in Coolify**
   - Click "Deploy" in Coolify dashboard
   - Monitor build logs for any errors
   - Wait for deployment to complete

3. **Verify Installation**
   - Check that yt-dlp is available: `yt-dlp --version`
   - Check that ffmpeg is available: `ffmpeg -version`
   - Test video download functionality

## 🧪 **Step 8: Testing**

1. **Load a YouTube video** in your deployed app
2. **Set clip times** and title
3. **Click "Generate Video Clip"**
4. **Monitor progress** and check for errors
5. **Verify generated URL** works

## 🔍 **Troubleshooting**

### **Common Issues**

1. **yt-dlp not found**
   ```bash
   # Check if yt-dlp is installed in container
   docker exec -it container_name which yt-dlp
   ```

2. **ffmpeg not found**
   ```bash
   # Check if ffmpeg is installed
   docker exec -it container_name which ffmpeg
   ```

3. **Permission errors**
   ```bash
   # Check directory permissions
   docker exec -it container_name ls -la /app/public/clips
   ```

4. **S3 upload failures**
   - Verify AWS credentials
   - Check bucket permissions
   - Ensure bucket exists in correct region

### **Debug Mode**
Set `DEBUG_VIDEO_DOWNLOADS=true` to enable verbose logging.

### **Logs**
Check Coolify application logs for detailed error messages.

## 📊 **Performance Optimization**

### **Resource Requirements**
- **CPU**: 2+ cores recommended for video processing
- **RAM**: 2GB+ recommended
- **Storage**: 10GB+ for local storage option

### **Scaling Considerations**
- Video processing is CPU-intensive
- Consider horizontal scaling for high traffic
- Use S3 storage for better performance

## 🔄 **Maintenance**

### **Updates**
- Keep yt-dlp updated: `pip install --upgrade yt-dlp`
- Monitor for YouTube API changes
- Update ffmpeg as needed

### **Monitoring**
- Monitor disk usage (local storage)
- Track download success rates
- Monitor S3 costs (if using S3)

## 🎯 **Production Checklist**

- [ ] Environment variables configured
- [ ] S3 bucket created and configured (if using S3)
- [ ] Domain name pointed to Coolify
- [ ] SSL certificate configured
- [ ] Rate limiting configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Legal compliance reviewed

## 📞 **Support**

If you encounter issues:
1. Check Coolify application logs
2. Verify environment variables
3. Test yt-dlp and ffmpeg manually
4. Check network connectivity
5. Review S3 permissions (if using S3)

Your YouTube Repurpose Web application should now be successfully deployed on Coolify with full video clip generation capabilities!

// Next.js API Route for downloading video clips
// This requires yt-dlp and ffmpeg to be installed on the server

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getAppConfig } from '@/lib/config';

const execAsync = promisify(exec);

interface DownloadRequest {
  youtubeUrl: string;
  startTime: number;
  endTime: number;
  title: string;
  quality?: 'high' | 'medium' | 'low';
  storageConfig: {
    provider: 'local' | 's3' | 'cloudflare';
    localConfig?: {
      storagePath: string;
      baseUrl: string;
    };
    s3Config?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
}

// In-memory progress tracking (in production, use Redis or database)
const downloadProgress = new Map<string, {
  status: 'pending' | 'downloading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  clipUrl?: string;
  fileSize?: number;
}>();

export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();
    const { youtubeUrl, startTime, endTime, title, quality = 'medium' } = body;

    // Get server configuration
    const config = getAppConfig();

    // Validate input
    if (!youtubeUrl || startTime < 0 || endTime <= startTime) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Check duration limits
    const duration = endTime - startTime;
    if (duration > config.video.maxDuration) {
      return NextResponse.json(
        { success: false, error: `Clip duration exceeds maximum of ${config.video.maxDuration} seconds` },
        { status: 400 }
      );
    }

    const clipId = uuidv4();

    // Initialize progress
    downloadProgress.set(clipId, {
      status: 'pending',
      progress: 0,
    });

    // Start download process asynchronously
    processVideoClip(clipId, { youtubeUrl, startTime, endTime, title, quality, storageConfig: config.storage }).catch(error => {
      console.error('Error processing video clip:', error);
      downloadProgress.set(clipId, {
        status: 'error',
        progress: 0,
        error: error.message,
      });
    });

    return NextResponse.json({
      success: true,
      clipId,
      duration,
      message: 'Download started',
    });

  } catch (error) {
    console.error('Error in download-clip API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processVideoClip(clipId: string, request: DownloadRequest) {
  const { youtubeUrl, startTime, endTime, title, quality, storageConfig } = request;
  
  try {
    // Update status to downloading
    downloadProgress.set(clipId, {
      status: 'downloading',
      progress: 10,
    });

    // Create output directory
    const outputDir = path.join(process.cwd(), 'public', 'clips');
    await fs.mkdir(outputDir, { recursive: true });

    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    const outputFile = path.join(outputDir, `${clipId}_${sanitizedTitle}.mp4`);

    // Build yt-dlp command
    const duration = endTime - startTime;
    const formatSelector = getFormatSelector(quality);
    
    const ytDlpCommand = [
      'yt-dlp',
      `"${youtubeUrl}"`,
      '-f', `"${formatSelector}"`,
      '--external-downloader', 'ffmpeg',
      '--external-downloader-args', `"ffmpeg:-ss ${startTime} -t ${duration}"`,
      '-o', `"${outputFile}"`,
      '--no-playlist',
      '--no-warnings'
    ].join(' ');

    console.log('Executing command:', ytDlpCommand);

    // Update status to processing
    downloadProgress.set(clipId, {
      status: 'processing',
      progress: 50,
    });

    // Execute yt-dlp command
    const { stdout, stderr } = await execAsync(ytDlpCommand, {
      timeout: 300000, // 5 minutes timeout
    });

    console.log('yt-dlp output:', stdout);
    if (stderr) console.log('yt-dlp stderr:', stderr);

    // Check if file was created
    try {
      const stats = await fs.stat(outputFile);
      const fileSize = stats.size;

      // Generate public URL
      const clipUrl = `${storageConfig.localConfig?.baseUrl || 'http://localhost:3000'}/clips/${path.basename(outputFile)}`;

      // Upload to S3 if configured
      if (storageConfig.provider === 's3' && storageConfig.s3Config) {
        const s3Url = await uploadToS3(outputFile, storageConfig.s3Config, clipId);
        
        // Delete local file after S3 upload
        await fs.unlink(outputFile);
        
        downloadProgress.set(clipId, {
          status: 'complete',
          progress: 100,
          clipUrl: s3Url,
          fileSize,
        });
      } else {
        // Local storage
        downloadProgress.set(clipId, {
          status: 'complete',
          progress: 100,
          clipUrl,
          fileSize,
        });
      }

    } catch (fileError) {
      throw new Error(`Output file not found: ${fileError}`);
    }

  } catch (error) {
    console.error('Error processing video clip:', error);
    downloadProgress.set(clipId, {
      status: 'error',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function uploadToS3(filePath: string, s3Config: any, clipId: string): Promise<string> {
  // This would require AWS SDK
  // For now, return a placeholder
  return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/clips/${clipId}.mp4`;
}

function getFormatSelector(quality?: string): string {
  switch (quality) {
    case 'high': return 'best[height<=1080][ext=mp4]';
    case 'medium': return 'best[height<=720][ext=mp4]';
    case 'low': return 'best[height<=480][ext=mp4]';
    default: return 'best[height<=720][ext=mp4]';
  }
}

// Progress check endpoint
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const clipId = url.searchParams.get('clipId');

  if (!clipId) {
    return NextResponse.json(
      { error: 'clipId parameter required' },
      { status: 400 }
    );
  }

  const progress = downloadProgress.get(clipId);
  if (!progress) {
    return NextResponse.json(
      { error: 'Clip not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(progress);
}

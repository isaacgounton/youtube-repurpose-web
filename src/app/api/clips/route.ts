// API route to list all existing clips
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getAppConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const config = getAppConfig();
    const outputDir = path.join(process.cwd(), 'public', 'clips');
    
    // Ensure directory exists
    try {
      await fs.access(outputDir);
    } catch {
      // Directory doesn't exist, return empty array
      return NextResponse.json([]);
    }
    
    const files = await fs.readdir(outputDir);
    const clipFiles = files.filter(file => file.endsWith('.mp4'));
    
    const clips = await Promise.all(
      clipFiles.map(async (file) => {
        try {
          const filePath = path.join(outputDir, file);
          const stats = await fs.stat(filePath);
          
          // Extract clip ID from filename (format: clipId_title.mp4)
          const clipId = file.split('_')[0];
          const baseUrl = config.storage.localConfig?.baseUrl || 'http://localhost:3000';
          
          return {
            clipId,
            fileName: file,
            clipUrl: `${baseUrl}/clips/${file}`,
            fileSize: stats.size,
            createdAt: stats.birthtime,
            format: 'mp4',
            success: true,
          };
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null entries and sort by creation date
    const validClips = clips
      .filter(clip => clip !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json(validClips);
    
  } catch (error) {
    console.error('Error listing clips:', error);
    return NextResponse.json(
      { error: 'Failed to list clips' },
      { status: 500 }
    );
  }
}

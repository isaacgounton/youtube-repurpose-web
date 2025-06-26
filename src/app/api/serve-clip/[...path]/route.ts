// API route to serve video clips securely
import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    
    // Security: Only allow mp4 files and prevent directory traversal
    if (!filePath.endsWith('.mp4') || filePath.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Construct full file path
    const fullPath = path.join(process.cwd(), 'public', 'clips', filePath);
    
    try {
      // Check if file exists
      const stats = await stat(fullPath);
      
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }

      // Read file
      const fileBuffer = await readFile(fullPath);
      
      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': stats.size.toString(),
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        },
      });
      
    } catch (fileError) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('Error serving clip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

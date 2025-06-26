// API route to delete a specific clip
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { clipId } = resolvedParams;
    
    if (!clipId) {
      return NextResponse.json(
        { error: 'clipId parameter required' },
        { status: 400 }
      );
    }

    const outputDir = path.join(process.cwd(), 'public', 'clips');
    
    try {
      const files = await fs.readdir(outputDir);
      const clipFile = files.find(file => file.startsWith(clipId) && file.endsWith('.mp4'));
      
      if (!clipFile) {
        return NextResponse.json(
          { error: 'Clip file not found' },
          { status: 404 }
        );
      }

      const filePath = path.join(outputDir, clipFile);
      await fs.unlink(filePath);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Clip deleted successfully' 
      });
      
    } catch (fileError) {
      console.error('Error deleting clip file:', fileError);
      return NextResponse.json(
        { error: 'Failed to delete clip file' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in delete clip API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

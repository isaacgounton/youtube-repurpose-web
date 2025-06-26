// Video Download and Storage Service
// This would require a backend service with yt-dlp

export interface VideoClipRequest {
  youtubeUrl: string;
  startTime: number;
  endTime: number;
  title: string;
  quality?: 'high' | 'medium' | 'low';
}

export interface VideoClipResponse {
  success: boolean;
  clipUrl?: string;
  downloadUrl?: string;
  error?: string;
  clipId: string;
  duration: number;
  fileSize: number;
  format: string;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'cloudflare';
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  localConfig?: {
    storagePath: string;
    baseUrl: string;
  };
}

export class VideoClipService {
  private apiBaseUrl: string;
  private storageConfig: StorageConfig;

  constructor(apiBaseUrl: string, storageConfig: StorageConfig) {
    this.apiBaseUrl = apiBaseUrl;
    this.storageConfig = storageConfig;
  }

  /**
   * Download and process a video clip
   */
  async downloadClip(request: VideoClipRequest): Promise<VideoClipResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/download-clip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          storageConfig: this.storageConfig,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: VideoClipResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error downloading clip:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        clipId: '',
        duration: 0,
        fileSize: 0,
        format: '',
      };
    }
  }

  /**
   * Check download progress
   */
  async checkProgress(clipId: string): Promise<{
    status: 'pending' | 'downloading' | 'processing' | 'complete' | 'error';
    progress: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/clip-progress/${clipId}`);
      return await response.json();
    } catch (error) {
      return {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get clip metadata
   */
  async getClipInfo(clipId: string): Promise<VideoClipResponse | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/clip-info/${clipId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error getting clip info:', error);
      return null;
    }
  }

  /**
   * Delete a clip
   */
  async deleteClip(clipId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/clip/${clipId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting clip:', error);
      return false;
    }
  }
}

// Local storage fallback for clip metadata
export class LocalClipStorage {
  private storageKey = 'youtube-clips';

  saveClipMetadata(clipId: string, metadata: VideoClipResponse): void {
    const clips = this.getAllClips();
    clips[clipId] = metadata;
    localStorage.setItem(this.storageKey, JSON.stringify(clips));
  }

  getClipMetadata(clipId: string): VideoClipResponse | null {
    const clips = this.getAllClips();
    return clips[clipId] || null;
  }

  getAllClips(): Record<string, VideoClipResponse> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  }

  removeClip(clipId: string): void {
    const clips = this.getAllClips();
    delete clips[clipId];
    localStorage.setItem(this.storageKey, JSON.stringify(clips));
  }

  clearAll(): void {
    localStorage.removeItem(this.storageKey);
  }
}

// Utility functions
export function generateClipId(): string {
  return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function getVideoFormat(quality: string): string {
  switch (quality) {
    case 'high': return 'mp4[height<=1080]';
    case 'medium': return 'mp4[height<=720]';
    case 'low': return 'mp4[height<=480]';
    default: return 'mp4[height<=720]';
  }
}

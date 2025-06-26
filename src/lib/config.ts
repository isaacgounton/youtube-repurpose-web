// Configuration management for deployment
import { StorageConfig } from './videoDownloader';

export interface AppConfig {
  storage: StorageConfig;
  video: {
    defaultQuality: 'high' | 'medium' | 'low';
    maxDuration: number;
    downloadTimeout: number;
  };
  security: {
    maxDownloadsPerHour: number;
  };
  debug: {
    verboseLogging: boolean;
  };
}

export function getAppConfig(): AppConfig {
  const storageProvider = process.env.STORAGE_PROVIDER || 'local';
  
  let storageConfig: StorageConfig;
  
  if (storageProvider === 's3') {
    storageConfig = {
      provider: 's3',
      s3Config: {
        bucket: process.env.S3_BUCKET_NAME || '',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    };
  } else {
    storageConfig = {
      provider: 'local',
      localConfig: {
        storagePath: process.env.LOCAL_STORAGE_PATH || '/app/public/clips',
        baseUrl: process.env.LOCAL_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
    };
  }

  return {
    storage: storageConfig,
    video: {
      defaultQuality: (process.env.DEFAULT_VIDEO_QUALITY as any) || 'medium',
      maxDuration: parseInt(process.env.MAX_CLIP_DURATION || '300'),
      downloadTimeout: parseInt(process.env.DOWNLOAD_TIMEOUT || '600000'),
    },
    security: {
      maxDownloadsPerHour: parseInt(process.env.MAX_DOWNLOADS_PER_HOUR || '10'),
    },
    debug: {
      verboseLogging: process.env.DEBUG_VIDEO_DOWNLOADS === 'true',
    },
  };
}

// Client-side configuration (safe for browser)
export function getClientConfig() {
  return {
    apiBaseUrl: '',
    storage: {
      provider: 'local' as const,
      localConfig: {
        storagePath: '/clips',
        baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      },
    },
  };
}

import { useState, useCallback, useRef } from 'react';
import { 
  VideoClipService, 
  LocalClipStorage, 
  VideoClipRequest, 
  VideoClipResponse,
  generateClipId,
  StorageConfig 
} from '@/lib/videoDownloader';

export interface DownloadProgress {
  clipId: string;
  status: 'pending' | 'downloading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export interface UseVideoDownloaderReturn {
  downloadClip: (request: VideoClipRequest) => Promise<string | null>;
  getClipUrl: (clipId: string) => string | null;
  downloadProgress: Record<string, DownloadProgress>;
  isDownloading: boolean;
  error: string | null;
  clearError: () => void;
  deleteClip: (clipId: string) => Promise<boolean>;
  getAllClips: () => VideoClipResponse[];
}

export function useVideoDownloader(
  apiBaseUrl: string = '',
  storageConfig: StorageConfig = {
    provider: 'local',
    localConfig: {
      storagePath: '/clips',
      baseUrl: window.location.origin,
    }
  }
): UseVideoDownloaderReturn {
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoService = useRef(new VideoClipService(apiBaseUrl, storageConfig));
  const localStorage = useRef(new LocalClipStorage());
  const progressIntervals = useRef<Record<string, NodeJS.Timeout>>({});

  const downloadClip = useCallback(async (request: VideoClipRequest): Promise<string | null> => {
    const clipId = generateClipId();
    setError(null);
    setIsDownloading(true);

    try {
      // Initialize progress tracking
      setDownloadProgress(prev => ({
        ...prev,
        [clipId]: {
          clipId,
          status: 'pending',
          progress: 0,
        }
      }));

      // Start download
      const response = await videoService.current.downloadClip({
        ...request,
      });

      if (!response.success) {
        throw new Error(response.error || 'Download failed');
      }

      // Save metadata locally
      localStorage.current.saveClipMetadata(clipId, response);

      // Start progress polling
      startProgressPolling(clipId);

      return clipId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      
      setDownloadProgress(prev => ({
        ...prev,
        [clipId]: {
          clipId,
          status: 'error',
          progress: 0,
          error: errorMessage,
        }
      }));
      
      return null;
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const startProgressPolling = useCallback((clipId: string) => {
    const pollProgress = async () => {
      try {
        const progress = await videoService.current.checkProgress(clipId);
        
        setDownloadProgress(prev => ({
          ...prev,
          [clipId]: {
            clipId,
            ...progress,
          }
        }));

        // Stop polling when complete or error
        if (progress.status === 'complete' || progress.status === 'error') {
          if (progressIntervals.current[clipId]) {
            clearInterval(progressIntervals.current[clipId]);
            delete progressIntervals.current[clipId];
          }

          // Update local storage with final result
          if (progress.status === 'complete') {
            const clipInfo = await videoService.current.getClipInfo(clipId);
            if (clipInfo) {
              localStorage.current.saveClipMetadata(clipId, clipInfo);
            }
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        if (progressIntervals.current[clipId]) {
          clearInterval(progressIntervals.current[clipId]);
          delete progressIntervals.current[clipId];
        }
      }
    };

    // Poll every 2 seconds
    progressIntervals.current[clipId] = setInterval(pollProgress, 2000);
    
    // Initial poll
    pollProgress();
  }, []);

  const getClipUrl = useCallback((clipId: string): string | null => {
    const metadata = localStorage.current.getClipMetadata(clipId);
    return metadata?.clipUrl || null;
  }, []);

  const deleteClip = useCallback(async (clipId: string): Promise<boolean> => {
    try {
      const success = await videoService.current.deleteClip(clipId);
      if (success) {
        localStorage.current.removeClip(clipId);
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[clipId];
          return newProgress;
        });
      }
      return success;
    } catch (error) {
      console.error('Error deleting clip:', error);
      return false;
    }
  }, []);

  const getAllClips = useCallback((): VideoClipResponse[] => {
    const clips = localStorage.current.getAllClips();
    return Object.values(clips);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup intervals on unmount
  const cleanup = useCallback(() => {
    Object.values(progressIntervals.current).forEach(interval => {
      clearInterval(interval);
    });
    progressIntervals.current = {};
  }, []);

  // Auto-cleanup effect would go here in a real implementation
  // useEffect(() => cleanup, [cleanup]);

  return {
    downloadClip,
    getClipUrl,
    downloadProgress,
    isDownloading,
    error,
    clearError,
    deleteClip,
    getAllClips,
  };
}

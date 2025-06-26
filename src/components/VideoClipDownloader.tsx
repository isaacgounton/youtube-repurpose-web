"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVideoDownloader } from "@/hooks/useVideoDownloader";
import { Download, Copy, Check, ExternalLink, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatTime } from "@/components/video/utils";
import { getClientConfig } from "@/lib/config";

interface VideoClipDownloaderProps {
  youtubeUrl: string;
  videoId: string;
  startTime: number;
  endTime: number;
  clipTitle: string;
  onClipGenerated?: (clipUrl: string, clipId: string) => void;
}

export function VideoClipDownloader({
  youtubeUrl,
  videoId,
  startTime,
  endTime,
  clipTitle,
  onClipGenerated,
}: VideoClipDownloaderProps) {
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  
  const clientConfig = getClientConfig();

  const {
    downloadClip,
    getClipUrl,
    downloadProgress,
    isDownloading,
    error,
    clearError,
    deleteClip,
    getAllClips,
  } = useVideoDownloader(clientConfig.apiBaseUrl, clientConfig.storage);

  const handleDownloadClip = async () => {
    if (!youtubeUrl || !clipTitle) {
      toast.error("Please ensure video is loaded and clip has a title");
      return;
    }

    clearError();
    
    const clipId = await downloadClip({
      youtubeUrl,
      startTime,
      endTime,
      title: clipTitle,
      quality,
    });

    if (clipId) {
      toast.success("Clip download started! Check progress below.");
      // Refresh clips list after a short delay to show the new clip
      setTimeout(() => {
        loadClips();
      }, 2000);
    }
  };

  const handleCopyClipUrl = async (clipId: string) => {
    const clipUrl = getClipUrl(clipId);
    if (!clipUrl) {
      toast.error("Clip URL not available yet");
      return;
    }

    try {
      await navigator.clipboard.writeText(clipUrl);
      setCopySuccess(clipId);
      toast.success("Clip URL copied to clipboard!");
      
      setTimeout(() => setCopySuccess(null), 2000);
      
      if (onClipGenerated) {
        onClipGenerated(clipUrl, clipId);
      }
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    const success = await deleteClip(clipId);
    if (success) {
      toast.success("Clip deleted successfully");
      loadClips(); // Refresh the list
    } else {
      toast.error("Failed to delete clip");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'downloading': case 'processing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'downloading': return 'Downloading';
      case 'processing': return 'Processing';
      case 'complete': return 'Complete';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const [allClips, setAllClips] = useState<any[]>([]);
  const activeDownloads = Object.values(downloadProgress);

  // Load clips function
  const loadClips = async () => {
    try {
      const clips = await getAllClips();
      setAllClips(clips);
    } catch (error) {
      console.error('Error loading clips:', error);
    }
  };

  // Load clips on component mount
  useEffect(() => {
    loadClips();
  }, []);

  return (
    <div className="space-y-6">
      {/* Download New Clip Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Generate Video Clip
          </CardTitle>
          <CardDescription>
            Download and store your clip as a standalone video file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Quality</label>
              <Select value={quality} onValueChange={(value: any) => setQuality(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High (1080p)</SelectItem>
                  <SelectItem value="medium">Medium (720p)</SelectItem>
                  <SelectItem value="low">Low (480p)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Clip Duration</label>
              <Input
                value={`${formatTime(endTime - startTime)} (${formatTime(startTime)} - ${formatTime(endTime)})`}
                readOnly
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>
          </div>

          <Button
            onClick={handleDownloadClip}
            disabled={isDownloading || !youtubeUrl || !clipTitle}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Starting Download...' : 'Generate Video Clip'}
          </Button>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <strong>How it works:</strong> This will download the video segment from YouTube and create a standalone MP4 file that you can share anywhere, independent of YouTube.
          </div>
        </CardContent>
      </Card>

      {/* Active Downloads */}
      {activeDownloads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Download Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeDownloads.map((download) => (
              <div key={download.clipId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Clip {download.clipId.slice(-8)}
                  </span>
                  <Badge className={`${getStatusColor(download.status)} text-white`}>
                    {getStatusLabel(download.status)}
                  </Badge>
                </div>
                
                <Progress value={download.progress} className="w-full" />
                
                {download.error && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Error: {download.error}
                  </div>
                )}
                
                {download.status === 'complete' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyClipUrl(download.clipId)}
                    >
                      {copySuccess === download.clipId ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy URL
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const url = getClipUrl(download.clipId);
                        if (url) window.open(url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteClip(download.clipId)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Previously Generated Clips */}
      {allClips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Clips</CardTitle>
            <CardDescription>
              Your previously generated video clips
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allClips.map((clip) => (
              <div key={clip.clipId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">Clip {clip.clipId.slice(-8)}</div>
                  <div className="text-xs text-gray-500">
                    {clip.fileSize && `${(clip.fileSize / 1024 / 1024).toFixed(1)} MB`} • 
                    {clip.format} • Generated {new Date().toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyClipUrl(clip.clipId)}
                  >
                    {copySuccess === clip.clipId ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (clip.clipUrl) window.open(clip.clipUrl, '_blank');
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClip(clip.clipId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

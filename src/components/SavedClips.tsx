"use client";

import { useState, useEffect } from "react";
import { SavedClip } from "@/app/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, Save } from "lucide-react";
import { VideoPlayer } from "./video/VideoPlayer";
import { VideoSettings } from "./video/VideoSettings";
import { ClipSettings } from "./video/types";
import { formatTime } from "./video/utils";
import { toast } from "sonner";
import { WebhookUrlModal } from "./WebhookUrlModal";
import { getWebhookUrl, saveWebhookUrl } from "@/lib/webhookStore";
import { Input } from "./ui/input";
// import { DateTimePicker } from "./ui/datetime-picker";

interface SavedClipsProps {
  clips: SavedClip[];
  onRemoveClip: (id: string) => void;
}

export default function SavedClips({ clips, onRemoveClip }: SavedClipsProps) {
  const [mounted, setMounted] = useState(false);
  const [clipSettings, setClipSettings] = useState<Record<string, ClipSettings>>({});
  const [clipAspectRatios, setClipAspectRatios] = useState<Record<string, ClipSettings['aspectRatio']>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [clipCaptions, setClipCaptions] = useState<Record<string, string>>({});
  // const [clipScheduleTimes, setClipScheduleTimes] = useState<Record<string, Date | null>>({});

  // Only initialize on the client side
  useEffect(() => {
    setMounted(true);
    
    // Initialize settings for all clips
    const initialSettings: Record<string, ClipSettings> = {};
    const initialCaptions: Record<string, string> = {};
    const initialAspectRatios: Record<string, ClipSettings['aspectRatio']> = {};
    // const initialScheduleTimes: Record<string, Date | null> = {};
    
    clips.forEach(clip => {
      initialSettings[clip.id] = getDefaultSettings();
      initialCaptions[clip.id] = clip.caption || '';
      initialAspectRatios[clip.id] = 'original';
      // initialScheduleTimes[clip.id] = clip.scheduleTime || null;
    });
    
    setClipSettings(initialSettings);
    setClipCaptions(initialCaptions);
    setClipAspectRatios(initialAspectRatios);
    // setClipScheduleTimes(initialScheduleTimes);
  }, []);

  // Update captions and aspect ratios when clips change
  useEffect(() => {
    const updatedCaptions: Record<string, string> = { ...clipCaptions };
    const updatedAspectRatios: Record<string, ClipSettings['aspectRatio']> = { ...clipAspectRatios };
    // const updatedScheduleTimes: Record<string, Date | null> = { ...clipScheduleTimes };
    
    clips.forEach(clip => {
      if (!updatedCaptions[clip.id]) {
        updatedCaptions[clip.id] = clip.caption || '';
      }
      if (!updatedAspectRatios[clip.id]) {
        updatedAspectRatios[clip.id] = 'original';
      }
      // if (!updatedScheduleTimes[clip.id]) {
      //   updatedScheduleTimes[clip.id] = clip.scheduleTime || null;
      // }
    });
    
    setClipCaptions(updatedCaptions);
    setClipAspectRatios(updatedAspectRatios);
    // setClipScheduleTimes(updatedScheduleTimes);
  }, [clips]);

  const getDefaultSettings = (): ClipSettings => ({
    aspectRatio: "original",
    xPosition: 50,
    yPosition: 50,
    zoomLevel: 100,
    isPlaying: false,
    currentTime: 0,
  });

  const getSettings = (clipId: string): ClipSettings => {
    const baseSettings = clipSettings[clipId] || getDefaultSettings();
    // Merge the aspect ratio from separate state
    return {
      ...baseSettings,
      aspectRatio: clipAspectRatios[clipId] || 'original',
    };
  };

  const updateSettings = (clipId: string, updates: Partial<ClipSettings>) => {
    // If the update includes aspectRatio, update that separately
    if (updates.aspectRatio !== undefined) {
      // Remove aspectRatio from updates to avoid duplication
      const { aspectRatio, ...otherUpdates } = updates;
      
      // Only update clipSettings if there are other updates
      if (Object.keys(otherUpdates).length > 0) {
        setClipSettings(prev => ({
          ...prev,
          [clipId]: {
            ...getSettings(clipId),
            ...otherUpdates,
          },
        }));
      }
    } else {
      // No aspectRatio in updates, just update the other settings
      setClipSettings(prev => ({
        ...prev,
        [clipId]: {
          ...getSettings(clipId),
          ...updates,
        },
      }));
    }
  };

  const handleAspectRatioChange = (clipId: string, ratio: ClipSettings['aspectRatio']) => {
    setClipAspectRatios(prev => ({
      ...prev,
      [clipId]: ratio
    }));
  };

  const handleCaptionChange = (clipId: string, caption: string) => {
    setClipCaptions(prev => ({
      ...prev,
      [clipId]: caption
    }));
  };

  // const handleScheduleTimeChange = (clipId: string, date: Date | null) => {
  //   setClipScheduleTimes(prev => ({
  //     ...prev,
  //     [clipId]: date
  //   }));
  // };

  // Function to open the webhook modal
  const openSaveAllClipsModal = () => {
    if (clips.length === 0) {
      toast.error("No clips to save");
      return;
    }
    setIsWebhookModalOpen(true);
  };

  // Function to handle webhook URL submission
  const handleWebhookSubmit = async (url: string) => {
    // Save the webhook URL for future use
    saveWebhookUrl('saveAllClips', url);
    
    // Call the function to save all clips with the provided URL
    await saveAllClipsWithWebhook(url);
  };

  // New function to save all clips with the provided webhook URL
  const saveAllClipsWithWebhook = async (webhookUrl: string) => {
    if (clips.length === 0) {
      toast.error("No clips to save");
      return;
    }

    setIsSaving(true);
    try {
      // Create an array of clip data with their settings
      const clipsData = clips.map(clip => ({
        start: clip.start,
        end: clip.end,
        aspectRatio: clipAspectRatios[clip.id] || 'original',
        youtubeURL: clip.originalUrl,
        videoId: clip.videoId,
        title: clip.title,
        caption: clipCaptions[clip.id] || '',
        // Use generated clip URL if available, otherwise fall back to YouTube URL
        clipUrl: clip.generatedClipUrl || clip.originalUrl,
        hasGeneratedClip: !!clip.generatedClipUrl,
        clipId: clip.clipId,
        // scheduleTime: clipScheduleTimes[clip.id] || undefined // Include schedule time
      }));

      // Call the webhook with all clips data
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clips: clipsData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save clips');
      }

      toast.success("All clips saved successfully", {
        description: `${clips.length} clips have been saved.`
      });
    } catch (error) {
      console.error('Error saving clips:', error);
      toast.error("Failed to save clips", {
        description: "Please check the webhook URL and try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render anything until client-side hydration is complete
  if (!mounted) {
    return null;
  }

  if (clips.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">My Clips</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You haven't saved any clips yet. Go to the YouTube Clipper tab to create and save clips.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Webhook URL Modal */}
      <WebhookUrlModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        onSubmit={handleWebhookSubmit}
        title="Save All Clips Webhook"
        description="Enter the webhook URL to save all clips."
        defaultUrl={getWebhookUrl('saveAllClips')}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">My Clips</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Customize and preview your saved clips.
          </p>
        </div>
        <Button
          className="bg-[#97D700] text-[#121212] hover:bg-[#85bd00]"
          onClick={openSaveAllClipsModal}
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : `Save All Clips (${clips.length})`}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {clips.map((clip) => {
          const settings = getSettings(clip.id);

          return (
            <Card key={clip.id} className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333333]">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg">{clip.title}</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  {formatTime(clip.start)} - {formatTime(clip.end)}
                </CardDescription>
                {/* {clipScheduleTimes[clip.id] && (
                  <div className="mt-1 flex items-center text-[#97D700]">
                    <span className="text-xs">
                      Scheduled: {clipScheduleTimes[clip.id]?.toLocaleDateString()} at {clipScheduleTimes[clip.id]?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                )} */}
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex flex-col gap-6">
                  {mounted && (
                    <>
                      <VideoPlayer 
                        clip={clip} 
                        settings={settings}
                        onSettingsChange={(updates) => updateSettings(clip.id, updates)}
                      />

                      {/* Caption Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Caption
                        </label>
                        <Input
                          value={clipCaptions[clip.id] || ''}
                          onChange={(e) => handleCaptionChange(clip.id, e.target.value)}
                          placeholder="Add a caption for this clip"
                          className="bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#333333] text-black dark:text-white"
                        />
                      </div>

                      {/* Schedule Time Picker - Removed */}
                      {/* <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Schedule Time
                        </label>
                        <div className="relative">
                          <DateTimePicker
                            selected={clipScheduleTimes[clip.id] || null}
                            onChange={(date) => handleScheduleTimeChange(clip.id, date)}
                            className="bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#333333] text-black dark:text-white"
                            placeholder="Select when to publish this clip"
                          />
                          {clipScheduleTimes[clip.id] && (
                            <div className="absolute right-0 top-0 h-2 w-2 translate-x-1/2 -translate-y-1/2">
                              <div className="animate-pulse h-2 w-2 rounded-full bg-[#97D700]"></div>
                            </div>
                          )}
                        </div>
                      </div> */}

                      <VideoSettings
                        clipId={clip.id}
                        settings={settings}
                        onAspectRatioChange={(ratio) => handleAspectRatioChange(clip.id, ratio)}
                      />
                    </>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 border-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                  onClick={() => onRemoveClip(clip.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 
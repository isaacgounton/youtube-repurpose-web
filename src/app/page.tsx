"use client";

import YouTubeClipper from "@/components/YouTubeClipper";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import SavedClips from "@/components/SavedClips";

// Define the SavedClip interface
export interface SavedClip {
  id: string;
  videoId: string;
  title: string;
  start: number;
  end: number;
  thumbnail: string;
  originalUrl: string;
  createdAt: Date;
  caption?: string;
  generatedClipUrl?: string; // URL to the downloaded/generated video clip
  clipId?: string; // ID of the generated clip for tracking
  // scheduleTime?: Date;
}

// Clip candidate interface
interface ClipCandidate {
  start: number;
  end: number;
  score: number;
  reasons: string[];
  audioEnergy: number;
  sceneChanges: number;
  motionLevel: number;
}

// Video state interface
interface VideoState {
  videoId: string | null;
  originalUrl: string;
  duration: number;
  startTime: number;
  endTime: number;
  clipTitle: string;
  clipCaption: string;
  analysisResults: ClipCandidate[];
}

export default function Home() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"clipper" | "saved">("clipper");
  const [savedClips, setSavedClips] = useState<SavedClip[]>([]);

  // Persistent video state
  const [videoState, setVideoState] = useState<VideoState>({
    videoId: null,
    originalUrl: "",
    duration: 0,
    startTime: 0,
    endTime: 60,
    clipTitle: "",
    clipCaption: "",
    analysisResults: [],
  });

  const handleSaveClip = (clip: SavedClip) => {
    setSavedClips(prev => [...prev, clip]);
  };

  const handleVideoStateChange = (newState: Partial<VideoState>) => {
    setVideoState(prev => ({ ...prev, ...newState }));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] text-black dark:text-white">
      {/* Header section */}
      <header className="bg-gray-50 dark:bg-[#121212] py-4 px-6 border-b border-gray-200 dark:border-[#333333] flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-[#97D700] text-[#121212] h-10 w-10 flex items-center justify-center rounded-md mr-2">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Vito YT repurpose</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-[#333333]">
        <div className="flex max-w-4xl mx-auto">
          <button
            onClick={() => setActiveTab("clipper")}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === "clipper"
                ? "border-b-2 border-[#97D700] text-[#97D700]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            YouTube Clipper
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === "saved"
                ? "border-b-2 border-[#97D700] text-[#97D700]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            My Clips
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="p-8">
        {/* Hero section */}
        {!videoLoaded && activeTab === "clipper" && (
          <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-8 mb-8 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Build, share and <span className="text-[#97D700]">monetize</span>
            </h2>
            <h3 className="text-4xl font-bold mb-6">YouTube Content</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Automated clip generation, shareable links and scheduling for creators.
            </p>
            <Button className="bg-[#97D700] text-[#121212] hover:bg-[#85bd00] py-2 px-6">
              Get Started Free
            </Button>
          </div>
        )}

        {/* Active tab content */}
        {activeTab === "clipper" ? (
          <div className={`bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-8 ${videoLoaded ? 'mt-8' : ''}`}>
            {!videoLoaded && (
              <>
                <h2 className="text-2xl font-bold mb-6">YouTube Clipper</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Enter a YouTube video URL, select a time segment, and create clips easily.
                </p>
              </>
            )}
            <YouTubeClipper
              onVideoLoad={() => setVideoLoaded(true)}
              onSaveClip={handleSaveClip}
              videoState={videoState}
              onVideoStateChange={handleVideoStateChange}
            />
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-8 mt-8">
            <SavedClips clips={savedClips} onRemoveClip={(id) => {
              setSavedClips(prev => prev.filter(clip => clip.id !== id));
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

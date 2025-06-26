"use client";

import { useState } from "react";
import { ClipCandidate } from "@/lib/clipAnalysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Clock, TrendingUp, Eye, Volume2 } from "lucide-react";
import { formatTime } from "@/components/video/utils";

interface ClipCandidatesProps {
  candidates: ClipCandidate[];
  isAnalyzing: boolean;
  progress: number;
  error: string | null;
  onSelectClip: (start: number, end: number) => void;
  onAnalyze: () => void;
}

export function ClipCandidates({
  candidates,
  isAnalyzing,
  progress,
  error,
  onSelectClip,
  onAnalyze,
}: ClipCandidatesProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500";
    if (score >= 0.6) return "bg-yellow-500";
    return "bg-gray-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return "Excellent";
    if (score >= 0.6) return "Good";
    if (score >= 0.4) return "Fair";
    return "Poor";
  };

  const handleSelectClip = (candidate: ClipCandidate) => {
    setSelectedCandidate(`${candidate.start}-${candidate.end}`);
    onSelectClip(candidate.start, candidate.end);
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <span className="font-medium">Analysis Error:</span>
          <span>{error}</span>
        </div>
        <Button
          onClick={onAnalyze}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="font-medium text-blue-700 dark:text-blue-400">
            Analyzing video for best clips...
          </span>
        </div>
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
          {Math.round(progress)}% complete
        </p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No analysis results yet</p>
          <p className="text-sm">Click "Find Best Clips" to analyze the video</p>
        </div>
        <Button onClick={onAnalyze} className="yt-clipper-button">
          <TrendingUp className="h-4 w-4 mr-2" />
          Analyze Video
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Suggested Clips</h4>
        <Button
          onClick={onAnalyze}
          variant="outline"
          size="sm"
          className="text-sm"
        >
          Re-analyze
        </Button>
      </div>

      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {candidates.map((candidate, index) => {
          const candidateId = `${candidate.start}-${candidate.end}`;
          const isSelected = selectedCandidate === candidateId;
          const duration = candidate.end - candidate.start;

          return (
            <Card
              key={candidateId}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
              onClick={() => handleSelectClip(candidate)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <Clock className="h-4 w-4" />
                    {formatTime(candidate.start)} - {formatTime(candidate.end)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`${getScoreColor(candidate.score)} text-white`}
                    >
                      {getScoreLabel(candidate.score)}
                    </Badge>
                    <span className="text-sm font-mono text-gray-500">
                      {Math.round(candidate.score * 100)}%
                    </span>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(duration)}s
                  </span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Analysis Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Volume2 className="h-3 w-3 text-blue-500" />
                      <span className="text-xs text-gray-500">Audio</span>
                    </div>
                    <div className="text-sm font-medium">
                      {Math.round(candidate.audioEnergy * 100)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Eye className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-gray-500">Visual</span>
                    </div>
                    <div className="text-sm font-medium">
                      {Math.round(candidate.sceneChanges * 100)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-3 w-3 text-purple-500" />
                      <span className="text-xs text-gray-500">Motion</span>
                    </div>
                    <div className="text-sm font-medium">
                      {Math.round(candidate.motionLevel * 100)}%
                    </div>
                  </div>
                </div>

                {/* Reasons */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {candidate.reasons.map((reason, reasonIndex) => (
                    <Badge
                      key={reasonIndex}
                      variant="outline"
                      className="text-xs"
                    >
                      {reason}
                    </Badge>
                  ))}
                </div>

                {/* Action Button */}
                <Button
                  size="sm"
                  className="w-full"
                  variant={isSelected ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectClip(candidate);
                  }}
                >
                  <Play className="h-3 w-3 mr-1" />
                  {isSelected ? "Selected" : "Use This Clip"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {candidates.length > 0 && (
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Found {candidates.length} potential clips • Sorted by quality score
        </div>
      )}
    </div>
  );
}

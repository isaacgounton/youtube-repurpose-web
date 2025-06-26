// Clip Analysis Library for YouTube Repurpose Web
// Implements audio-based analysis, scene detection, and content-aware methods

export interface ClipCandidate {
  start: number;
  end: number;
  score: number;
  reasons: string[];
  audioEnergy: number;
  sceneChanges: number;
  motionLevel: number;
}

export interface AnalysisConfig {
  clipDuration: number; // Target clip duration in seconds
  overlap: number; // Overlap between analysis windows
  minClipLength: number; // Minimum clip length
  maxClipLength: number; // Maximum clip length
  audioWeight: number; // Weight for audio analysis (0-1)
  visualWeight: number; // Weight for visual analysis (0-1)
  contentWeight: number; // Weight for content analysis (0-1)
}

export class ClipAnalyzer {
  private audioContext: AudioContext | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    // Create off-screen canvas for video analysis
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Main analysis function that combines multiple detection methods
   */
  async analyzeVideo(
    videoElement: HTMLVideoElement,
    config: AnalysisConfig = this.getDefaultConfig()
  ): Promise<ClipCandidate[]> {
    const duration = videoElement.duration;
    const windowSize = config.clipDuration;
    const overlap = config.overlap;
    const step = windowSize - overlap;
    
    const candidates: ClipCandidate[] = [];
    
    // Initialize audio context
    await this.initializeAudioContext();
    
    for (let start = 0; start < duration - config.minClipLength; start += step) {
      const end = Math.min(start + windowSize, duration);
      
      // Skip if clip is too short
      if (end - start < config.minClipLength) continue;
      
      const candidate = await this.analyzeSegment(
        videoElement,
        start,
        end,
        config
      );
      
      candidates.push(candidate);
    }
    
    // Sort by score and return top candidates
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10 candidates
  }

  /**
   * Analyze a specific video segment
   */
  private async analyzeSegment(
    video: HTMLVideoElement,
    start: number,
    end: number,
    config: AnalysisConfig
  ): Promise<ClipCandidate> {
    const audioEnergy = await this.analyzeAudioEnergy(video, start, end);
    const sceneChanges = await this.detectSceneChanges(video, start, end);
    const motionLevel = await this.analyzeMotion(video, start, end);
    
    // Calculate composite score
    const score = this.calculateCompositeScore(
      audioEnergy,
      sceneChanges,
      motionLevel,
      config
    );
    
    const reasons = this.generateReasons(audioEnergy, sceneChanges, motionLevel);
    
    return {
      start,
      end,
      score,
      reasons,
      audioEnergy,
      sceneChanges,
      motionLevel,
    };
  }

  /**
   * Audio energy analysis using Web Audio API
   */
  private async analyzeAudioEnergy(
    video: HTMLVideoElement,
    start: number,
    end: number
  ): Promise<number> {
    if (!this.audioContext) return 0;
    
    try {
      // Create audio source from video
      const source = this.audioContext.createMediaElementSource(video);
      const analyser = this.audioContext.createAnalyser();
      
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      
      // Sample audio at multiple points in the segment
      const sampleCount = 10;
      const sampleInterval = (end - start) / sampleCount;
      let totalEnergy = 0;
      let peakEnergy = 0;
      
      for (let i = 0; i < sampleCount; i++) {
        const sampleTime = start + (i * sampleInterval);
        video.currentTime = sampleTime;
        
        // Wait for seek to complete
        await new Promise(resolve => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve(void 0);
          };
          video.addEventListener('seeked', onSeeked);
        });
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS energy
        let sum = 0;
        for (let j = 0; j < bufferLength; j++) {
          sum += dataArray[j] * dataArray[j];
        }
        const rms = Math.sqrt(sum / bufferLength);
        totalEnergy += rms;
        peakEnergy = Math.max(peakEnergy, rms);
      }
      
      const avgEnergy = totalEnergy / sampleCount;
      
      // Normalize and combine average and peak energy
      return (avgEnergy / 255) * 0.7 + (peakEnergy / 255) * 0.3;
      
    } catch (error) {
      console.warn('Audio analysis failed:', error);
      return 0;
    }
  }

  /**
   * Scene change detection using frame comparison
   */
  private async detectSceneChanges(
    video: HTMLVideoElement,
    start: number,
    end: number
  ): Promise<number> {
    const sampleCount = 5;
    const sampleInterval = (end - start) / sampleCount;
    let sceneChangeScore = 0;
    let previousFrame: ImageData | null = null;
    
    this.canvas.width = 160; // Low resolution for performance
    this.canvas.height = 90;
    
    for (let i = 0; i < sampleCount; i++) {
      const sampleTime = start + (i * sampleInterval);
      video.currentTime = sampleTime;
      
      await new Promise(resolve => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(void 0);
        };
        video.addEventListener('seeked', onSeeked);
      });
      
      // Draw current frame to canvas
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      const currentFrame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      if (previousFrame) {
        const difference = this.calculateFrameDifference(previousFrame, currentFrame);
        sceneChangeScore += difference;
      }
      
      previousFrame = currentFrame;
    }
    
    return sceneChangeScore / (sampleCount - 1);
  }

  /**
   * Motion analysis using optical flow approximation
   */
  private async analyzeMotion(
    video: HTMLVideoElement,
    start: number,
    end: number
  ): Promise<number> {
    // Simplified motion detection using frame differences
    const sampleCount = 8;
    const sampleInterval = (end - start) / sampleCount;
    let motionScore = 0;
    
    this.canvas.width = 80; // Very low resolution for performance
    this.canvas.height = 45;
    
    let previousGrayFrame: number[] | null = null;
    
    for (let i = 0; i < sampleCount; i++) {
      const sampleTime = start + (i * sampleInterval);
      video.currentTime = sampleTime;
      
      await new Promise(resolve => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(void 0);
        };
        video.addEventListener('seeked', onSeeked);
      });
      
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const grayFrame = this.convertToGrayscale(imageData);
      
      if (previousGrayFrame) {
        const motion = this.calculateMotion(previousGrayFrame, grayFrame);
        motionScore += motion;
      }
      
      previousGrayFrame = grayFrame;
    }
    
    return motionScore / (sampleCount - 1);
  }

  /**
   * Calculate composite score from all analysis methods
   */
  private calculateCompositeScore(
    audioEnergy: number,
    sceneChanges: number,
    motionLevel: number,
    config: AnalysisConfig
  ): number {
    return (
      audioEnergy * config.audioWeight +
      sceneChanges * config.visualWeight +
      motionLevel * config.contentWeight
    );
  }

  /**
   * Generate human-readable reasons for the score
   */
  private generateReasons(
    audioEnergy: number,
    sceneChanges: number,
    motionLevel: number
  ): string[] {
    const reasons: string[] = [];
    
    if (audioEnergy > 0.7) reasons.push('High audio energy');
    if (audioEnergy > 0.5) reasons.push('Good audio activity');
    if (sceneChanges > 0.6) reasons.push('Dynamic scene changes');
    if (motionLevel > 0.6) reasons.push('High motion content');
    if (audioEnergy > 0.6 && motionLevel > 0.5) reasons.push('Engaging audio-visual content');
    
    if (reasons.length === 0) reasons.push('Moderate activity');
    
    return reasons;
  }

  // Helper methods
  private async initializeAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private calculateFrameDifference(frame1: ImageData, frame2: ImageData): number {
    const data1 = frame1.data;
    const data2 = frame2.data;
    let totalDiff = 0;
    
    for (let i = 0; i < data1.length; i += 4) {
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
      
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      totalDiff += diff;
    }
    
    return totalDiff / (data1.length / 4) / (255 * 3); // Normalize
  }

  private convertToGrayscale(imageData: ImageData): number[] {
    const data = imageData.data;
    const gray: number[] = [];
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      gray.push(0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    return gray;
  }

  private calculateMotion(frame1: number[], frame2: number[]): number {
    let totalDiff = 0;
    
    for (let i = 0; i < frame1.length; i++) {
      totalDiff += Math.abs(frame1[i] - frame2[i]);
    }
    
    return totalDiff / frame1.length / 255; // Normalize
  }

  private getDefaultConfig(): AnalysisConfig {
    return {
      clipDuration: 30, // 30-second clips
      overlap: 15, // 15-second overlap
      minClipLength: 10,
      maxClipLength: 60,
      audioWeight: 0.4,
      visualWeight: 0.3,
      contentWeight: 0.3,
    };
  }
}

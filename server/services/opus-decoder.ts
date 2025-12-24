/**
 * Opus Audio Decoder Service
 * 
 * Handles decoding of Opus-encoded audio from BLE wearable devices (Omi, Limitless)
 * to PCM audio that can be sent to transcription services.
 * 
 * Omi devices use Opus codec over BLE with these specs:
 * - Sample rate: 16000 Hz
 * - Channels: 1 (mono)
 * - Frame size: 960 samples (60ms at 16kHz)
 * - Bitrate: ~32kbps
 */

export interface OpusDecoderConfig {
  sampleRate: number;
  channels: number;
  frameSize: number;
}

export interface DecodedAudioFrame {
  pcmData: Int16Array;
  timestamp: number;
  duration: number;
}

export interface AudioBuffer {
  frames: DecodedAudioFrame[];
  totalDuration: number;
  sampleRate: number;
}

const DEFAULT_CONFIG: OpusDecoderConfig = {
  sampleRate: 16000,
  channels: 1,
  frameSize: 960,
};

class OpusDecoderService {
  private config: OpusDecoderConfig;
  private frameBuffer: Uint8Array[] = [];
  private pcmBuffer: Int16Array[] = [];
  private currentTimestamp = 0;

  constructor(config: Partial<OpusDecoderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log("[Opus Decoder] Initialized with config:", this.config);
  }

  /**
   * Decode Opus frames to PCM audio
   * Note: This is a placeholder that passes through raw audio data
   * In production, use libopus via WebAssembly or native bindings
   */
  public decodeFrame(opusData: Uint8Array): DecodedAudioFrame | null {
    if (!opusData || opusData.length === 0) {
      return null;
    }

    try {
      // For now, we'll convert the raw bytes to a PCM-like format
      // In production, this would use actual Opus decoding
      const pcmData = this.opusToPcmPlaceholder(opusData);
      const duration = (pcmData.length / this.config.sampleRate) * 1000;

      const frame: DecodedAudioFrame = {
        pcmData,
        timestamp: this.currentTimestamp,
        duration,
      };

      this.currentTimestamp += duration;
      return frame;
    } catch (error) {
      console.error("[Opus Decoder] Error decoding frame:", error);
      return null;
    }
  }

  /**
   * Placeholder Opus to PCM conversion
   * This simulates what libopus would do
   * Each Opus frame typically expands to ~960 PCM samples
   */
  private opusToPcmPlaceholder(opusData: Uint8Array): Int16Array {
    // Estimate output size based on typical Opus expansion ratio
    // Real Opus frames are typically 10-60ms at 16kHz = 160-960 samples
    const estimatedSamples = this.config.frameSize;
    const pcmData = new Int16Array(estimatedSamples);

    // This is a placeholder - in production, use actual Opus decoding
    // For now, we just signal that we received data
    for (let i = 0; i < Math.min(opusData.length * 4, estimatedSamples); i++) {
      // Convert bytes to 16-bit samples (simplified)
      const byteIndex = Math.floor(i / 4);
      if (byteIndex < opusData.length) {
        pcmData[i] = (opusData[byteIndex] - 128) * 256;
      }
    }

    return pcmData;
  }

  /**
   * Process multiple Opus frames and return combined PCM audio
   */
  public decodeFrames(opusFrames: Uint8Array[]): AudioBuffer {
    const frames: DecodedAudioFrame[] = [];
    let totalDuration = 0;

    for (const opusFrame of opusFrames) {
      const decoded = this.decodeFrame(opusFrame);
      if (decoded) {
        frames.push(decoded);
        totalDuration += decoded.duration;
      }
    }

    return {
      frames,
      totalDuration,
      sampleRate: this.config.sampleRate,
    };
  }

  /**
   * Combine decoded frames into a single PCM buffer
   */
  public combineFrames(frames: DecodedAudioFrame[]): Int16Array {
    const totalSamples = frames.reduce((sum, f) => sum + f.pcmData.length, 0);
    const combined = new Int16Array(totalSamples);
    
    let offset = 0;
    for (const frame of frames) {
      combined.set(frame.pcmData, offset);
      offset += frame.pcmData.length;
    }

    return combined;
  }

  /**
   * Convert PCM to WAV format for file storage or API upload
   */
  public pcmToWav(pcmData: Int16Array): Uint8Array {
    const sampleRate = this.config.sampleRate;
    const numChannels = this.config.channels;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const fileSize = 36 + dataSize;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    this.writeString(view, 0, "RIFF");
    view.setUint32(4, fileSize, true);
    this.writeString(view, 8, "WAVE");

    // fmt chunk
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true); // bits per sample

    // data chunk
    this.writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    // Write PCM data
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(offset, pcmData[i], true);
      offset += 2;
    }

    return new Uint8Array(buffer);
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /**
   * Buffer incoming Opus data for batched processing
   */
  public addToBuffer(opusData: Uint8Array): void {
    this.frameBuffer.push(opusData);
  }

  /**
   * Process and clear the buffer
   */
  public flushBuffer(): AudioBuffer {
    const frames = [...this.frameBuffer];
    this.frameBuffer = [];
    return this.decodeFrames(frames);
  }

  /**
   * Get buffer status
   */
  public getBufferStatus(): { frameCount: number; estimatedDuration: number } {
    const frameCount = this.frameBuffer.length;
    const frameDuration = (this.config.frameSize / this.config.sampleRate) * 1000;
    return {
      frameCount,
      estimatedDuration: frameCount * frameDuration,
    };
  }

  /**
   * Reset the decoder state
   */
  public reset(): void {
    this.frameBuffer = [];
    this.pcmBuffer = [];
    this.currentTimestamp = 0;
    console.log("[Opus Decoder] State reset");
  }

  /**
   * Get configuration
   */
  public getConfig(): OpusDecoderConfig {
    return { ...this.config };
  }
}

export const opusDecoderService = new OpusDecoderService();

export function createOpusDecoder(config?: Partial<OpusDecoderConfig>): OpusDecoderService {
  return new OpusDecoderService(config);
}

export function getOpusDecoder(): OpusDecoderService {
  return opusDecoderService;
}

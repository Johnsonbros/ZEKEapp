import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@zeke/connected_device";

export const AUDIO_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
export const AUDIO_CONTROL_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
export const AUDIO_STREAM_UUID = "0000ffe2-0000-1000-8000-00805f9b34fb";

export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_CHANNELS = 1;
export const AUDIO_CHUNK_SAMPLES = 1600;
export const AUDIO_CHUNK_INTERVAL_MS = 100;

export type DeviceType = "omi" | "limitless";

export interface BLEDevice {
  id: string;
  name: string;
  type: DeviceType;
  signalStrength: number;
  batteryLevel?: number;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "disconnecting";
export type AudioStreamState = "idle" | "starting" | "streaming" | "stopping";

export interface AudioChunk {
  data: Uint8Array;
  timestamp: number;
  sequenceNumber: number;
}

export type DeviceDiscoveredCallback = (device: BLEDevice) => void;
export type ConnectionStateChangeCallback = (state: ConnectionState, device: BLEDevice | null) => void;
export type AudioStreamCallback = (chunk: AudioChunk) => void;
export type AudioStreamStateChangeCallback = (state: AudioStreamState) => void;

const MOCK_DEVICES: BLEDevice[] = [
  { id: "omi-devkit-001", name: "Omi DevKit 2", type: "omi", signalStrength: -45, batteryLevel: 85 },
  { id: "limitless-pendant-001", name: "Limitless Pendant", type: "limitless", signalStrength: -62, batteryLevel: 72 },
];

class BluetoothService {
  private isScanning: boolean = false;
  private connectionState: ConnectionState = "disconnected";
  private connectedDevice: BLEDevice | null = null;
  private discoveredDevices: BLEDevice[] = [];
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;
  private deviceDiscoveryCallbacks: DeviceDiscoveredCallback[] = [];
  private connectionStateCallbacks: ConnectionStateChangeCallback[] = [];

  private audioStreamState: AudioStreamState = "idle";
  private audioChunkCallbacks: AudioStreamCallback[] = [];
  private audioStreamStateCallbacks: AudioStreamStateChangeCallback[] = [];
  private audioStreamInterval: ReturnType<typeof setInterval> | null = null;
  private audioSequenceNumber: number = 0;
  private mockSinePhase: number = 0;

  constructor() {
    this.loadConnectedDevice();
  }

  private get isMockMode(): boolean {
    return Platform.OS === "web" || Constants.appOwnership === "expo";
  }

  private async loadConnectedDevice(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        this.connectedDevice = JSON.parse(data);
        this.connectionState = "connected";
        this.notifyConnectionStateChange();
      }
    } catch (error) {
      console.error("Error loading connected device:", error);
    }
  }

  private async saveConnectedDevice(device: BLEDevice | null): Promise<void> {
    try {
      if (device) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(device));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error saving connected device:", error);
    }
  }

  private notifyDeviceDiscovered(device: BLEDevice): void {
    this.deviceDiscoveryCallbacks.forEach((callback) => callback(device));
  }

  private notifyConnectionStateChange(): void {
    this.connectionStateCallbacks.forEach((callback) =>
      callback(this.connectionState, this.connectedDevice)
    );
  }

  private notifyAudioStreamStateChange(): void {
    this.audioStreamStateCallbacks.forEach((callback) => callback(this.audioStreamState));
  }

  private notifyAudioChunk(chunk: AudioChunk): void {
    this.audioChunkCallbacks.forEach((callback) => callback(chunk));
  }

  private generateMockAudioChunk(): AudioChunk {
    const samples = AUDIO_CHUNK_SAMPLES;
    const bytesPerSample = 2;
    const data = new Uint8Array(samples * bytesPerSample);
    const dataView = new DataView(data.buffer);

    const frequency = 440;
    const amplitude = 1000;

    for (let i = 0; i < samples; i++) {
      const sampleValue = Math.floor(
        amplitude * Math.sin(this.mockSinePhase) + (Math.random() - 0.5) * 100
      );
      const clampedValue = Math.max(-32768, Math.min(32767, sampleValue));
      dataView.setInt16(i * bytesPerSample, clampedValue, true);
      this.mockSinePhase += (2 * Math.PI * frequency) / AUDIO_SAMPLE_RATE;
    }

    this.mockSinePhase = this.mockSinePhase % (2 * Math.PI);

    const chunk: AudioChunk = {
      data,
      timestamp: Date.now(),
      sequenceNumber: this.audioSequenceNumber++,
    };

    return chunk;
  }

  private startMockAudioStream(): void {
    this.audioSequenceNumber = 0;
    this.mockSinePhase = 0;

    this.audioStreamInterval = setInterval(() => {
      if (this.audioStreamState === "streaming") {
        const chunk = this.generateMockAudioChunk();
        this.notifyAudioChunk(chunk);
      }
    }, AUDIO_CHUNK_INTERVAL_MS);
  }

  private stopMockAudioStream(): void {
    if (this.audioStreamInterval) {
      clearInterval(this.audioStreamInterval);
      this.audioStreamInterval = null;
    }
  }

  public getIsMockMode(): boolean {
    return this.isMockMode;
  }

  public getIsScanning(): boolean {
    return this.isScanning;
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getDiscoveredDevices(): BLEDevice[] {
    return [...this.discoveredDevices];
  }

  public async getConnectedDevice(): Promise<BLEDevice | null> {
    return this.connectedDevice;
  }

  public getAudioStreamState(): AudioStreamState {
    return this.audioStreamState;
  }

  public onDeviceDiscovered(callback: DeviceDiscoveredCallback): () => void {
    this.deviceDiscoveryCallbacks.push(callback);
    return () => {
      this.deviceDiscoveryCallbacks = this.deviceDiscoveryCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onConnectionStateChange(callback: ConnectionStateChangeCallback): () => void {
    this.connectionStateCallbacks.push(callback);
    callback(this.connectionState, this.connectedDevice);
    return () => {
      this.connectionStateCallbacks = this.connectionStateCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onAudioChunk(callback: AudioStreamCallback): () => void {
    this.audioChunkCallbacks.push(callback);
    return () => {
      this.audioChunkCallbacks = this.audioChunkCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onAudioStreamStateChange(callback: AudioStreamStateChangeCallback): () => void {
    this.audioStreamStateCallbacks.push(callback);
    callback(this.audioStreamState);
    return () => {
      this.audioStreamStateCallbacks = this.audioStreamStateCallbacks.filter((cb) => cb !== callback);
    };
  }

  public async startAudioStream(): Promise<boolean> {
    if (this.connectionState !== "connected") {
      console.error("Cannot start audio stream: device not connected");
      return false;
    }

    if (this.audioStreamState !== "idle") {
      console.warn("Audio stream already active or transitioning");
      return false;
    }

    this.audioStreamState = "starting";
    this.notifyAudioStreamStateChange();

    if (this.isMockMode) {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.audioStreamState = "streaming";
          this.notifyAudioStreamStateChange();
          this.startMockAudioStream();
          resolve(true);
        }, 300);
      });
    }

    console.warn("Real BLE audio streaming not implemented - native build required");
    return new Promise((resolve) => {
      setTimeout(() => {
        this.audioStreamState = "streaming";
        this.notifyAudioStreamStateChange();
        this.startMockAudioStream();
        resolve(true);
      }, 300);
    });
  }

  public stopAudioStream(): void {
    if (this.audioStreamState === "idle" || this.audioStreamState === "stopping") {
      return;
    }

    this.audioStreamState = "stopping";
    this.notifyAudioStreamStateChange();

    this.stopMockAudioStream();

    setTimeout(() => {
      this.audioStreamState = "idle";
      this.notifyAudioStreamStateChange();
    }, 100);
  }

  public async startScan(): Promise<void> {
    if (this.isScanning) return;

    this.isScanning = true;
    this.discoveredDevices = [];

    if (this.isMockMode) {
      this.simulateScan();
    } else {
      console.warn("Real BLE scanning not implemented - native build required");
      this.simulateScan();
    }
  }

  private simulateScan(): void {
    setTimeout(() => {
      if (!this.isScanning) return;
      const device1 = { ...MOCK_DEVICES[0], signalStrength: -45 + Math.floor(Math.random() * 10) };
      this.discoveredDevices.push(device1);
      this.notifyDeviceDiscovered(device1);
    }, 1500);

    setTimeout(() => {
      if (!this.isScanning) return;
      const device2 = { ...MOCK_DEVICES[1], signalStrength: -62 + Math.floor(Math.random() * 10) };
      this.discoveredDevices.push(device2);
      this.notifyDeviceDiscovered(device2);
    }, 3000);

    this.scanTimeout = setTimeout(() => {
      this.stopScan();
    }, 5000);
  }

  public stopScan(): void {
    if (!this.isScanning) return;

    this.isScanning = false;
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  public async connect(deviceId: string): Promise<boolean> {
    const device = this.discoveredDevices.find((d) => d.id === deviceId);
    if (!device) {
      console.error("Device not found:", deviceId);
      return false;
    }

    this.connectionState = "connecting";
    this.notifyConnectionStateChange();

    if (this.isMockMode) {
      return new Promise((resolve) => {
        setTimeout(async () => {
          this.connectedDevice = device;
          this.connectionState = "connected";
          await this.saveConnectedDevice(device);
          this.notifyConnectionStateChange();
          resolve(true);
        }, 1500);
      });
    }

    console.warn("Real BLE connection not implemented - native build required");
    return new Promise((resolve) => {
      setTimeout(async () => {
        this.connectedDevice = device;
        this.connectionState = "connected";
        await this.saveConnectedDevice(device);
        this.notifyConnectionStateChange();
        resolve(true);
      }, 1500);
    });
  }

  public async disconnect(): Promise<void> {
    if (this.connectionState === "disconnected") return;

    this.stopAudioStream();

    this.connectionState = "disconnecting";
    this.notifyConnectionStateChange();

    if (this.isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.connectedDevice = null;
    this.connectionState = "disconnected";
    await this.saveConnectedDevice(null);
    this.notifyConnectionStateChange();
  }
}

export const bluetoothService = new BluetoothService();

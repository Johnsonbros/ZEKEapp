import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@zeke/connected_device";

export type DeviceType = "omi" | "limitless";

export interface BLEDevice {
  id: string;
  name: string;
  type: DeviceType;
  signalStrength: number;
  batteryLevel?: number;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "disconnecting";

export type DeviceDiscoveredCallback = (device: BLEDevice) => void;
export type ConnectionStateChangeCallback = (state: ConnectionState, device: BLEDevice | null) => void;

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

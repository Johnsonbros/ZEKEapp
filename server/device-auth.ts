import crypto from 'crypto';

const ZEKE_SECRET = process.env.ZEKE_SHARED_SECRET;

interface DeviceToken {
  token: string;
  deviceId: string;
  deviceName: string;
  createdAt: Date;
  lastUsed: Date;
}

const deviceTokens = new Map<string, DeviceToken>();

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateMasterSecret(secret: string): boolean {
  if (!ZEKE_SECRET) {
    console.warn('[DeviceAuth] ZEKE_SHARED_SECRET not configured');
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(secret),
    Buffer.from(ZEKE_SECRET)
  );
}

export function registerDevice(deviceName: string): DeviceToken {
  const token = generateDeviceToken();
  const deviceId = `device_${crypto.randomBytes(8).toString('hex')}`;
  
  const deviceToken: DeviceToken = {
    token,
    deviceId,
    deviceName,
    createdAt: new Date(),
    lastUsed: new Date()
  };
  
  deviceTokens.set(token, deviceToken);
  console.log(`[DeviceAuth] Registered device: ${deviceName} (${deviceId})`);
  
  return deviceToken;
}

export function validateDeviceToken(token: string): DeviceToken | null {
  const device = deviceTokens.get(token);
  if (device) {
    device.lastUsed = new Date();
    return device;
  }
  return null;
}

export function revokeDeviceToken(token: string): boolean {
  const existed = deviceTokens.has(token);
  deviceTokens.delete(token);
  return existed;
}

export function revokeAllDeviceTokens(): number {
  const count = deviceTokens.size;
  deviceTokens.clear();
  return count;
}

export function listDevices(): Array<Omit<DeviceToken, 'token'> & { tokenPreview: string }> {
  return Array.from(deviceTokens.values()).map(device => ({
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    createdAt: device.createdAt,
    lastUsed: device.lastUsed,
    tokenPreview: `${device.token.substring(0, 8)}...${device.token.substring(device.token.length - 4)}`
  }));
}

export function isSecretConfigured(): boolean {
  return !!ZEKE_SECRET && ZEKE_SECRET.length >= 32;
}

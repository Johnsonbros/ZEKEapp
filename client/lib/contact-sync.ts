import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { getContacts } from "./zeke-api-adapter";

const CONTACT_SYNC_KEY = "zeke_contact_sync_metadata";

export interface ContactSyncMetadata {
  lastSyncTime: string | null;
  lastSyncCount: number;
  syncInProgress: boolean;
}

const DEFAULT_METADATA: ContactSyncMetadata = {
  lastSyncTime: null,
  lastSyncCount: 0,
  syncInProgress: false,
};

export async function getContactSyncMetadata(): Promise<ContactSyncMetadata> {
  try {
    const stored = await AsyncStorage.getItem(CONTACT_SYNC_KEY);
    if (stored) {
      return { ...DEFAULT_METADATA, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("[ContactSync] Failed to get metadata:", error);
  }
  return DEFAULT_METADATA;
}

export async function setContactSyncMetadata(
  metadata: Partial<ContactSyncMetadata>
): Promise<void> {
  try {
    const current = await getContactSyncMetadata();
    const updated = { ...current, ...metadata };
    await AsyncStorage.setItem(CONTACT_SYNC_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[ContactSync] Failed to save metadata:", error);
  }
}

export interface SyncContactsResult {
  success: boolean;
  count: number;
  error?: string;
}

export async function syncContacts(
  queryClient: QueryClient
): Promise<SyncContactsResult> {
  console.log("[ContactSync] Starting contact sync...");

  const currentMeta = await getContactSyncMetadata();
  if (currentMeta.syncInProgress) {
    console.log("[ContactSync] Sync already in progress, skipping");
    return { success: false, count: 0, error: "Sync already in progress" };
  }

  await setContactSyncMetadata({ syncInProgress: true });

  try {
    const contacts = await getContacts();
    console.log("[ContactSync] Fetched", contacts.length, "contacts from ZEKE");

    queryClient.setQueryData(["/api/contacts"], contacts);

    await setContactSyncMetadata({
      lastSyncTime: new Date().toISOString(),
      lastSyncCount: contacts.length,
      syncInProgress: false,
    });

    console.log("[ContactSync] Sync completed successfully");
    return { success: true, count: contacts.length };
  } catch (error: any) {
    console.error("[ContactSync] Sync failed:", error);

    await setContactSyncMetadata({ syncInProgress: false });

    return {
      success: false,
      count: 0,
      error: error.message || "Failed to sync contacts",
    };
  }
}

export async function clearContactSyncMetadata(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CONTACT_SYNC_KEY);
  } catch (error) {
    console.error("[ContactSync] Failed to clear metadata:", error);
  }
}

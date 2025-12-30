import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  syncContacts,
  getContactSyncMetadata,
  ContactSyncMetadata,
  SyncContactsResult,
} from "@/lib/contact-sync";

export interface UseContactSyncReturn {
  syncNow: () => Promise<SyncContactsResult>;
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastSyncCount: number;
  syncError: string | null;
}

export function useContactSync(): UseContactSyncReturn {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [metadata, setMetadata] = useState<ContactSyncMetadata>({
    lastSyncTime: null,
    lastSyncCount: 0,
    syncInProgress: false,
  });
  const [syncError, setSyncError] = useState<string | null>(null);
  const initialSyncDone = useRef(false);

  useEffect(() => {
    getContactSyncMetadata().then(setMetadata);
  }, []);

  const syncNowInternal = useCallback(async (): Promise<SyncContactsResult> => {
    if (isSyncing) {
      return { success: false, count: 0, error: "Sync already in progress" };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await syncContacts(queryClient);

      if (result.success) {
        const updatedMeta = await getContactSyncMetadata();
        setMetadata(updatedMeta);
      } else if (result.error) {
        setSyncError(result.error);
      }

      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, isSyncing]);

  useEffect(() => {
    if (isAuthenticated && !metadata.lastSyncTime && !initialSyncDone.current) {
      initialSyncDone.current = true;
      syncNowInternal();
    }
  }, [isAuthenticated, metadata.lastSyncTime, syncNowInternal]);

  const syncNow = useCallback(async (): Promise<SyncContactsResult> => {
    return syncNowInternal();
  }, [syncNowInternal]);

  return {
    syncNow,
    isSyncing,
    lastSyncTime: metadata.lastSyncTime,
    lastSyncCount: metadata.lastSyncCount,
    syncError,
  };
}

import AsyncStorage from "@react-native-async-storage/async-storage"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"

/**
 * React Query cache persisted to AsyncStorage so the app opens with the last
 * data it saw even with no connection. Cleared on sign-out (see auth-context).
 */
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "kiz.query.cache",
  throttleTime: 2000,
})

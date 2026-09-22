import { QueryClient } from "@tanstack/react-query"

const DAY_MS = 1000 * 60 * 60 * 24

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Keep cached data for a day so it can be persisted and served offline.
      gcTime: DAY_MS,
      refetchOnWindowFocus: false,
    },
  },
})

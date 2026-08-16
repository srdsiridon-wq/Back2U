import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { listItems } from "./items.functions";
import type { Item } from "./types";

interface ItemsContextValue {
  items: Item[];
  isLoading: boolean;
  getItem: (id: string) => Item | undefined;
  refresh: () => void;
}

const ItemsContext = createContext<ItemsContextValue | null>(null);

export const ITEMS_QUERY_KEY = ["back2u", "items"] as const;

export function ItemsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ITEMS_QUERY_KEY,
    queryFn: () => listItems({ data: { limit: 100 } }),
    staleTime: 30_000,
  });

  const value = useMemo<ItemsContextValue>(() => {
    const items = data ?? [];
    return {
      items,
      isLoading,
      getItem: (id: string) => items.find((item) => item.id === id),
      refresh: () => void queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY }),
    };
  }, [data, isLoading, queryClient]);

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>;
}

export function useItems(): ItemsContextValue {
  const context = useContext(ItemsContext);
  if (!context) throw new Error("useItems must be used inside ItemsProvider");
  return context;
}

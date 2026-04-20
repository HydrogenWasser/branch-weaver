import { useCallback, useState } from "react";

export function usePanelOrder(storageKey: string, defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultOrder;
    } catch {
      return defaultOrder;
    }
  });

  const movePanel = useCallback(
    (fromIndex: number, toIndex: number) => {
      setOrder((prev) => {
        const next = [...prev];
        const [removed] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, removed);
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey]
  );

  return { order, movePanel };
}

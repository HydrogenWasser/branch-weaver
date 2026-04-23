import { useCallback, useState } from "react";

function normalizeOrder(order: string[], defaultOrder: string[]): string[] {
  const knownPanels = new Set(defaultOrder);
  const nextOrder = order.filter((panelId) => knownPanels.has(panelId));

  for (const panelId of defaultOrder) {
    if (!nextOrder.includes(panelId)) {
      nextOrder.push(panelId);
    }
  }

  return nextOrder;
}

export function usePanelOrder(storageKey: string, defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? normalizeOrder(JSON.parse(stored), defaultOrder) : defaultOrder;
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
        localStorage.setItem(storageKey, JSON.stringify(normalizeOrder(next, defaultOrder)));
        return next;
      });
    },
    [defaultOrder, storageKey]
  );

  return { order, movePanel };
}

import { useEffect } from "react";
import type { EditorSelection } from "../types/story";

export function useEditorShortcuts(
  dirty: boolean,
  selection: EditorSelection,
  handlers: {
    onNew: () => void;
    onOpen: () => void;
    onSave: () => void;
    onSaveAs: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onDelete: () => void;
  }
) {
  const { onNew, onOpen, onSave, onSaveAs, onUndo, onRedo, onDelete } = handlers;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        onNew();
        return;
      }

      if (modifier && event.key.toLowerCase() === "o") {
        event.preventDefault();
        void onOpen();
        return;
      }

      if (modifier && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void onSaveAs();
        return;
      }

      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void onSave();
        return;
      }

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        onUndo();
        return;
      }

      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        onRedo();
        return;
      }

      if (event.key === "Delete" && selection) {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dirty, selection, onNew, onOpen, onSave, onSaveAs, onUndo, onRedo, onDelete]);
}

import { useEffect } from "react";
import type { EditorSelection } from "../types/story";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const closestEditable = target.closest("input, textarea, select, [contenteditable='true']");
  return closestEditable instanceof HTMLElement;
}

export function useEditorShortcuts(
  dirty: boolean,
  selection: EditorSelection,
  hasCopiedNode: boolean,
  handlers: {
    onNew: () => void;
    onOpen: () => void;
    onSave: () => void;
    onSaveAs: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onDelete: () => void;
    onCopy: () => void;
    onPaste: () => void;
  }
) {
  const { onNew, onOpen, onSave, onSaveAs, onUndo, onRedo, onDelete, onCopy, onPaste } = handlers;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      const editableTarget = isEditableTarget(event.target);

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

      if (modifier && event.key.toLowerCase() === "c") {
        if (editableTarget || selection?.type !== "node") {
          return;
        }

        event.preventDefault();
        onCopy();
        return;
      }

      if (modifier && event.key.toLowerCase() === "v") {
        if (editableTarget || !hasCopiedNode) {
          return;
        }

        event.preventDefault();
        onPaste();
        return;
      }

      if (event.key === "Delete" && selection) {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dirty, selection, hasCopiedNode, onNew, onOpen, onSave, onSaveAs, onUndo, onRedo, onDelete, onCopy, onPaste]);
}

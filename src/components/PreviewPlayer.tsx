import { useEffect, useMemo, useState } from "react";
import type { StoryNode, StoryProject } from "../types/story";

type PreviewPlayerProps = {
  open: boolean;
  project: StoryProject;
  onClose: () => void;
};

function usePreviewNodeMap(project: StoryProject): Map<string, StoryNode> {
  return useMemo(() => new Map(project.nodes.map((node) => [node.id, node])), [project.nodes]);
}

export default function PreviewPlayer({ open, project, onClose }: PreviewPlayerProps) {
  const nodeMap = usePreviewNodeMap(project);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setHistory([project.metadata.startNodeId]);
  }, [open, project.metadata.startNodeId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const currentNodeId = history[history.length - 1] ?? project.metadata.startNodeId;
  const currentNode = nodeMap.get(currentNodeId);

  const handleRestart = () => {
    setHistory([project.metadata.startNodeId]);
  };

  const handleBack = () => {
    setHistory((currentHistory) => (currentHistory.length > 1 ? currentHistory.slice(0, -1) : currentHistory));
  };

  const handleAdvance = (targetNodeId: string | null) => {
    if (!targetNodeId || !nodeMap.has(targetNodeId)) {
      return;
    }

    setHistory((currentHistory) => [...currentHistory, targetNodeId]);
  };

  return (
    <div className="preview-overlay" role="presentation" onClick={onClose}>
      <section
        className="preview-player"
        role="dialog"
        aria-modal="true"
        aria-label="Play preview"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="preview-player__header">
          <div>
            <strong>Play Preview</strong>
            <p>Read through the current branch flow without leaving the editor.</p>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {currentNode ? (
          <>
            <div className="preview-player__scene">
              <div className="preview-player__scene-meta">
                <span>{currentNode.id}</span>
                <span>{history.length} step{history.length === 1 ? "" : "s"}</span>
              </div>
              <h2>{currentNode.title || "Untitled Node"}</h2>
              <p>{currentNode.body.trim() || "This scene has no body text yet."}</p>
            </div>

            <div className="preview-player__choices">
              {currentNode.choices.length > 0 ? (
                currentNode.choices.map((choice) => {
                  const missingTarget = !choice.targetNodeId || !nodeMap.has(choice.targetNodeId);

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className="preview-choice"
                      disabled={missingTarget}
                      onClick={() => handleAdvance(choice.targetNodeId)}
                    >
                      <strong>{choice.text || "Untitled choice"}</strong>
                      <span>{missingTarget ? "Unlinked choice" : "Continue"}</span>
                    </button>
                  );
                })
              ) : (
                <div className="preview-player__ending">
                  <strong>Branch End</strong>
                  <p>This node has no outgoing choices.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="preview-player__ending">
            <strong>Preview unavailable</strong>
            <p>The start node could not be found in the current project.</p>
          </div>
        )}

        <div className="preview-player__footer">
          <button type="button" onClick={handleBack} disabled={history.length <= 1}>
            Back
          </button>
          <button type="button" onClick={handleRestart}>
            Restart
          </button>
        </div>
      </section>
    </div>
  );
}

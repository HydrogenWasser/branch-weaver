import { useEffect, useMemo, useState } from "react";
import { applyEffects, isChoiceVisible, resolveChoiceTargetNodeId } from "../lib/conditions";
import type { StoryChoice, StoryNode, StoryProject } from "../types/story";

type PreviewFrame = {
  nodeId: string;
  globals: Map<string, boolean | number>;
};

type PreviewPlayerProps = {
  open: boolean;
  project: StoryProject;
  onClose: () => void;
};

function usePreviewNodeMap(project: StoryProject): Map<string, StoryNode> {
  return useMemo(() => new Map(project.nodes.map((node) => [node.id, node])), [project.nodes]);
}

function createInitialHistory(project: StoryProject): PreviewFrame[] {
  return [
    {
      nodeId: project.metadata.startNodeId,
      globals: new Map(project.globals.map((storyGlobal) => [storyGlobal.id, storyGlobal.defaultValue]))
    }
  ];
}

export default function PreviewPlayer({ open, project, onClose }: PreviewPlayerProps) {
  const nodeMap = usePreviewNodeMap(project);
  const globalsById = useMemo(
    () => new Map(project.globals.map((storyGlobal) => [storyGlobal.id, storyGlobal])),
    [project.globals]
  );
  const [history, setHistory] = useState<PreviewFrame[]>(() => createInitialHistory(project));

  useEffect(() => {
    if (!open) {
      return;
    }

    setHistory(createInitialHistory(project));
  }, [open, project]);

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

  const currentFrame = history[history.length - 1];
  const currentNodeId = currentFrame?.nodeId ?? project.metadata.startNodeId;
  const runtimeGlobals = currentFrame?.globals ?? new Map<string, boolean | number>();
  const currentNode = nodeMap.get(currentNodeId);
  const visibleChoices = currentNode
    ? currentNode.choices.filter((choice) => isChoiceVisible(choice, globalsById, runtimeGlobals))
    : [];

  const handleRestart = () => {
    setHistory(createInitialHistory(project));
  };

  const handleBack = () => {
    setHistory((currentHistory) => (currentHistory.length > 1 ? currentHistory.slice(0, -1) : currentHistory));
  };

  const handleAdvance = (choice: StoryChoice, targetNodeId: string | null) => {
    if (!targetNodeId || !nodeMap.has(targetNodeId)) {
      return;
    }

    setHistory((currentHistory) => {
      const currentFrame = currentHistory[currentHistory.length - 1];
      const nextGlobals = new Map(currentFrame.globals);
      applyEffects(choice.effects, globalsById, nextGlobals);

      return [...currentHistory, { nodeId: targetNodeId, globals: nextGlobals }];
    });
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
              {visibleChoices.length > 0 ? (
                visibleChoices.map((choice) => {
                  const resolvedTargetNodeId = resolveChoiceTargetNodeId(choice, globalsById, runtimeGlobals);
                  const missingTarget = !resolvedTargetNodeId || !nodeMap.has(resolvedTargetNodeId);

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className="preview-choice"
                      disabled={missingTarget}
                      onClick={() => handleAdvance(choice, resolvedTargetNodeId)}
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
          <div style={{ fontSize: "0.84rem", color: "#6a5440" }}>
            {project.globals.length > 0
              ? project.globals
                  .map((g) => `${g.name}=${String(runtimeGlobals.get(g.id) ?? g.defaultValue)}`)
                  .join("  |  ")
              : "No globals"}
          </div>
          <div style={{ display: "flex", gap: "0.65rem" }}>
            <button type="button" onClick={handleBack} disabled={history.length <= 1}>
              Back
            </button>
            <button type="button" onClick={handleRestart}>
              Restart
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

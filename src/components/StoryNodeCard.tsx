import { memo, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "reactflow";
import { formatChoiceSummary } from "../lib/conditions";
import { getNodeCardStyle } from "../lib/nodeAppearance";
import type { StoryGlobal, StoryNode } from "../types/story";

export type StoryNodeData = {
  storyNode: StoryNode;
  globalsById: Map<string, StoryGlobal>;
  isSearchMatch: boolean;
  selectedChoiceId: string | null;
  onNodeBodyClick: (nodeId: string) => void;
  onNodeBodyDoubleClick: (nodeId: string) => void;
  onChoiceClick: (nodeId: string, choiceId: string) => void;
  onChoiceDoubleClick: (nodeId: string, choiceId: string, targetNodeId: string | null) => void;
};

function StoryNodeCard({ data, selected, id }: NodeProps<StoryNodeData>) {
  const updateNodeInternals = useUpdateNodeInternals();
  const excerpt = data.storyNode.body.trim() || "Empty scene";
  const preview = excerpt.length > 180 ? `${excerpt.slice(0, 177)}...` : excerpt;
  const cardStyle = getNodeCardStyle(data.storyNode.colorToken);

  useEffect(() => {
    updateNodeInternals(id);
  }, [
    data.storyNode.body,
    JSON.stringify(data.storyNode.choices),
    data.storyNode.colorToken,
    data.storyNode.tags.join("|"),
    data.storyNode.title,
    id,
    updateNodeInternals
  ]);

  return (
    <div
      className={`story-node-card${selected ? " is-selected" : ""}${data.isSearchMatch ? " is-match" : ""}`}
      style={cardStyle}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="story-node-card__handle story-node-card__handle--target"
      />
      <div
        className="story-node-card__body-section"
        onClick={() => data.onNodeBodyClick(data.storyNode.id)}
        onDoubleClick={() => data.onNodeBodyDoubleClick(data.storyNode.id)}
      >
        <div className="story-node-card__header">
          {data.storyNode.tags.length > 0 ? (
            <div className="story-node-card__tags">
              {data.storyNode.tags.map((tag) => (
                <span key={tag} className="story-node-card__tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div>
            <strong>{data.storyNode.title || "Untitled Node"}</strong>
            <p>{data.storyNode.id}</p>
          </div>
        </div>
        <p className="story-node-card__body">{preview}</p>
      </div>
      <div className="story-node-card__choices">
        {data.storyNode.choices.map((choice) => (
          (() => {
            const summary = formatChoiceSummary(choice, data.globalsById);
            const previewTargetNodeId =
              choice.route.mode === "direct"
                ? choice.route.targetNodeId
                : choice.route.fallbackTargetNodeId;

            return (
              <div
                key={choice.id}
                className={`story-node-card__choice nodrag nopan${
                  data.selectedChoiceId === choice.id ? " is-selected" : ""
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onChoiceClick(data.storyNode.id, choice.id);
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  data.onChoiceDoubleClick(data.storyNode.id, choice.id, previewTargetNodeId);
                }}
              >
                <div className="story-node-card__choice-content">
                  <span>{choice.text || "Untitled choice"}</span>
                  {summary ? <small>{summary}</small> : null}
                </div>
                <Handle
                  id={choice.id}
                  type="source"
                  position={Position.Right}
                  isConnectable={choice.route.mode === "direct"}
                  className="story-node-card__handle story-node-card__handle--source"
                />
              </div>
            );
          })()
        ))}
      </div>
    </div>
  );
}

export default memo(StoryNodeCard);

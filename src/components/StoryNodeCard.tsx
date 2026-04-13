import { memo, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "reactflow";
import type { StoryNode } from "../types/story";

type StoryNodeData = {
  storyNode: StoryNode;
  isStartNode: boolean;
  isSearchMatch: boolean;
};

function StoryNodeCard({ data, selected, id }: NodeProps<StoryNodeData>) {
  const updateNodeInternals = useUpdateNodeInternals();
  const excerpt = data.storyNode.body.trim() || "Empty scene";
  const preview = excerpt.length > 180 ? `${excerpt.slice(0, 177)}...` : excerpt;

  useEffect(() => {
    updateNodeInternals(id);
  }, [data.storyNode.choices.length, id, updateNodeInternals]);

  return (
    <div className={`story-node-card${selected ? " is-selected" : ""}${data.isSearchMatch ? " is-match" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="story-node-card__handle story-node-card__handle--target"
      />
      <div className="story-node-card__header">
        <div>
          <strong>{data.storyNode.title || "Untitled Node"}</strong>
          <p>{data.storyNode.id}</p>
        </div>
        {data.isStartNode ? <span className="story-node-card__badge">Start</span> : null}
      </div>
      <p className="story-node-card__body">{preview}</p>
      <div className="story-node-card__choices">
        {data.storyNode.choices.map((choice) => (
          <div key={choice.id} className="story-node-card__choice">
            <span>{choice.text || "Untitled choice"}</span>
            <Handle
              id={choice.id}
              type="source"
              position={Position.Right}
              className="story-node-card__handle story-node-card__handle--source"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(StoryNodeCard);

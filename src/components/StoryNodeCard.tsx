import { memo, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "reactflow";
import { getNodeCardStyle } from "../lib/nodeAppearance";
import type { NodeColorToken } from "../types/story";

export type StoryNodeChoiceRow = {
  id: string;
  text: string;
  summary: string | null;
  previewTargetNodeId: string | null;
  isConnectable: boolean;
};

export type StoryNodeData = {
  nodeId: string;
  title: string;
  bodyPreview: string;
  tags: string[];
  colorToken: NodeColorToken;
  choiceRows: StoryNodeChoiceRow[];
  layoutSignature: string;
  renderSignature: string;
  isSearchMatch: boolean;
  selectedChoiceId: string | null;
  onNodeBodyClick: (nodeId: string) => void;
  onNodeBodyDoubleClick: (nodeId: string) => void;
  onChoiceClick: (nodeId: string, choiceId: string) => void;
  onChoiceDoubleClick: (nodeId: string, choiceId: string, targetNodeId: string | null) => void;
};

function StoryNodeCard({ data, selected, id }: NodeProps<StoryNodeData>) {
  const updateNodeInternals = useUpdateNodeInternals();
  const cardStyle = getNodeCardStyle(data.colorToken);

  useEffect(() => {
    updateNodeInternals(id);
  }, [data.layoutSignature, id, updateNodeInternals]);

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
        onClick={() => data.onNodeBodyClick(data.nodeId)}
        onDoubleClick={() => data.onNodeBodyDoubleClick(data.nodeId)}
      >
        <div className="story-node-card__header">
          {data.tags.length > 0 ? (
            <div className="story-node-card__tags">
              {data.tags.map((tag) => (
                <span key={tag} className="story-node-card__tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div>
            <strong>{data.title || "Untitled Node"}</strong>
            <p>{data.nodeId}</p>
          </div>
        </div>
        <p className="story-node-card__body">{data.bodyPreview}</p>
      </div>
      <div className="story-node-card__choices">
        {data.choiceRows.map((choice) => (
          <div
            key={choice.id}
            className={`story-node-card__choice nodrag nopan${
              data.selectedChoiceId === choice.id ? " is-selected" : ""
            }`}
            onClick={(event) => {
              event.stopPropagation();
              data.onChoiceClick(data.nodeId, choice.id);
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              data.onChoiceDoubleClick(data.nodeId, choice.id, choice.previewTargetNodeId);
            }}
          >
            <div className="story-node-card__choice-content">
              <span>{choice.text || "Untitled choice"}</span>
              {choice.summary ? <small>{choice.summary}</small> : null}
            </div>
            <Handle
              id={choice.id}
              type="source"
              position={Position.Right}
              isConnectable={choice.isConnectable}
              className="story-node-card__handle story-node-card__handle--source"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(StoryNodeCard, (prevProps, nextProps) =>
  prevProps.selected === nextProps.selected &&
  prevProps.data.isSearchMatch === nextProps.data.isSearchMatch &&
  prevProps.data.selectedChoiceId === nextProps.data.selectedChoiceId &&
  prevProps.data.renderSignature === nextProps.data.renderSignature
);

import { useMemo } from "react";
import { buildStoryMapGroups, STORY_MAP_PRIORITY_GROUPS } from "../lib/storyMap";
import type { StoryNode } from "../types/story";

type MapSummaryPanelProps = {
  nodes: StoryNode[];
  selectedNodeId: string | null;
  onOpenMap: (groupName?: string | null) => void;
  onFocusNode: (nodeId: string) => void;
};

function getSummaryGroups(groups: ReturnType<typeof buildStoryMapGroups>) {
  const selected: typeof groups = [];
  const priorityNames = new Set(STORY_MAP_PRIORITY_GROUPS);

  for (const group of groups) {
    if (priorityNames.has(group.name as (typeof STORY_MAP_PRIORITY_GROUPS)[number])) {
      selected.push(group);
    }
  }

  const remainingGroups = groups
    .filter((group) => !selected.some((selectedGroup) => selectedGroup.name === group.name) && group.name !== "Untagged")
    .sort((left, right) => right.nodes.length - left.nodes.length || left.name.localeCompare(right.name));

  selected.push(...remainingGroups.slice(0, 4));

  const untaggedGroup = groups.find((group) => group.name === "Untagged");
  if (untaggedGroup && !selected.some((group) => group.name === "Untagged")) {
    selected.push(untaggedGroup);
  }

  return selected;
}

export default function MapSummaryPanel({
  nodes,
  selectedNodeId,
  onOpenMap,
  onFocusNode
}: MapSummaryPanelProps) {
  const groups = useMemo(() => buildStoryMapGroups(nodes), [nodes]);
  const summaryGroups = useMemo(() => getSummaryGroups(groups), [groups]);
  const hiddenGroupCount = Math.max(groups.length - summaryGroups.length, 0);
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  );

  return (
    <div className="panel map-summary-panel">
      <div className="panel__header">
        <div>
          <h3>Story Map</h3>
          <p className="panel__meta">Compact overview for large projects.</p>
        </div>
        <button type="button" className="map-summary-panel__open" onClick={() => onOpenMap()}>
          Open
        </button>
      </div>

      <div className="map-summary-panel__current">
        <span className="panel__meta">Current Node</span>
        {selectedNode ? (
          <button type="button" className="map-summary-panel__current-node" onClick={() => onFocusNode(selectedNode.id)}>
            <strong>{selectedNode.title || "Untitled Node"}</strong>
            <span>{selectedNode.choices.length} choice{selectedNode.choices.length === 1 ? "" : "s"}</span>
          </button>
        ) : (
          <p className="map-summary-panel__empty">No node selected.</p>
        )}
      </div>

      <div className="map-summary-panel__groups">
        {summaryGroups.map((group) => (
          <button
            key={group.name}
            type="button"
            className="map-summary-panel__group"
            onClick={() => onOpenMap(group.name)}
          >
            <strong>{group.name}</strong>
            <span>{group.nodes.length}</span>
          </button>
        ))}
      </div>

      {hiddenGroupCount > 0 ? (
        <p className="map-summary-panel__more">{hiddenGroupCount} more groups are available in the full map.</p>
      ) : null}
    </div>
  );
}

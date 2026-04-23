import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { buildNodeSearchIndex, searchNodeIndex } from "../lib/search";
import { buildStoryMapGroups } from "../lib/storyMap";
import type { StoryNode } from "../types/story";

type StoryMapDrawerProps = {
  open: boolean;
  nodes: StoryNode[];
  selectedNodeId: string | null;
  initialGroupName: string | null;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
};

export default function StoryMapDrawer({
  open,
  nodes,
  selectedNodeId,
  initialGroupName,
  onClose,
  onSelectNode
}: StoryMapDrawerProps) {
  const [query, setQuery] = useState("");
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(initialGroupName);
  const deferredQuery = useDeferredValue(query);
  const groups = useMemo(() => buildStoryMapGroups(nodes), [nodes]);
  const searchIndex = useMemo(() => buildNodeSearchIndex(nodes), [nodes]);
  const searchResults = useMemo(
    () => searchNodeIndex(searchIndex, deferredQuery),
    [deferredQuery, searchIndex]
  );
  const activeGroup =
    groups.find((group) => group.name === selectedGroupName) ??
    (groups.length > 0 ? groups[0] : null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");
    setSelectedGroupName(initialGroupName ?? groups[0]?.name ?? null);
  }, [groups, initialGroupName, open]);

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

  return (
    <aside className="story-map-drawer" aria-label="Story map drawer">
      <div className="story-map-drawer__header">
        <div>
          <strong>Story Map</strong>
          <p>{nodes.length} nodes · focused navigation for large graphs</p>
        </div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <label className="field story-map-drawer__search">
        <span>Jump to a node</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles, body, and choices"
        />
      </label>

      <div className="story-map-drawer__body">
        <section className="story-map-drawer__groups">
          <div className="story-map-drawer__section-header">
            <h3>Groups</h3>
            <span>{groups.length}</span>
          </div>
          <div className="story-map-drawer__group-list">
            {groups.map((group) => (
              <button
                key={group.name}
                type="button"
                className={`story-map-drawer__group${activeGroup?.name === group.name ? " is-selected" : ""}`}
                onClick={() => {
                  setQuery("");
                  setSelectedGroupName(group.name);
                }}
              >
                <strong>{group.name}</strong>
                <span>{group.nodes.length}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="story-map-drawer__nodes">
          <div className="story-map-drawer__section-header">
            <h3>{query.trim() ? "Search Results" : activeGroup?.name ?? "Nodes"}</h3>
            <span>{query.trim() ? searchResults.length : activeGroup?.nodes.length ?? 0}</span>
          </div>

          {query.trim() ? (
            searchResults.length > 0 ? (
              <div className="story-map-drawer__node-list">
                {searchResults.map((result) => (
                  <button
                    key={result.nodeId}
                    type="button"
                    className={`story-map-drawer__node${selectedNodeId === result.nodeId ? " is-selected" : ""}`}
                    onClick={() => onSelectNode(result.nodeId)}
                  >
                    <strong>{result.title || "Untitled Node"}</strong>
                    <span>{result.locationLabel}</span>
                    <p>{result.excerpt}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="story-map-drawer__empty">No nodes match this search.</p>
            )
          ) : activeGroup ? (
            <div className="story-map-drawer__node-list">
              {activeGroup.nodes.map((node) => (
                <button
                  key={`${activeGroup.name}:${node.id}`}
                  type="button"
                  className={`story-map-drawer__node${selectedNodeId === node.id ? " is-selected" : ""}`}
                  onClick={() => onSelectNode(node.id)}
                >
                  <strong>{node.title || "Untitled Node"}</strong>
                  <span>{node.choices.length} choice{node.choices.length === 1 ? "" : "s"}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="story-map-drawer__empty">No nodes available.</p>
          )}
        </section>
      </div>
    </aside>
  );
}

import { formatChoiceSummary } from "../lib/conditions";
import type { StoryGlobal, StoryNode } from "../types/story";

type ChoiceListPanelProps = {
  node: StoryNode;
  globals: StoryGlobal[];
  selectedChoiceId: string | null;
  onSelectChoice: (choiceId: string) => void;
};

export default function ChoiceListPanel({
  node,
  globals,
  selectedChoiceId,
  onSelectChoice
}: ChoiceListPanelProps) {
  const globalsById = new Map(globals.map((storyGlobal) => [storyGlobal.id, storyGlobal]));

  if (node.choices.length === 0) {
    return (
      <div className="choices-drawer__empty choices-drawer__empty--list">
        <strong>No choices yet</strong>
        <p>Add a choice to start building this node's outgoing branches.</p>
      </div>
    );
  }

  return (
    <div className="choice-list-panel">
      {node.choices.map((choice) => {
        const routeLabel = choice.route.mode === "direct" ? "Direct" : "Conditional";
        const isLinked =
          choice.route.mode === "direct"
            ? Boolean(choice.route.targetNodeId)
            : choice.route.branches.some((branch) => branch.targetNodeId) || Boolean(choice.route.fallbackTargetNodeId);
        const routeSummary =
          choice.route.mode === "direct"
            ? choice.route.targetNodeId
              ? `To ${node.id === choice.route.targetNodeId ? "Current Node" : "Linked Node"}`
              : "No target"
            : `${choice.route.branches.length} rule${choice.route.branches.length === 1 ? "" : "s"} + else`;

        return (
          <button
            key={choice.id}
            type="button"
            className={`choice-list-panel__item${selectedChoiceId === choice.id ? " is-selected" : ""}`}
            onClick={() => onSelectChoice(choice.id)}
          >
            <div className="choice-list-panel__item-header">
              <strong>{choice.text || "Untitled choice"}</strong>
              <span className={`choice-list-panel__status${isLinked ? " is-linked" : " is-unlinked"}`}>
                {isLinked ? "Linked" : "Unlinked"}
              </span>
            </div>
            <div className="choice-list-panel__badges">
              <span className="choice-list-panel__badge">{routeLabel}</span>
              <span className="choice-list-panel__badge">
                {choice.visibilityCondition ? "Has Condition" : "Always Visible"}
              </span>
              <span className="choice-list-panel__badge">
                {choice.effects.length === 0 ? "No Effects" : `${choice.effects.length} Effect${choice.effects.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <p className="choice-list-panel__summary">
              {formatChoiceSummary(choice, globalsById) ?? routeSummary}
            </p>
          </button>
        );
      })}
    </div>
  );
}

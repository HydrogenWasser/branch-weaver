import { useEffect, useMemo, useState } from "react";
import ChoiceEffectsEditor from "./ChoiceEffectsEditor";
import ChoiceRouteEditor from "./ChoiceRouteEditor";
import ChoiceVisibilityEditor from "./ChoiceVisibilityEditor";
import { formatChoiceSummary } from "../lib/conditions";
import { useEditorStore } from "../store/editorStore";
import type { StoryChoice, StoryNode } from "../types/story";

type ChoiceDetailPanelProps = {
  node: StoryNode;
  choiceId: string | null;
};

export default function ChoiceDetailPanel({ node, choiceId }: ChoiceDetailPanelProps) {
  const project = useEditorStore((state) => state.project);
  const removeChoice = useEditorStore((state) => state.removeChoice);
  const updateChoiceText = useEditorStore((state) => state.updateChoiceText);

  const choice = useMemo(
    () => node.choices.find((candidate) => candidate.id === choiceId) ?? null,
    [choiceId, node.choices]
  );
  const globalsById = useMemo(
    () => new Map(project.globals.map((storyGlobal) => [storyGlobal.id, storyGlobal])),
    [project.globals]
  );
  const otherNodes = useMemo(
    () => project.nodes.filter((projectNode) => projectNode.id !== node.id),
    [node.id, project.nodes]
  );
  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    setDraftText(choice?.text ?? "");
  }, [choice?.id]);

  if (!choice) {
    return (
      <div className="choices-drawer__empty choices-drawer__empty--detail">
        <strong>No choice selected</strong>
        <p>Select a choice from the left to edit its visibility, effects, and routing.</p>
      </div>
    );
  }

  const handleDeleteChoice = () => {
    const hasConfiguredTarget =
      choice.route.mode === "direct"
        ? Boolean(choice.route.targetNodeId)
        : choice.route.branches.some((branch) => branch.targetNodeId) || Boolean(choice.route.fallbackTargetNodeId);

    if (
      hasConfiguredTarget &&
      !window.confirm("This will remove the existing jump target for the choice. Continue?")
    ) {
      return;
    }

    removeChoice({ nodeId: node.id, choiceId: choice.id });
  };

  return (
    <div className="choice-detail-panel">
      <div className="choice-detail-panel__section panel">
        <div className="panel__header">
          <div>
            <h3>Basic</h3>
            <p className="panel__meta">Edit the current choice text and review its summary.</p>
          </div>
          <button type="button" className="choice-detail-panel__danger" onClick={handleDeleteChoice}>
            Delete Choice
          </button>
        </div>
        <label className="field">
          <span>Choice Text</span>
          <input
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            onBlur={() => {
              if (draftText !== choice.text) {
                updateChoiceText({ nodeId: node.id, choiceId: choice.id }, draftText);
              }
            }}
            placeholder="Choice text"
          />
        </label>
        <p className="choice-detail-panel__summary">
          {formatChoiceSummary(choice, globalsById) ?? "Direct route with no additional conditions or effects."}
        </p>
      </div>

      <ChoiceVisibilityEditor
        nodeId={node.id}
        choiceId={choice.id}
        condition={choice.visibilityCondition}
        globals={project.globals}
      />

      <ChoiceEffectsEditor
        nodeId={node.id}
        choiceId={choice.id}
        effects={choice.effects}
        globals={project.globals}
      />

      <div className="choice-detail-panel__section panel">
        <div className="panel__header">
          <div>
            <h3>Routing</h3>
            <p className="panel__meta">Choose how this choice moves the story forward.</p>
          </div>
        </div>
        <ChoiceRouteEditor
          nodeId={node.id}
          choiceId={choice.id}
          route={choice.route}
          globals={project.globals}
          otherNodes={otherNodes}
        />
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import ChoiceDetailPanel from "./ChoiceDetailPanel";
import ChoiceListPanel from "./ChoiceListPanel";
import { useEditorStore } from "../store/editorStore";

type ChoicesDrawerProps = {
  open: boolean;
  nodeId: string | null;
  choiceId: string | null;
  onClose: () => void;
  onSelectChoice: (nodeId: string, choiceId: string) => void;
};

const DEFAULT_DRAWER_WIDTH = 680;
const MIN_DRAWER_WIDTH = 560;
const MAX_DRAWER_WIDTH = 980;

function clampDrawerWidth(width: number): number {
  if (typeof window === "undefined") {
    return Math.min(Math.max(width, MIN_DRAWER_WIDTH), MAX_DRAWER_WIDTH);
  }

  const viewportLimit = Math.max(MIN_DRAWER_WIDTH, window.innerWidth - 32);
  return Math.min(Math.max(width, MIN_DRAWER_WIDTH), Math.min(viewportLimit, MAX_DRAWER_WIDTH));
}

export default function ChoicesDrawer({
  open,
  nodeId,
  choiceId,
  onClose,
  onSelectChoice
}: ChoicesDrawerProps) {
  const project = useEditorStore((state) => state.project);
  const addChoice = useEditorStore((state) => state.addChoice);
  const previousNodeIdRef = useRef<string | null>(null);
  const previousChoiceCountRef = useRef(0);
  const [drawerWidth, setDrawerWidth] = useState(DEFAULT_DRAWER_WIDTH);
  const node = useMemo(
    () => (nodeId ? project.nodes.find((projectNode) => projectNode.id === nodeId) ?? null : null),
    [nodeId, project.nodes]
  );

  useEffect(() => {
    if (!open) {
      previousNodeIdRef.current = null;
      previousChoiceCountRef.current = 0;
      document.body.classList.remove("is-resizing-choices-drawer");
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("is-resizing-choices-drawer");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleResize = () => {
      setDrawerWidth((currentWidth) => clampDrawerWidth(currentWidth));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  useEffect(() => {
    if (!open || !node) {
      previousNodeIdRef.current = null;
      previousChoiceCountRef.current = 0;
      return;
    }

    const currentCount = node.choices.length;
    const previousCount = previousChoiceCountRef.current;
    const previousNodeId = previousNodeIdRef.current;
    const isSameNode = previousNodeId === node.id;
    const selectedChoiceExists = choiceId ? node.choices.some((choice) => choice.id === choiceId) : false;

    if (isSameNode && currentCount > previousCount && previousCount > 0) {
      onSelectChoice(node.id, node.choices[currentCount - 1].id);
    } else if (currentCount > 0 && !selectedChoiceExists) {
      onSelectChoice(node.id, node.choices[0].id);
    }

    previousNodeIdRef.current = node.id;
    previousChoiceCountRef.current = currentCount;
  }, [choiceId, node, onSelectChoice, open]);

  const handleResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 920) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = drawerWidth;

    document.body.classList.add("is-resizing-choices-drawer");

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      setDrawerWidth(clampDrawerWidth(startWidth + deltaX));
    };

    const handlePointerUp = () => {
      document.body.classList.remove("is-resizing-choices-drawer");
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
  };

  if (!open || !node) {
    return null;
  }

  return (
    <aside className="choices-drawer" aria-label="Choices drawer" style={{ width: `${drawerWidth}px` }}>
      <div
        className="choices-drawer__resize-handle"
        role="presentation"
        aria-hidden="true"
        onMouseDown={handleResizeStart}
      >
        <span className="choices-drawer__resize-grip" />
      </div>

      <div className="choices-drawer__header">
        <div>
          <strong>Choices Workspace</strong>
          <p>
            {node.title || "Untitled Node"} · {node.choices.length} choice{node.choices.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="choices-drawer__header-actions">
          <button type="button" onClick={() => addChoice(node.id)}>
            Add Choice
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="choices-drawer__body">
        <section className="choices-drawer__list-column">
          <div className="choices-drawer__section-header">
            <h3>Choices</h3>
            <span>{node.choices.length}</span>
          </div>
          <ChoiceListPanel
            node={node}
            globals={project.globals}
            selectedChoiceId={choiceId}
            onSelectChoice={(nextChoiceId) => onSelectChoice(node.id, nextChoiceId)}
          />
        </section>

        <section className="choices-drawer__detail-column">
          <div className="choices-drawer__section-header">
            <h3>Current Choice</h3>
            <span>{choiceId ? "Active" : "None"}</span>
          </div>
          <ChoiceDetailPanel node={node} choiceId={choiceId} />
        </section>
      </div>
    </aside>
  );
}

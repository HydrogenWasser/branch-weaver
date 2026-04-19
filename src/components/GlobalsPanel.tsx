import { useEditorStore } from "../store/editorStore";

type GlobalsPanelProps = {
  onOpen: () => void;
};

export default function GlobalsPanel({ onOpen }: GlobalsPanelProps) {
  const globals = useEditorStore((state) => state.project.globals);

  return (
    <div className="panel">
      <h3>Globals</h3>
      <button type="button" className="globals-panel__trigger" onClick={onOpen}>
        Manage Globals
        <span className="globals-panel__count">{globals.length}</span>
      </button>
    </div>
  );
}

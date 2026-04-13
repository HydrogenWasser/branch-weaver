type TopBarProps = {
  title: string;
  dirty: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onLoadExample: () => void;
};

export default function TopBar({ title, dirty, onNew, onOpen, onSave, onSaveAs, onLoadExample }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__title">
        <strong>Arrow Story Editor</strong>
        <span>
          {title}
          {dirty ? " *" : ""}
        </span>
      </div>
      <div className="top-bar__actions">
        <button type="button" onClick={onNew}>
          New
        </button>
        <button type="button" onClick={onOpen}>
          Open JSON
        </button>
        <button type="button" onClick={onSave}>
          Save
        </button>
        <button type="button" onClick={onSaveAs}>
          Save As
        </button>
        <button type="button" onClick={onLoadExample}>
          Example
        </button>
      </div>
    </header>
  );
}

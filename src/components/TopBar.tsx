type TopBarProps = {
  projectTitle: string;
  dirty: boolean;
  onProjectTitleChange: (title: string) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onLoadExample: () => void;
};

export default function TopBar({
  projectTitle,
  dirty,
  onProjectTitleChange,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onLoadExample
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__title">
        <input
          className="top-bar__title-input"
          value={projectTitle}
          onChange={(event) => onProjectTitleChange(event.target.value)}
          placeholder="Project title"
        />
        {dirty ? <span className="top-bar__dirty">*</span> : null}
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

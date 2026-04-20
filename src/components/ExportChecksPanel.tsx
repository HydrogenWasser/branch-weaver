import { useMemo } from "react";
import { exportValidationErrors } from "../lib/story";
import { useEditorStore } from "../store/editorStore";

export default function ExportChecksPanel() {
  const project = useEditorStore((state) => state.project);
  const issues = useMemo(() => exportValidationErrors(project), [project]);

  return (
    <div className="panel">
      <h3>Export Checks</h3>
      {issues.length === 0 ? (
        <p>Ready to export.</p>
      ) : (
        <ul className="issue-list">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { exportValidationErrors } from "../lib/story";
import { useEditorStore } from "../store/editorStore";

export default function ExportChecksPanel() {
  const projectRevision = useEditorStore((state) => state.projectRevision);
  const [issues, setIssues] = useState<string[]>(() =>
    exportValidationErrors(useEditorStore.getState().project)
  );
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);

    const timeoutId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      setIssues(exportValidationErrors(useEditorStore.getState().project));
      setChecking(false);
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [projectRevision]);

  return (
    <div className="panel">
      <h3>Export Checks</h3>
      {checking ? <p>Checking export readiness...</p> : null}
      {!checking && issues.length === 0 ? (
        <p>Ready to export.</p>
      ) : null}
      {!checking && issues.length > 0 ? (
        <ul className="issue-list">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

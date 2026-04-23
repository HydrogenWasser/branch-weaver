import { useCallback } from "react";
import { openJsonFile, saveJsonFile, saveJsonFileAs } from "../lib/fileIO";
import {
  exportValidationErrors,
  fileNameFromTitle,
  parseProjectJson,
  serializeProject
} from "../lib/story";
import { useEditorStore } from "../store/editorStore";
import type { StoryProject } from "../types/story";

export function useProjectFileActions(options: { onAfterLoad: (project: StoryProject) => void }) {
  const dirty = useEditorStore((state) => state.dirty);
  const project = useEditorStore((state) => state.project);
  const currentFilePath = useEditorStore((state) => state.currentFilePath);
  const newProject = useEditorStore((state) => state.newProject);
  const loadExample = useEditorStore((state) => state.loadExample);
  const loadProject = useEditorStore((state) => state.loadProject);
  const markSaved = useEditorStore((state) => state.markSaved);
  const clearError = useEditorStore((state) => state.clearError);
  const setError = useEditorStore((state) => state.setError);

  const projectTitle = project.metadata.title || "Untitled Story";

  const handleCreateProject = useCallback(() => {
    if (dirty && !window.confirm("Discard current unsaved changes and create a new project?")) {
      return;
    }

    clearError();
    newProject();
    options.onAfterLoad(useEditorStore.getState().project);
  }, [dirty, newProject, clearError, options.onAfterLoad]);

  const handleLoadExample = useCallback(() => {
    if (dirty && !window.confirm("Discard current unsaved changes and load the example project?")) {
      return;
    }

    clearError();
    loadExample();
    options.onAfterLoad(useEditorStore.getState().project);
  }, [dirty, loadExample, clearError, options.onAfterLoad]);

  const handleOpenProject = useCallback(async () => {
    try {
      if (dirty && !window.confirm("Discard current unsaved changes and open another project?")) {
        return;
      }

      const opened = await openJsonFile();
      if (!opened) {
        return;
      }

      const nextProject = parseProjectJson(opened.text);
      loadProject(nextProject, opened.path);
      clearError();
      options.onAfterLoad(useEditorStore.getState().project);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open project.";
      setError(message);
    }
  }, [dirty, loadProject, clearError, setError, options.onAfterLoad]);

  const handleSaveProject = useCallback(async () => {
    try {
      const issues = exportValidationErrors(project);
      if (issues.length > 0) {
        setError(`Cannot export JSON until all issues are resolved:\n- ${issues.join("\n- ")}`);
        return;
      }

      const contents = serializeProject(project);
      const filePath = await saveJsonFile(contents, fileNameFromTitle(projectTitle), currentFilePath);
      markSaved(filePath);
      clearError();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save project.";
      setError(message);
    }
  }, [project, currentFilePath, projectTitle, markSaved, clearError, setError]);

  const handleSaveProjectAs = useCallback(async () => {
    try {
      const issues = exportValidationErrors(project);
      if (issues.length > 0) {
        setError(`Cannot export JSON until all issues are resolved:\n- ${issues.join("\n- ")}`);
        return;
      }

      const contents = serializeProject(project);
      const filePath = await saveJsonFileAs(contents, fileNameFromTitle(projectTitle));
      if (filePath || !currentFilePath) {
        markSaved(filePath);
      }
      clearError();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save project.";
      setError(message);
    }
  }, [project, currentFilePath, projectTitle, markSaved, clearError, setError]);

  return {
    handleCreateProject,
    handleLoadExample,
    handleOpenProject,
    handleSaveProject,
    handleSaveProjectAs
  };
}

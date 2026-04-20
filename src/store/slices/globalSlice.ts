import { createGlobal, isGlobalReferenced } from "../../lib/story";
import type { GlobalValueType } from "../../types/story";
import { withProjectMutation } from "../storeUtils";
import type { EditorGet, EditorSet } from "../types";

export function createGlobalSlice(set: EditorSet, _get: EditorGet) {
  return {
    addGlobal: (valueType: GlobalValueType) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          project.globals.push(createGlobal(valueType));
          return { project };
        })
      ),
    updateGlobalName: (globalId: string, name: string) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          project.globals = project.globals.map((storyGlobal) =>
            storyGlobal.id === globalId ? { ...storyGlobal, name } : storyGlobal
          );
          return { project };
        })
      ),
    updateGlobalValueType: (globalId: string, valueType: GlobalValueType) =>
      set((state) => {
        if (isGlobalReferenced(state.project, globalId)) {
          return {
            ...state,
            lastError: "Remove conditions that reference this global before changing its type."
          };
        }

        return withProjectMutation(state, (project) => {
          project.globals = project.globals.map((storyGlobal) => {
            if (storyGlobal.id !== globalId) {
              return storyGlobal;
            }

            return valueType === "boolean"
              ? {
                  ...storyGlobal,
                  valueType,
                  defaultValue: false
                }
              : {
                  ...storyGlobal,
                  valueType,
                  defaultValue: 0
                };
          });
          return { project };
        });
      }),
    updateGlobalDefaultValue: (globalId: string, defaultValue: boolean | number) =>
      set((state) =>
        withProjectMutation(state, (project) => {
          project.globals = project.globals.map((storyGlobal) => {
            if (storyGlobal.id !== globalId) {
              return storyGlobal;
            }

            return storyGlobal.valueType === "boolean"
              ? {
                  ...storyGlobal,
                  defaultValue: defaultValue === true
                }
              : {
                  ...storyGlobal,
                  defaultValue:
                    typeof defaultValue === "number" && Number.isFinite(defaultValue) ? defaultValue : 0
                };
          });
          return { project };
        })
      ),
    removeGlobal: (globalId: string) =>
      set((state) => {
        if (isGlobalReferenced(state.project, globalId)) {
          return {
            ...state,
            lastError: "This global is still used by one or more conditions. Remove those references first."
          };
        }

        return withProjectMutation(state, (project) => {
          project.globals = project.globals.filter((storyGlobal) => storyGlobal.id !== globalId);
          return { project };
        });
      })
  };
}

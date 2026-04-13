type PickedFile = {
  path: string | null;
  text: string;
};

function readLocalFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsText(file, "utf-8");
  });
}

function browserOpenJson(): Promise<PickedFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const text = await readLocalFile(file);
        resolve({ path: null, text });
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
}

export async function openJsonFile(): Promise<PickedFile | null> {
  return browserOpenJson();
}

function downloadJson(contents: string, suggestedFileName: string): void {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = suggestedFileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function saveJsonFile(
  contents: string,
  suggestedFileName: string,
  currentPath: string | null
): Promise<string | null> {
  downloadJson(contents, suggestedFileName);
  return currentPath;
}

export async function saveJsonFileAs(
  contents: string,
  suggestedFileName: string
): Promise<string | null> {
  downloadJson(contents, suggestedFileName);
  return null;
}

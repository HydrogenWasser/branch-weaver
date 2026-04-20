import { useRef, useState, type ReactNode } from "react";

type DraggablePanelProps = {
  panelId: string;
  index: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  children: ReactNode;
};

export default function DraggablePanel({ panelId, index, onReorder, children }: DraggablePanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isHandleClicked = useRef(false);

  const handleMouseDown = (event: React.MouseEvent) => {
    const handle = (event.target as HTMLElement).closest(".draggable-panel__handle");
    isHandleClicked.current = !!handle;
  };

  const handleDragStart = (event: React.DragEvent) => {
    if (!isHandleClicked.current) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", String(index));
    event.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    isHandleClicked.current = false;
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const fromIndex = parseInt(event.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(fromIndex) && fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };

  return (
    <div
      className={`draggable-panel${isDragOver ? " is-drag-over" : ""}${isDragging ? " is-dragging" : ""}`}
      draggable
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-panel-id={panelId}
    >
      <div className="draggable-panel__handle" title="Drag to reorder">
        <span className="draggable-panel__handle-grip">::::::</span>
      </div>
      {children}
    </div>
  );
}

import type { MiniMapNodeProps } from "reactflow";

function hasNodeClass(className: string, token: string): boolean {
  return className.split(" ").includes(token);
}

export default function MiniMapNode({
  x,
  y,
  width,
  height,
  borderRadius,
  className,
  color,
  shapeRendering,
  strokeColor,
  strokeWidth,
  onClick,
  id
}: MiniMapNodeProps) {
  const isDot = hasNodeClass(className, "story-minimap__node--dot");
  const isSelected = hasNodeClass(className, "story-minimap__node--selected");
  const isSearchMatch = hasNodeClass(className, "story-minimap__node--search");
  const isAdjacent = hasNodeClass(className, "story-minimap__node--adjacent");
  const isEmphasized = isSelected || isSearchMatch || isAdjacent;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  if (isDot) {
    return (
      <circle
        className={className}
        cx={centerX}
        cy={centerY}
        r={2.8}
        fill={color}
        stroke={strokeColor}
        strokeWidth={0.9}
        shapeRendering={shapeRendering}
        onClick={onClick ? (event) => onClick(event, id) : undefined}
      />
    );
  }

  const minimumWidth = isSelected ? 14 : isEmphasized ? 11 : 4;
  const minimumHeight = isSelected ? 10 : isEmphasized ? 8 : 3.5;
  const renderWidth = Math.max(width, minimumWidth);
  const renderHeight = Math.max(height, minimumHeight);
  const renderX = centerX - renderWidth / 2;
  const renderY = centerY - renderHeight / 2;
  const resolvedStrokeWidth = isSelected ? 2.4 : isSearchMatch ? 2 : isAdjacent ? 1.7 : strokeWidth;

  return (
    <rect
      className={className}
      x={renderX}
      y={renderY}
      width={renderWidth}
      height={renderHeight}
      rx={Math.min(borderRadius, renderHeight / 2)}
      ry={Math.min(borderRadius, renderHeight / 2)}
      fill={color}
      stroke={strokeColor}
      strokeWidth={resolvedStrokeWidth}
      shapeRendering={shapeRendering}
      onClick={onClick ? (event) => onClick(event, id) : undefined}
    />
  );
}

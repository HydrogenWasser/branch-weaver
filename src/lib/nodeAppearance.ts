import type { CSSProperties } from "react";
import type { NodeColorToken } from "../types/story";

type NodeColorTheme = {
  label: string;
  miniMap: string;
  cardTop: string;
  cardBottom: string;
  border: string;
  shadow: string;
  handle: string;
  chipBg: string;
  chipText: string;
};

export const TAG_SUGGESTIONS = ["Start", "End", "Core"] as const;

export const NODE_COLOR_THEMES: Record<NodeColorToken, NodeColorTheme> = {
  sand: {
    label: "Sand",
    miniMap: "#b9a794",
    cardTop: "rgba(255, 250, 241, 0.98)",
    cardBottom: "rgba(250, 240, 227, 0.98)",
    border: "rgba(113, 80, 48, 0.25)",
    shadow: "rgba(78, 54, 32, 0.12)",
    handle: "#9e6f41",
    chipBg: "rgba(241, 225, 199, 0.86)",
    chipText: "#5d432d"
  },
  amber: {
    label: "Amber",
    miniMap: "#d4a04c",
    cardTop: "rgba(255, 247, 225, 0.98)",
    cardBottom: "rgba(248, 232, 191, 0.98)",
    border: "rgba(153, 111, 45, 0.28)",
    shadow: "rgba(132, 88, 20, 0.14)",
    handle: "#b47c27",
    chipBg: "rgba(244, 218, 161, 0.88)",
    chipText: "#62471a"
  },
  clay: {
    label: "Clay",
    miniMap: "#b8826b",
    cardTop: "rgba(251, 241, 234, 0.98)",
    cardBottom: "rgba(241, 219, 206, 0.98)",
    border: "rgba(137, 89, 69, 0.28)",
    shadow: "rgba(110, 68, 51, 0.14)",
    handle: "#9a6349",
    chipBg: "rgba(236, 207, 193, 0.88)",
    chipText: "#613f31"
  },
  sage: {
    label: "Sage",
    miniMap: "#98ab8e",
    cardTop: "rgba(242, 247, 239, 0.98)",
    cardBottom: "rgba(223, 233, 215, 0.98)",
    border: "rgba(103, 123, 91, 0.28)",
    shadow: "rgba(71, 92, 59, 0.14)",
    handle: "#718460",
    chipBg: "rgba(210, 224, 201, 0.9)",
    chipText: "#44563b"
  },
  slate: {
    label: "Slate",
    miniMap: "#8ea0b9",
    cardTop: "rgba(241, 245, 251, 0.98)",
    cardBottom: "rgba(219, 228, 242, 0.98)",
    border: "rgba(96, 113, 142, 0.28)",
    shadow: "rgba(68, 84, 110, 0.14)",
    handle: "#667b9f",
    chipBg: "rgba(208, 219, 236, 0.9)",
    chipText: "#3f4f67"
  },
  rosewood: {
    label: "Rosewood",
    miniMap: "#b48a97",
    cardTop: "rgba(249, 241, 244, 0.98)",
    cardBottom: "rgba(238, 220, 226, 0.98)",
    border: "rgba(128, 92, 103, 0.28)",
    shadow: "rgba(98, 67, 78, 0.14)",
    handle: "#8e6572",
    chipBg: "rgba(233, 207, 216, 0.9)",
    chipText: "#5b3f49"
  }
};

export function getNodeCardStyle(colorToken: NodeColorToken): CSSProperties {
  const theme = NODE_COLOR_THEMES[colorToken];
  return {
    "--node-card-top": theme.cardTop,
    "--node-card-bottom": theme.cardBottom,
    "--node-card-border": theme.border,
    "--node-card-shadow": theme.shadow,
    "--node-card-handle": theme.handle,
    "--node-card-chip-bg": theme.chipBg,
    "--node-card-chip-text": theme.chipText
  } as CSSProperties;
}

export function getNodeMiniMapColor(colorToken: NodeColorToken): string {
  return NODE_COLOR_THEMES[colorToken].miniMap;
}

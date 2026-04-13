import { z } from "zod";

export type XYPosition = {
  x: number;
  y: number;
};

export const nodeColorTokens = ["sand", "amber", "clay", "sage", "slate", "rosewood"] as const;

export type NodeColorToken = (typeof nodeColorTokens)[number];

export type StoryChoice = {
  id: string;
  text: string;
  targetNodeId: string | null;
};

export type StoryNode = {
  id: string;
  title: string;
  body: string;
  position: XYPosition;
  tags: string[];
  colorToken: NodeColorToken;
  choices: StoryChoice[];
};

export type StoryProject = {
  version: 1;
  metadata: {
    title: string;
    startNodeId: string;
  };
  nodes: StoryNode[];
};

export type ChoiceSelection = {
  nodeId: string;
  choiceId: string;
};

export type EditorSelection =
  | { type: "node"; nodeId: string }
  | { type: "choice"; nodeId: string; choiceId: string }
  | null;

export type ViewportState = {
  x: number;
  y: number;
  zoom: number;
};

const positionSchema = z.object({
  x: z.number(),
  y: z.number()
});

const choiceSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  targetNodeId: z.string().min(1).nullable()
});

const nodeColorTokenSchema = z.enum(nodeColorTokens);

const nodeSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  position: positionSchema,
  tags: z.array(z.string()).default([]),
  colorToken: nodeColorTokenSchema.default("sand"),
  choices: z.array(choiceSchema)
});

export const storyProjectSchema = z.object({
  version: z.literal(1),
  metadata: z.object({
    title: z.string(),
    startNodeId: z.string().min(1)
  }),
  nodes: z.array(nodeSchema)
});

export type StoryProjectInput = z.infer<typeof storyProjectSchema>;

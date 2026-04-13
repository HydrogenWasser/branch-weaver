import { type StoryProject } from "../types/story";

export const exampleProject: StoryProject = {
  version: 1,
  metadata: {
    title: "The Locked Room",
    startNodeId: "node_start"
  },
  nodes: [
    {
      id: "node_start",
      title: "Awakening",
      body: "You wake in a silent room. The air smells faintly of rain.",
      position: { x: 100, y: 120 },
      choices: [
        {
          id: "choice_door",
          text: "Try the door",
          targetNodeId: "node_door"
        },
        {
          id: "choice_window",
          text: "Inspect the window",
          targetNodeId: "node_window"
        }
      ]
    },
    {
      id: "node_door",
      title: "The Door",
      body: "The handle turns halfway, then stops against a hidden lock.",
      position: { x: 460, y: 40 },
      choices: [
        {
          id: "choice_return",
          text: "Step back into the room",
          targetNodeId: "node_start"
        }
      ]
    },
    {
      id: "node_window",
      title: "The Window",
      body: "The window is painted shut, but a note is pinned beneath the frame.",
      position: { x: 460, y: 250 },
      choices: [
        {
          id: "choice_note",
          text: "Read the note",
          targetNodeId: "node_note"
        }
      ]
    },
    {
      id: "node_note",
      title: "The Note",
      body: "It says: 'The key is where the light never reaches.'",
      position: { x: 820, y: 250 },
      choices: [
        {
          id: "choice_restart",
          text: "Look around again",
          targetNodeId: "node_start"
        }
      ]
    }
  ]
};

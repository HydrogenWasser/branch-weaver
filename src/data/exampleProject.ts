import { type StoryProject } from "../types/story";

export const exampleProject: StoryProject = {
  version: 2,
  metadata: {
    title: "The Locked Room",
    startNodeId: "node_start"
  },
  globals: [
    {
      id: "global_has_key",
      name: "Has Key",
      valueType: "boolean",
      defaultValue: false
    },
    {
      id: "global_alert_level",
      name: "Alert Level",
      valueType: "number",
      defaultValue: 1
    }
  ],
  nodes: [
    {
      id: "node_start",
      title: "Awakening",
      body: "You wake in a silent room. The air smells faintly of rain.",
      position: { x: 100, y: 120 },
      tags: ["Start", "Core"],
      colorToken: "amber",
      choices: [
        {
          id: "choice_door",
          text: "Try the door",
          visibilityCondition: null,
          route: {
            mode: "conditional",
            branches: [
              {
                condition: {
                  globalId: "global_has_key",
                  operator: "eq",
                  value: true
                },
                targetNodeId: "node_open_door"
              },
              {
                condition: {
                  globalId: "global_alert_level",
                  operator: "gte",
                  value: 3
                },
                targetNodeId: "node_alarm"
              }
            ],
            fallbackTargetNodeId: "node_door"
          }
        },
        {
          id: "choice_window",
          text: "Inspect the window",
          visibilityCondition: null,
          route: {
            mode: "direct",
            targetNodeId: "node_window"
          }
        },
        {
          id: "choice_hidden_panel",
          text: "Search for the hidden panel",
          visibilityCondition: {
            globalId: "global_alert_level",
            operator: "lte",
            value: 2
          },
          route: {
            mode: "direct",
            targetNodeId: "node_panel"
          }
        }
      ]
    },
    {
      id: "node_door",
      title: "The Door",
      body: "The handle turns halfway, then stops against a hidden lock.",
      position: { x: 460, y: 40 },
      tags: ["Core"],
      colorToken: "clay",
      choices: [
        {
          id: "choice_return",
          text: "Step back into the room",
          visibilityCondition: null,
          route: {
            mode: "direct",
            targetNodeId: "node_start"
          }
        }
      ]
    },
    {
      id: "node_open_door",
      title: "Unlocked Door",
      body: "The lock clicks and the door swings open into a quiet corridor.",
      position: { x: 850, y: 20 },
      tags: ["End"],
      colorToken: "sage",
      choices: [
        {
          id: "choice_open_return",
          text: "Retreat back inside",
          visibilityCondition: null,
          route: {
            mode: "direct",
            targetNodeId: "node_start"
          }
        }
      ]
    },
    {
      id: "node_window",
      title: "The Window",
      body: "The window is painted shut, but a note is pinned beneath the frame.",
      position: { x: 460, y: 250 },
      tags: ["Core"],
      colorToken: "slate",
      choices: [
        {
          id: "choice_note",
          text: "Read the note",
          visibilityCondition: null,
          route: {
            mode: "direct",
            targetNodeId: "node_note"
          }
        }
      ]
    },
    {
      id: "node_panel",
      title: "Hidden Panel",
      body: "A loose plank reveals a brass key tucked into the wall.",
      position: { x: 460, y: 430 },
      tags: ["Core"],
      colorToken: "sand",
      choices: [
        {
          id: "choice_panel_back",
          text: "Pocket the key and return",
          visibilityCondition: null,
          route: {
            mode: "direct",
            targetNodeId: "node_start"
          }
        }
      ]
    },
    {
      id: "node_note",
      title: "The Note",
      body: "It says: 'The key is where the light never reaches.'",
      position: { x: 820, y: 250 },
      tags: ["End"],
      colorToken: "rosewood",
      choices: [
        {
          id: "choice_restart",
          text: "Look around again",
          visibilityCondition: null,
          route: {
            mode: "direct",
            targetNodeId: "node_start"
          }
        }
      ]
    },
    {
      id: "node_alarm",
      title: "Alarm",
      body: "A hidden bell shrieks somewhere beyond the walls. Whatever was waiting outside is now awake.",
      position: { x: 850, y: 220 },
      tags: ["End"],
      colorToken: "rosewood",
      choices: [
        {
          id: "choice_alarm_back",
          text: "Stand very still",
          visibilityCondition: null,
          route: {
            mode: "direct",
            targetNodeId: "node_start"
          }
        }
      ]
    }
  ]
};

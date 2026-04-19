# Branch Weaver

Branch Weaver is a lightweight web editor for pure-text branching adventure games. It focuses on three things:

- visual node and branch editing
- fast scene text and choice editing
- JSON import/export with validation

## Stack

- React + TypeScript + Vite
- React Flow
- Zustand
- Zod

## Run

1. Install Node.js.
2. Install dependencies with `npm.cmd install`.
3. Start the editor with `npm.cmd run dev`.
4. Build the production bundle with `npm.cmd run build`.

## Web File Handling

- `Open JSON` uses the browser file picker
- `Save` and `Save As` download a JSON file through the browser
- No desktop shell or local-path writeback is included

## JSON Shape

```json
{
  "version": 1,
  "metadata": {
    "title": "My Story",
    "startNodeId": "node_1"
  },
  "nodes": [
    {
      "id": "node_1",
      "title": "Opening",
      "body": "Scene text",
      "position": { "x": 120, "y": 80 },
      "choices": [
        {
          "id": "choice_1",
          "text": "Go left",
          "targetNodeId": "node_2"
        }
      ]
    }
  ]
}
```

Sample project: [public/examples/locked-room.json](public/examples/locked-room.json)

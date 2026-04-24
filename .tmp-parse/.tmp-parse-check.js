import { parseProjectJson } from "./src/lib/story";
import fs from "node:fs";
const raw = fs.readFileSync("E:/Game Projects/Email-From-Sister/data/Story.json", "utf8");
try {
    const project = parseProjectJson(raw);
    console.log(JSON.stringify({ ok: true, version: project.version, nodes: project.nodes.length, globals: project.globals.length, startNodeId: project.metadata.startNodeId }, null, 2));
}
catch (error) {
    console.error(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exit(1);
}

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import assert from "node:assert/strict";

const transport = new StdioClientTransport({ command: "npx", args: ["mcp-cad-viewer"], env: { ...process.env, CAD_VIEWER_ROOT: "." } });
const client = new Client({ name: "packed-test", version: "0.0.0" });
await client.connect(transport);
const out = await client.callTool({ name: "view_part", arguments: { path: "bracket-block.stl" } });
assert.equal(out.structuredContent.triangles, 12);
const view = await client.readResource({ uri: "ui://cad-viewer/viewer.html" });
assert.match(view.contents[0].text, /<script type="module">/);
await client.close();
console.log("packed package works through npx");

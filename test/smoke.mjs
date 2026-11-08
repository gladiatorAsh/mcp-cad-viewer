// Starts the server over stdio, lists tools and resources, calls view_part on the sample part.
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import assert from "node:assert/strict";

const transport = new StdioClientTransport({ command: "node", args: ["dist/server.js"], env: { ...process.env, CAD_VIEWER_ROOT: "samples" } });
const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
const tool = tools.find((t) => t.name === "view_part");
assert.ok(tool, "view_part is listed");
assert.equal(tool._meta?.ui?.resourceUri, "ui://cad-viewer/viewer.html");

const res = await client.readResource({ uri: "ui://cad-viewer/viewer.html" });
assert.match(res.contents[0].text, /<script type="module">/);
console.log(`view resource: ${res.contents[0].mimeType}, ${(res.contents[0].text.length / 1024).toFixed(0)} KB`);

const out = await client.callTool({ name: "view_part", arguments: { path: "bracket-block.stl" } });
console.log(out.content[0].text);
assert.equal(out.structuredContent.triangles, 12);

// Absolute paths inside the root work too, which is what CAD servers sharing the folder return.
const abs = await client.callTool({ name: "view_part", arguments: { path: `${process.cwd()}/samples/bracket-block.stl` } });
assert.ok(!abs.isError, "absolute paths inside the root are accepted");

const bad = await client.callTool({ name: "view_part", arguments: { path: "../package.json" } });
assert.ok(bad.isError, "paths outside the root are rejected");

await client.close();
console.log("smoke test passed");

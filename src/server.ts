#!/usr/bin/env node
// mcp-cad-viewer: an MCP server whose `view_part` tool returns an interactive 3D view (MCP Apps)
// instead of plain text. Hosts that support MCP Apps render the View in a sandboxed iframe;
// hosts that don't still get a useful text summary.

import { readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { summarizeStl } from "./stl.js";

const VIEW_URI = "ui://cad-viewer/viewer.html";
const MAX_BYTES = 8 * 1024 * 1024;
const here = dirname(fileURLToPath(import.meta.url));

// Files are only read from inside this folder, so the model can't ask for arbitrary paths.
const ROOT = resolve(process.env.CAD_VIEWER_ROOT ?? process.cwd());

function resolveInsideRoot(p: string): string {
  const full = resolve(ROOT, p);
  const rel = relative(ROOT, full);
  if (rel.startsWith("..") || resolve(rel) === rel) throw new Error(`Path must be inside ${ROOT}`);
  return full;
}

async function viewHtml(): Promise<string> {
  // dist/view.js is the bundled View (App class + three.js), built by `npm run build:view`.
  const js = await readFile(join(here, "..", "dist", "view.js"), "utf8");
  const shell = await readFile(join(here, "..", "view", "index.html"), "utf8");
  return shell.replace("<!--VIEW_SCRIPT-->", `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>`);
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-cad-viewer", version: "0.1.0" });

  registerAppTool(
    server,
    "view_part",
    {
      title: "View CAD part",
      description:
        "Open an STL part in an interactive 3D viewer (rotate, zoom, measure the bounding box). " +
        "Returns a text summary with triangle count and dimensions as well.",
      inputSchema: z.object({
        path: z.string().describe("Path to an .stl file, relative to the viewer's root folder")
      }),
      _meta: { ui: { resourceUri: VIEW_URI } }
    },
    async ({ path }) => {
      const full = resolveInsideRoot(path);
      if (extname(full).toLowerCase() !== ".stl") throw new Error("Only .stl files are supported so far");
      const info = await stat(full);
      if (info.size > MAX_BYTES) throw new Error(`File is ${(info.size / 1e6).toFixed(1)} MB; the limit is ${MAX_BYTES / 1e6} MB`);
      const buf = await readFile(full);
      const s = summarizeStl(buf);
      const dims = s.size.map((v) => v.toFixed(2)).join(" × ");
      return {
        content: [{ type: "text", text: `${basename(full)}: ${s.triangles.toLocaleString()} triangles (${s.format} STL), bounding box ${dims} model units.` }],
        structuredContent: { name: basename(full), ...s, stlBase64: buf.toString("base64") }
      };
    }
  );

  registerAppResource(server, "CAD part viewer", VIEW_URI, { description: "Interactive 3D viewer for STL parts" }, async () => ({
    contents: [{ uri: VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: await viewHtml() }]
  }));

  return server;
}

// serveStdio picks the protocol era per connection, so the same server works with
// 2025-era clients (initialize handshake) and stateless 2026-07-28 clients.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  serveStdio(createServer);
}

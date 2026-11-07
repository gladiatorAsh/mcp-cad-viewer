# mcp-cad-viewer

An MCP server that opens CAD parts in an **interactive 3D viewer inside the chat**, using [MCP Apps](https://github.com/modelcontextprotocol/ext-apps).

Most MCP tools answer with text. For mechanical engineers that's the wrong shape: "the bracket is 20 × 10 × 5 mm with 12k triangles" is less useful than the bracket itself. `view_part` returns a summary the model can reason about **and** a View the host renders in a sandboxed iframe, where you can rotate and zoom the part.

> **Status: early.** The server, the STL pipeline and the View are working and smoke-tested. Next up is testing in real MCP Apps hosts and adding STEP support. See the [roadmap](#roadmap).

## How it works

```
model ──calls──▶ view_part(path)                         host (Claude, VS Code, ChatGPT…)
                   │                                         │
                   ├─ text: "12 triangles, 20 × 10 × 5"  ───▶│ shown to the model
                   ├─ structuredContent: summary + STL   ───▶│ passed to the View
                   └─ _meta.ui.resourceUri ──────────────────▶ fetches ui://cad-viewer/viewer.html
                                                             └─ renders it in a sandboxed iframe
                                                                (three.js, orbit controls)
```

- **Server** (`src/server.ts`): MCP TypeScript SDK v2. `serveStdio` negotiates the protocol era per connection, so the same server works with 2025-era clients and stateless **2026-07-28** clients.
- **View** (`view/`): uses the `App` class from `@modelcontextprotocol/ext-apps` to receive the tool result and three.js to render it. It's bundled with esbuild and inlined into one HTML resource, so it needs no network access and no CSP exceptions.
- **Safety**: files are only read from inside `CAD_VIEWER_ROOT`. Path traversal is rejected, and parts are capped at 8 MB.

## Try it

```bash
npm install
npm run smoke        # builds, starts the server, calls view_part on samples/bracket-block.stl
```

Add it to an MCP Apps–capable host (stdio):

```json
{
  "mcpServers": {
    "cad-viewer": {
      "command": "node",
      "args": ["/path/to/mcp-cad-viewer/dist/server.js"],
      "env": { "CAD_VIEWER_ROOT": "/path/to/your/parts" }
    }
  }
}
```

Then ask: *"Show me bracket-block.stl"*.

## Roadmap

- [x] `view_part` tool with STL parsing (ASCII and binary), bounding box and triangle count
- [x] Bundled three.js View delivered as an MCP Apps `ui://` resource
- [x] Smoke test through a real MCP client
- [ ] Verify rendering in Claude, VS Code and ChatGPT; follow the host's theme
- [ ] STEP and IGES support (OpenCascade.js, converted server-side to a mesh)
- [ ] Measurement tools in the View: click two points for a distance, section planes
- [ ] View-to-server calls: "highlight the face I clicked" goes back to the model as context
- [ ] Streamable HTTP transport and a hosted demo on free infrastructure
- [ ] Shrink the View bundle (tree-shake three.js, lazy-load loaders)

## Related

- [fusion-mcp-server](https://github.com/gladiatorAsh/fusion-mcp-server): drives Autodesk Fusion from an agent; this viewer shows the result
- [mcp-tool-bench](https://github.com/gladiatorAsh/mcp-tool-bench): conformance checks and tool-selection evals for MCP servers

## License

MIT © Ashutosh Singh

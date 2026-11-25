# dsh-json-tree-preview

Open a `.json` file in the DeepSeek Harness right sidebar and read it as a **collapsible tree** instead of a wall of text.

## Features

- Tree view with per-node expand / collapse, indentation guides and colour-coded values (string / number / boolean / null).
- Toolbar: **Expand all**, **Collapse all**, live filter over keys and primitive values, node count and file size.
- Filter matches are counted (`3/12`) and walked with `Enter` / `Shift+Enter`; `Ctrl`/`Cmd`+`F` focuses the filter, `Esc` clears it.
- Click a key or a value to select the node. A bottom bar shows its JSON path (`nested.deep.items[2]`, `["odd key"]`) with a **Copy path** button.
- Hover any row to reveal a copy button on the right: copies the primitive without quotes, or the whole subtree as pretty-printed JSON for objects and arrays.
- Expansion state is remembered per file in `localStorage`.
- Virtual scrolling: only the visible window of rows is rendered, so a 10 MB / 100k-node file scrolls smoothly.

## Install

```bash
npm install -g dsh-json-tree-preview      # or install it through the DSH plugin manager
```

Then enable `dsh-json-tree-preview` in the plugin manager and refresh the GUI.

## How it plugs in

The client module registers itself with whichever preview extension points exist in the running app:

- `dsh-better-sidebar` — `ctx.betterSidebar.registerFileViewer({ exts: ['json','jsonc','json5'], priority: 50, fetchStrategy: 'fsRead' })`. This is what renders the tree in the right sidebar file preview.
- `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` — `ctx.documentPreviews.register(...)` plus a `sidebar.right.tab.document` slot body, so the tree also works in hosts that use the built-in document preview.

Both are looked up at runtime through `ctx.get(...)`, so the plugin activates even when only one of them is present.

## Syntax tolerance

Strict `JSON.parse` first. If that fails and the file is `.jsonc` / `.json5`, comments and trailing commas are stripped and parsing is retried. Files that still fail show the parser message, line/column, and the offending line with a caret.

## Files

| File | Purpose |
| --- | --- |
| `client.js` | The whole UI: parser recovery, tree model, virtual scrolling, view component, registrations. |
| `index.js` | Host half (no services yet). |
| `cordis.patch.yml` | Bundle patch that inserts this plugin. |
| `locale/en.json`, `locale/zh.json` | Plugin catalog title and description. |
| `icon.svg` | Plugin icon. |

## Publishing

```bash
cd .dsh-plugins/json-tree-preview
npm publish --access public
```

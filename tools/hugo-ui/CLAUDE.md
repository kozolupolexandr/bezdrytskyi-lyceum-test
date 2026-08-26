# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Run the Electron app (dev)
npm run build      # Build a portable Windows x64 exe via electron-builder
```

No test runner or linter is configured.

## Architecture

Hugo UI is a single-window Electron desktop app for editing Hugo CMS markdown files. It is intentionally minimal: three files do everything.

### File overview

| File | Role |
|------|------|
| `main.js` | Electron main process — all file I/O, IPC handlers, config loading |
| `preload.js` | Context bridge — exposes `window.api` to the renderer via `contextBridge` |
| `index.html` | Entire renderer: styles + HTML structure + all JS logic (no bundler) |
| `config.json` | User configuration: directory paths, per-directory schemas, templates, media roots |

### IPC surface (`window.api`)

The renderer never touches Node APIs directly. Everything goes through `preload.js` → `ipcMain.handle` in `main.js`:

- `getTree()` — returns recursive dir/file tree for configured directories
- `getSchema(filePath)` — returns schema array for the directory that owns this file
- `readFile(filePath)` — parses YAML front matter + body; returns `{ frontMatter, body }`
- `writeFile(filePath, frontMatter, body)` — serialises front matter back to YAML and writes
- `createFile(dirPath, fileName)` — creates a new `.md` with default front matter from schema/template
- `getSuggestions(dirPath)` — scans all `.md` files in a dir and collects existing values per field (for autocomplete)
- `nextFileName(dirPath)` — computes next filename from `fileNamePattern` (e.g. `notice-{n}`)
- `getAllPages()` — scans all content dirs and returns `{ title, relativePath }` for internal link picker
- `listAllImages()` — reads `media.images` dirs under `assetsRoot`, returns base64 data URLs for the image grid
- `listAllDocuments()` — reads `media.documents` dirs under `staticRoot`
- `log(level, ...args)` — writes to `hugo-ui.log` in the app directory

### config.json schema

`config.json` drives the entire app behaviour. Key top-level keys:

- `staticRoot` / `assetsRoot` / `contentRoot` — absolute paths to Hugo project directories (relative paths are resolved from `config.json` location)
- `media.images` — array of subdirectory names under `assetsRoot` that contain images
- `media.documents` — array of subdirectory names under `staticRoot` that contain downloadable documents
- `directories[]` — one entry per editable content directory, each with:
  - `path` — absolute path
  - `exclude` — filenames to hide (e.g. `["_index.md"]`)
  - `fileNamePattern` — auto-naming pattern, `{n}` is replaced with next integer
  - `schema[]` — ordered list of front matter fields shown in the form; each field has `name`, `type` (`string` | `date` | `boolean` | `array`), optional `required`, `default` (`"today"` is a special value), `hidden` (stores value but hides it from the form)
  - `template.frontMatter` — extra default values written on file creation
  - `template.body` — initial markdown body

### Renderer structure (`index.html`)

The renderer is one large `<script>` tag with no framework or bundler. Key globals:

- `currentPath` / `dirty` / `activeRow` — current open file state
- `schema` — loaded per file open from `window.api.getSchema()`
- `hiddenValues` — preserves front matter fields marked `hidden: true` so they survive round-trips
- `suggestionsCache` — keyed by directory path; loaded once per directory open

Key functions:
- `buildTree()` / `renderNode()` — sidebar file tree
- `buildForm(values, suggestions)` — renders the front matter panel from `schema`
- `collectFrontMatter()` — reads the form back into a plain object for saving
- `openFile()` / `saveFile()` — coordinate IPC calls and UI state
- `openInternalLinkModal()` / `openImageModal()` / `openCarouselModal()` — context-menu insert dialogs

### Hugo shortcodes used

The app generates two Hugo shortcode syntaxes inserted at cursor:
- Single image: `{{< images src="..." caption="..." >}}`
- Carousel: `{{< images >}}\npath | caption\n{{< /images >}}`
- Internal page link: `[text]({{< ref "relativePath" >}})`

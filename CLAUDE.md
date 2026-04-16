# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (root: public/)
npm run build    # Production build → dist/
npm run preview  # Serve dist/ locally
```

Local dev requires a `.env.local` file with the Firebase credentials (see `.env.example`). The Vite root is `public/`, so `public/index.html` is the entry point — not the repo root.

Deployment is automatic: push to `main` → Vercel builds and deploys. Firebase env vars must be set in the Vercel project settings.

## Architecture

Single-page app, no framework. All JS is vanilla ES modules bundled by Vite.

### Collaboration stack

The real-time sync layer:
- **Yjs** (`Y.Doc`) is the authoritative in-memory document state using CRDTs
- The shared type is `ydoc.getXmlFragment('protokoll_rich')` — a `Y.XmlFragment` bound to TipTap
- **`src/firebaseProvider.js`** is a custom Yjs provider (not y-firebase). It loads history on init via Firebase `get()`, then listens for new updates via `onChildAdded`. Local changes are debounced (250 ms) and batched with `Y.mergeUpdates` before writing to `rooms/{roomId}/updates_v8`. A synchronous key reservation (`push()` then `set()`) prevents the race condition where `onChildAdded` would re-apply the provider's own writes.
- **Awareness** (cursor/user state) is synced separately via `rooms/{roomId}/awareness/{clientId}` using `onValue`. Firebase callbacks are deferred with `queueMicrotask` to avoid ProseMirror reentrancy errors.
- **Presence** (online users) uses `rooms/{roomId}/presence/{sessionId}` with `onDisconnect().remove()`.

### Editor

- **TipTap 3** WYSIWYG editor (`src/richEditor.js`) with `StarterKit.configure({ undoRedo: false })` — `undoRedo` must be disabled (not `history`) because `Collaboration` brings its own undo via `yUndoPlugin`.
- **`@tiptap/extension-collaboration-cursor` is intentionally removed** — it crashes because `CollaborationCursor@3.0.0` uses `y-prosemirror`'s `ySyncPluginKey` while `Collaboration@3.22.x` uses `@tiptap/y-tiptap`'s `ySyncPluginKey`. These are different plugin key instances, causing `undefined.doc` in cursor init.
- **`@tiptap/y-tiptap`** has no version above `3.0.3` — it does not follow the same versioning cadence as other TipTap 3.x packages.

### Wiki export

`getEditorWikiContent(editor)` in `src/richEditor.js` converts TipTap JSON → MediaWiki syntax via `tiptapToWiki()`. Nested lists are recursive: depth determines the number of `*` or `#` characters. Templates are inserted as plain-text paragraphs so the raw `{{Template|1=...|2=...}}` syntax passes through unchanged.

### Data model (Firebase)

```
protocols/{id}         → { title, createdAt, isBackup?, snapshotContent? }
rooms/{roomId}/updates_v8/{pushKey}  → base64-encoded Yjs update
rooms/{roomId}/awareness/{clientId}  → { clientId, state (JSON), ts }
rooms/{roomId}/presence/{sessionId}  → { name, initials, color }
```

Protocol IDs are also used as room IDs. Backup protocols (`isBackup: true`) store wiki text in `snapshotContent` and are not opened in the editor — clicking them triggers a download.

### Module responsibilities

| File | Role |
|---|---|
| `src/main.js` | App entry: orchestrates init, protocol switching, header buttons |
| `src/firebaseProvider.js` | Custom Yjs ↔ Firebase sync provider |
| `src/collaboration.js` | Creates `Y.Doc`, `Awareness`, `FirebaseProvider` |
| `src/richEditor.js` | TipTap editor factory + `tiptapToWiki()` converter |
| `src/toolbar.js` | Renders toolbar from `TEMPLATE_GROUPS`, handles modal prompts |
| `src/templates/index.js` | All toolbar button definitions and wiki-template generators |
| `src/protocols.js` | Firebase CRUD for protocol list and backups |
| `src/protocolSelector.js` | Dropdown UI for switching/creating protocols |
| `src/presence.js` | Firebase-based online-user tracking |
| `src/identity.js` | Name/colour modal, persisted in `localStorage` |
| `src/room.js` | Room ID via `window.location.hash` |
| `src/export.js` | `downloadWiki()`, `showToast()` |

### Styles

- `styles/main.css` — CSS variables/theme (dark default, `html.light` overrides), header, toolbar, modals, protocol selector
- `styles/editor.css` — ProseMirror/TipTap content styles, quelltext panel
- `styles/awareness.css` — user badge circles

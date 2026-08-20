# Sireen v1.0.3 — Session Management System

## Summary
This release implements a full session management system (Phases B–D) enabling persistent, named audit sessions with workspace state recovery, timeline tracking, and seamless editor integration.

## New Features

### Backend (`gaolaif/backend/session_store.py`)
- SQLite persistence layer for audit sessions
- Tables: `sessions` (with JSON workspace_state), `session_timeline`
- Full CRUD API: 10 endpoints under `/sessions/*`
- Timeline events recorded on audit completion

### Extension — Session UI (`SessionManagerView.tsx`)
- Create, list, search, rename, archive, duplicate, and delete sessions
- Session-aware header showing active context (name + counts + hint)
- Auto-saves workspace state every 30 seconds

### Extension — Editor Integration
- Diagnostics wired via `onFindings` callback → VS Code Problems panel
- Vulnerability decorations applied to visible editors (severity-colored)

### Extension — Messaging & State
- `MessageRouter`: handles all 8 session commands
- `useMessageBus`: dispatches RESTORE_WORKSPACE on load
- `store/index.tsx`: persists session fields across reloads

### Testing
- New test suite: `useMessageBus.test.tsx` (71s runtime)
- All 38 tests passing

## Bug Fixes
- Fixed CORS to restrict to localhost/vscode-webview origins only
- Fixed WebSocket message routing for session commands
- Cleaned up dead code (ChatView, LeftSidebar, HackerMode)

## Build Stats
- `extension.js`: 87 KB
- `webview.js`: 322 KB (2 warnings for size limits — acceptable)
- Lint: 0 errors, 28 warnings (all pre-existing)
- Tests: **38/38 pass**

## Files Changed
- 44 files changed, 3,942 insertions(+), 609 deletions(-)
- New: `session_store.py`, `SessionManagerView.tsx`, 7 session module files, test suite

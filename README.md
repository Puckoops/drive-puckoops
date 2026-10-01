# Puckoops Drive — frontend

Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui

Built to **Precision Slate**, the design system exported with the Stitch
screens (`precision_slate/DESIGN.md`). Its palette, type scale, elevation
levels and component specs are mapped onto shadcn's tokens in
`src/app/globals.css` — that file is the single place colour is decided.

The system commits to one light world, so there is no dark palette here.
That is a choice taken from the spec, not an omission.

## Running it

```bash
npm install && npm run dev
```

`user-svc` needs to be up for sign-in:

```bash
cd ../user-svc && go run ./cmd
```

Then sign in at `/login`, or create an account — signup writes to the same
MongoDB the service is pointed at.

## What is real and what is not

| Area | Backing |
|---|---|
| Sign in, sign up, session | **Real** — `user-svc` on `:8080` |
| Files, folders, sharing, quota, activity | Seeded in-memory adapter |
| Upload progress, throughput, ETA, tray | Real queue, simulated transport |

`uploader-be` does not exist yet, so everything Drive-shaped runs through
`src/lib/mock-drive.ts`. It implements `DriveApi` from `src/lib/types.ts` —
the same surface the Go service will expose — so switching over means
replacing one module, not rewriting screens.

State persists to `localStorage` under `puckoops.drive.v1`. Call
`resetMockDrive()` to get the seed back.

## The upload engine

`src/upload/{engine,resumable,idb,scan}.ts` is the real implementation,
lifted from the working GEOID uploader: v4-signed resumable sessions,
256 KiB-aligned chunks, `308` offset probes, IndexedDB resume across
reloads. It is already correct and already proven against GCS.

It needs an endpoint that mints signed URLs, so until `uploader-be` ships,
`src/upload/queue.ts` drives the same `Snapshot` contract with a simulated
transport. The tray, progress, throughput and ETA are all exercised for
real; only the bytes are pretend. Swapping back is changing which class
`drive-shell.tsx` constructs.

## Layout

```
src/
  app/            routes — files, file/[id], recent, starred, shared, trash, storage, login
  components/     drive-shell (the only stateful container), plus screens and dialogs
  lib/            types (DriveApi), mock-drive, auth (user-svc), format
  upload/         engine + resumable protocol, and the queue the UI binds to
```

`drive-shell.tsx` owns the session, the upload queue, dialogs and drag-drop,
and hands the rest down through `useDrive()`. Pages stay presentational.

## Still to build

- Move between folders (drag onto a folder, and a picker)
- Versions list behind the `v1` chip
- Comments box in the inspector — the stream renders, composing does not
- Pagination; listing currently returns everything in a folder
- Mobile: the 240px rail should become a slide-over below 768px
# puckoops-fe

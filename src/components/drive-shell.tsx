"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { RenameDialog } from "@/components/rename-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { UploadTray } from "@/components/upload-tray";
import { cachedUser, clearSession, me, Unauthorized, type Me } from "@/lib/api";
import { puckoopsDrive } from "@/lib/drive-api";
import type { DriveApi, DriveNode, Quota } from "@/lib/types";
import { sourcesFromDataTransfer, sourcesFromInput, supportsDirectoryPicker, scanDirectoryHandle } from "@/upload/scan";
import { UploadEngine } from "@/upload/engine";
import type { FileSource, Snapshot } from "@/upload/types";

interface DriveContext {
  drive: DriveApi;
  /** The signed-in account. Components need it to tell "me" from a
     collaborator in an owner column. Null only before the first load. */
  me: Me | null;
  quota: Quota | null;
  /** Bumped whenever data changes, so pages can refetch. */
  revision: number;
  refresh: () => void;
  /** The folder new uploads land in; pages set it as the user navigates. */
  setUploadTarget: (parentId: string | null, label: string) => void;
  openShare: (node: DriveNode) => void;
  openRename: (node: DriveNode) => void;
  trash: (node: DriveNode) => void;
  star: (node: DriveNode) => void;
  copyLink: (node: DriveNode) => void;
  open: (node: DriveNode) => void;
  uploadFiles: () => void;
  uploadFolder: () => void;
}

const Ctx = createContext<DriveContext | null>(null);

export function useDrive(): DriveContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDrive must be used inside DriveShell");
  return v;
}

export function DriveShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const drive = puckoopsDrive;

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [account, setAccount] = useState<Me | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [revision, setRevision] = useState(0);
  const [shareNode, setShareNode] = useState<DriveNode | null>(null);
  const [renameNode, setRenameNode] = useState<DriveNode | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [dragging, setDragging] = useState(false);

  const target = useRef<{ parentId: string | null; label: string }>({
    parentId: null,
    label: "My Files",
  });
  const queueRef = useRef<UploadEngine | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  const setUploadTarget = useCallback((parentId: string | null, label: string) => {
    target.current = { parentId, label };
  }, []);

  useEffect(() => {
    // Paint from cache so the shell does not flash, then let the server
    // correct it. A rejected token sends you to login from this one place.
    const cached = cachedUser();
    if (!cached) {
      router.replace("/login");
      return;
    }
    setUser({ name: cached.name, email: cached.email });

    let cancelled = false;
    void me()
      .then((real) => {
        if (cancelled) return;
        setAccount(real);
        setUser({ name: real.name, email: real.email });
      })
      .catch((err) => {
        if (err instanceof Unauthorized) {
          clearSession();
          router.replace("/login");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    // The drive service reports usage and reads the entitlement from
    // user-svc itself, so this is one call rather than two stitched here.
    void drive
      .quota()
      .then(setQuota)
      .catch((err) => {
        if (err instanceof Unauthorized) {
          clearSession();
          router.replace("/login");
          return;
        }
        toast.error(err instanceof Error ? err.message : "Could not read your storage use");
      });
  }, [drive, revision, router]);

  useEffect(() => {
    if (!snapshot?.running) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [snapshot?.running]);

  const startUpload = useCallback(
    (sources: FileSource[]) => {
      if (sources.length === 0) return;
      const engine = new UploadEngine(
        sources,
        sources.map((s) => ({
          relPath: s.relPath,
          size: s.size,
          uploaded: 0,
          status: "pending" as const,
          attempts: 0,
        })),
        {
          jobId: `${Date.now()}`,
          parentId: target.current.parentId,
          concurrency: 3,
          // 16 MiB: a multiple of the 256 KiB GCS requires, and big enough
          // that a large file is not thousands of round trips.
          chunkSize: 16 * 1024 * 1024,
          drive,
          onChange: setSnapshot,
          onCommitted: refresh,
        },
      );
      queueRef.current = engine;
      void engine.start();
    },
    [drive, refresh],
  );

  const ctx: DriveContext = useMemo(() => ({
    drive,
    me: account,
    quota,
    revision,
    refresh,
    setUploadTarget,
    openShare: setShareNode,
    openRename: setRenameNode,
    trash: async (node) => {
      await drive.trash([node.id]);
      refresh();
      toast.success(`${node.name} moved to trash`, {
        action: {
          label: "Undo",
          onClick: async () => {
            await drive.restore([node.id]);
            refresh();
          },
        },
      });
    },
    star: async (node) => {
      await drive.star(node.id, !node.starred);
      refresh();
    },
    copyLink: async (node) => {
      try {
        // The in-app address, not a share link. A share link is a separate
        // credential and is created in the share dialog.
        const path = node.kind === "folder" ? `/files/${node.id}` : `/file/${node.id}`;
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        toast.success("Link copied");
      } catch {
        toast.error("Could not reach the clipboard");
      }
    },
    open: (node) => {
      router.push(node.kind === "folder" ? `/files/${node.id}` : `/file/${node.id}`);
    },
    uploadFiles: () => fileInput.current?.click(),
    uploadFolder: async () => {
      if (!supportsDirectoryPicker()) {
        folderInput.current?.click();
        return;
      }
      try {
        const handle = await window.showDirectoryPicker!({ id: "puckoops", mode: "read" });
        const sources = await scanDirectoryHandle(handle);
        startUpload(sources);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          toast.error(err instanceof Error ? err.message : String(err));
        }
      }
    },
  }), [drive, account, quota, revision, refresh, setUploadTarget, router, startUpload]);

  if (!user) return null;

  return (
    <Ctx.Provider value={ctx}>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current++;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          startUpload(await sourcesFromDataTransfer(e.dataTransfer));
        }}
      >
        <AppSidebar
          user={user}
          quota={quota}
          onNewFolder={() => window.dispatchEvent(new CustomEvent("puckoops:new-folder"))}
          onUploadFiles={ctx.uploadFiles}
          onUploadFolder={ctx.uploadFolder}
          onSignOut={() => {
            clearSession();
            router.replace("/login");
          }}
        />

        <div className="pl-60">
          <AppHeader
            title={title}
            user={user}
            onSearch={(q) => drive.search(q)}
            onOpen={ctx.open}
            onUploadFiles={ctx.uploadFiles}
          />
          <main className="mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-[1400px] px-6 pb-24 pt-6">
            {children}
          </main>
        </div>

        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) startUpload(sourcesFromInput(e.target.files));
            e.target.value = "";
          }}
        />
        <input
          ref={folderInput}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) startUpload(sourcesFromInput(e.target.files));
            e.target.value = "";
          }}
        />

        {dragging && (
          <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-background/85">
            <div className="rounded-xl border-2 border-dashed border-[var(--hairline)] px-10 py-8 text-center">
              <UploadCloud className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-display text-[15px] font-semibold">Drop to upload</p>
              <p className="data mt-1 text-muted-foreground">into {target.current.label}</p>
            </div>
          </div>
        )}

        {snapshot && (
          <UploadTray
            snapshot={snapshot}
            destination={target.current.label}
            onPause={() => queueRef.current?.pause()}
            onResume={() => queueRef.current?.start()}
            onDismiss={() => setSnapshot(null)}
          />
        )}

        <ShareDialog
          node={shareNode}
          drive={drive}
          onClose={() => setShareNode(null)}
          onChanged={(n) => {
            setShareNode(n);
            refresh();
          }}
        />

        <RenameDialog
          node={renameNode}
          onClose={() => setRenameNode(null)}
          onSubmit={async (name) => {
            if (renameNode) {
              await drive.rename(renameNode.id, name);
              refresh();
              toast.success("Renamed");
            }
            setRenameNode(null);
          }}
        />
      </div>
    </Ctx.Provider>
  );
}

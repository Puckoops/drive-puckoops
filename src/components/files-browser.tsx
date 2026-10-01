"use client";

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronRight,
  FolderPlus,
  LayoutGrid,
  List,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileGrid, FolderCards } from "@/components/file-grid";
import { FileList } from "@/components/file-list";
import { NewFolderDialog } from "@/components/new-folder-dialog";
import { useDrive } from "@/components/drive-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryOf } from "@/lib/format";
import { formatBytes } from "@/lib/format";
import type { Breadcrumb, DriveNode, Listing } from "@/lib/types";

type SortKey = "modified" | "name" | "size";
type ViewMode = "list" | "grid";

const FILTERS = [
  { key: "all", label: "All types" },
  { key: "document", label: "Documents" },
  { key: "image", label: "Images" },
  { key: "video", label: "Media" },
  { key: "archive", label: "Archives" },
] as const;

const SORT_LABEL: Record<SortKey, string> = {
  modified: "Last modified",
  name: "Name",
  size: "Size",
};

export function FilesBrowser({ folderId }: { folderId: string | null }) {
  const drive = useDrive();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [sort, setSort] = useState<SortKey>("modified");
  const [desc, setDesc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newFolder, setNewFolder] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void drive.drive.list(folderId).then((data) => {
      if (cancelled) return;
      setListing(data);
      setLoading(false);
      setSelected(new Set());
      const label = data.prefix[data.prefix.length - 1]?.name ?? "My Files";
      drive.setUploadTarget(folderId, label);
    });
    return () => {
      cancelled = true;
    };
    // The api client and the revision are what this depends on. Depending on
    // the whole context object refetched on every render of the shell.
  }, [folderId, drive.drive, drive.revision, drive.setUploadTarget]);

  useEffect(() => {
    const onNewFolder = () => setNewFolder(true);
    window.addEventListener("puckoops:new-folder", onNewFolder);
    return () => window.removeEventListener("puckoops:new-folder", onNewFolder);
  }, []);

  const { folders, files } = useMemo(() => {
    if (!listing) return { folders: [] as DriveNode[], files: [] as DriveNode[] };
    const dir = desc ? -1 : 1;
    const cmp = (a: DriveNode, b: DriveNode) => {
      if (sort === "name") return dir * a.name.localeCompare(b.name);
      if (sort === "size") return dir * ((a.sizeBytes ?? 0) - (b.sizeBytes ?? 0));
      return dir * (+new Date(a.modifiedAt) - +new Date(b.modifiedAt));
    };
    const matched =
      filter === "all" ? listing.files : listing.files.filter((f) => categoryOf(f.contentType) === filter);
    return { folders: [...listing.folders].sort(cmp), files: matched.sort(cmp) };
  }, [listing, sort, desc, filter]);

  const actions = {
    onOpen: drive.open,
    onStar: drive.star,
    onShare: drive.openShare,
    onRename: drive.openRename,
    onTrash: drive.trash,
    onCopyLink: drive.copyLink,
  };

  const total = folders.length + files.length;
  const bytes = files.reduce((a, f) => a + f.sizeBytes, 0);

  return (
    <div className="flex flex-col gap-6">
      <Crumbs prefix={listing?.prefix ?? [{ id: null, name: "My Files" }]} onOpen={(id) => drive.open({ id, kind: "folder" } as DriveNode)} />

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[32px] leading-tight">
              {listing?.prefix[listing.prefix.length - 1]?.name ?? "My Files"}
            </h1>
            <p className="mt-0.5 text-[14px] text-muted-foreground">
              {loading ? "Loading…" : `${total} items`}
              {!loading && bytes > 0 && (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  {formatBytes(bytes)}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="outline" onClick={() => setNewFolder(true)}>
              <FolderPlus className="size-4" />
              New folder
            </Button>
            <Button onClick={drive.uploadFiles}>
              <Upload className="size-4" />
              Upload
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={
                filter === f.key
                  ? "label-sm h-[26px] rounded-full border border-[var(--hairline)] bg-background px-2.5 text-foreground"
                  : "label-sm h-[26px] rounded-full bg-muted px-2.5 text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="label-md">
                <span className="text-muted-foreground">Sort:</span>
                {SORT_LABEL[sort]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => setSort(k)}>
                  {SORT_LABEL[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setDesc((d) => !d)}
            aria-label={desc ? "Sort ascending" : "Sort descending"}
          >
            {desc ? <ArrowDownWideNarrow className="size-4" /> : <ArrowUpNarrowWide className="size-4" />}
          </Button>

          <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
            <ViewToggle active={view === "list"} onClick={() => setView("list")} label="List view">
              <List className="size-4" />
            </ViewToggle>
            <ViewToggle active={view === "grid"} onClick={() => setView("grid")} label="Grid view">
              <LayoutGrid className="size-4" />
            </ViewToggle>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--hairline)] bg-card px-4 py-2.5 shadow-[var(--shadow-e1)]">
          <span className="label-md">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await drive.drive.trash([...selected]);
                setSelected(new Set());
                drive.refresh();
                toast.success("Moved to trash");
              }}
            >
              <Trash2 className="size-4" />
              Trash
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSelected(new Set())} aria-label="Clear selection">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingRows />
      ) : total === 0 ? (
        <Empty filtered={filter !== "all"} onUpload={drive.uploadFiles} />
      ) : view === "list" ? (
        <div className="flex flex-col gap-6">
          {folders.length > 0 && files.length > 0 && <FolderCards folders={folders} {...actions} />}
          <FileList
            nodes={folders.length > 0 && files.length > 0 ? files : [...folders, ...files]}
            selected={selected}
            onSelect={(id, on) =>
              setSelected((s) => {
                const next = new Set(s);
                on ? next.add(id) : next.delete(id);
                return next;
              })
            }
            onSelectAll={(on) =>
              setSelected(on ? new Set([...folders, ...files].map((n) => n.id)) : new Set())
            }
            {...actions}
          />
        </div>
      ) : (
        <FileGrid
          folders={folders}
          files={files}
          selected={selected}
          onSelect={(id, on) =>
            setSelected((s) => {
              const next = new Set(s);
              on ? next.add(id) : next.delete(id);
              return next;
            })
          }
          {...actions}
        />
      )}

      <NewFolderDialog
        open={newFolder}
        destination={listing?.prefix[listing.prefix.length - 1]?.name ?? "My Files"}
        onClose={() => setNewFolder(false)}
        onCreate={async (name) => {
          await drive.drive.createFolder(folderId, name);
          setNewFolder(false);
          drive.refresh();
          toast.success(`Created ${name}`);
        }}
      />
    </div>
  );
}

function Crumbs({ prefix, onOpen }: { prefix: Breadcrumb[]; onOpen: (id: string | null) => void }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[13px]">
      {prefix.map((c, i) => {
        const last = i === prefix.length - 1;
        return (
          <span key={c.id ?? "root"} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-border" />}
            <button
              onClick={() => !last && onOpen(c.id)}
              aria-current={last ? "page" : undefined}
              className={
                last
                  ? "rounded px-1.5 py-0.5 font-medium"
                  : "rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              }
            >
              {c.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={
        active
          ? "grid size-7 place-items-center rounded bg-card text-foreground shadow-[var(--shadow-e1)]"
          : "grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-[#f1f5f9] px-4 py-3 last:border-b-0">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-4 flex-1 max-w-80" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function Empty({ filtered, onUpload }: { filtered: boolean; onUpload: () => void }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-[var(--hairline)] bg-card py-20 text-center">
      <div className="flex max-w-sm flex-col items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
          {filtered ? <Loader2 className="size-5" /> : <Upload className="size-5" />}
        </span>
        <div>
          <p className="font-display text-[15px] font-semibold">
            {filtered ? "Nothing of that type here" : "This folder is empty"}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {filtered
              ? "Try a different filter, or clear it to see everything."
              : "Drop files anywhere on this page, or upload them."}
          </p>
        </div>
        {!filtered && (
          <Button onClick={onUpload} className="mt-1">
            <Upload className="size-4" />
            Upload files
          </Button>
        )}
      </div>
    </div>
  );
}

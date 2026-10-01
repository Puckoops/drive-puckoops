"use client";

import {
  ArrowLeft,
  Copy,
  Download,
  History,
  Maximize2,
  Minus,
  MoreVertical,
  Move,
  Pencil,
  Plus,
  RotateCw,
  Scan,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDrive } from "@/components/drive-shell";
import { collaborators } from "@/lib/nodes";
import { NodeIcon, specFor } from "@/components/file-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clockDuration, formatBytes, formatWhen, initials } from "@/lib/format";
import type { ActivityEvent, Comment, DriveNode } from "@/lib/types";

export function FilePreview({ fileId }: { fileId: string }) {
  const drive = useDrive();
  const [node, setNode] = useState<DriveNode | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void drive.drive.get(fileId).then((n) => {
      if (cancelled) return;
      if (!n) return setMissing(true);
      setNode(n);
      void drive.drive.activity(n.id).then((e) => !cancelled && setEvents(e));
      void drive.drive.comments(n.id).then((c) => !cancelled && setComments(c));
    });
    return () => {
      cancelled = true;
    };
  }, [fileId, drive.drive, drive.revision]);

  if (missing) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="font-display text-[17px] font-semibold">That file is not here</p>
          <p className="text-[13px] text-muted-foreground">It may have been moved to trash.</p>
          <Button asChild variant="outline" className="mt-1">
            <Link href="/files">Back to My Files</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flex gap-4">
        <Skeleton className="h-[70vh] flex-1 rounded-lg" />
        <Skeleton className="hidden h-[70vh] w-80 rounded-lg xl:block" />
      </div>
    );
  }

  const { label } = specFor(node);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5 shadow-[var(--shadow-e1)]">
        <div className="flex min-w-0 items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={node.parentId ? `/files/${node.parentId}` : "/files"}>
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex min-w-0 items-center gap-2.5">
            <NodeIcon node={node} size="sm" />
            <h1 className="truncate font-display text-[15px] font-semibold tracking-tight">{node.name}</h1>
            <Badge variant="secondary" className="data shrink-0">
              {label}
              {node.meta?.width && ` · ${node.meta.width} × ${node.meta.height}`}
              {node.meta?.pages && ` · ${node.meta.pages} pages`}
              {` · ${formatBytes(node.sizeBytes)}`}
            </Badge>
          </div>
        </div>

        <div className="hidden items-center gap-0.5 rounded-md bg-muted p-1 lg:flex">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setZoom((z) => Math.max(25, z - 25))} aria-label="Zoom out">
            <Minus className="size-4" />
          </Button>
          <span className="data w-12 text-center font-medium">{zoom}%</span>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setZoom((z) => Math.min(250, z + 25))} aria-label="Zoom in">
            <Plus className="size-4" />
          </Button>
          <div className="mx-0.5 h-3.5 w-px bg-border" />
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Rotate">
            <RotateCw className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              setZoom(100);
              setRotation(0);
            }}
            aria-label="Reset view"
          >
            <Scan className="size-4" />
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm">
            <History className="size-4" />v{node.version}
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Downloads arrive with uploader-be")}>
            <Download className="size-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button size="sm" onClick={() => drive.openShare(node)}>
            <UserPlus className="size-4" />
            Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => drive.openRename(node)}>
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => drive.copyLink(node)}>
                <Copy className="size-4" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => drive.trash(node)}>
                <Trash2 className="size-4" />
                Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <Stage node={node} zoom={zoom} rotation={rotation} onReset={() => { setZoom(100); setRotation(0); }} />
        <Inspector node={node} events={events} comments={comments} />
      </div>
    </div>
  );
}

function Stage({
  node,
  zoom,
  rotation,
  onReset,
}: {
  node: DriveNode;
  zoom: number;
  rotation: number;
  onReset: () => void;
}) {
  const { Icon } = specFor(node);
  return (
    <div className="relative flex h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-lg border border-border bg-background p-6 shadow-[var(--shadow-e1)] xl:col-span-8 2xl:col-span-9">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(#0f172a 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <div
          className="transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
        >
          {/* No preview pipeline yet: a faithful placeholder beats a broken
              <img>. Swap for node.thumbnailUrl when the worker lands. */}
          <div className="grid h-[420px] w-[600px] max-w-[80vw] place-items-center rounded-lg border border-border bg-card shadow-[var(--shadow-e2)]">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Icon className="size-12" strokeWidth={1.25} />
              <p className="data">Preview renders once uploader-be stores the bytes</p>
              {node.meta?.durationSec && (
                <Badge variant="secondary" className="data">
                  {clockDuration(node.meta.durationSec)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-auto flex items-center gap-3 rounded-full border border-border bg-card/90 px-3 py-1.5 backdrop-blur">
        <span className="data text-muted-foreground">
          {node.meta?.pages ? `Page 1 of ${node.meta.pages}` : "Single asset"}
        </span>
        <span className="h-3 w-px bg-border" />
        <button onClick={onReset} className="label-sm flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <Maximize2 className="size-3.5" />
          Zoom fit
        </button>
      </div>
    </div>
  );
}

function Inspector({
  node,
  events,
  comments,
}: {
  node: DriveNode;
  events: ActivityEvent[];
  comments: Comment[];
}) {
  const drive = useDrive();

  return (
    <aside className="flex h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-e1)] xl:col-span-4 2xl:col-span-3">
      <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1">
            Details
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 gap-1.5">
            Activity
            <Badge variant="secondary" className="data px-1.5">
              {events.length + comments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 min-h-0 flex-1 overflow-y-auto scroll-slim pr-1">
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-2.5 rounded-md bg-muted p-3">
              <div className="flex items-center justify-between">
                <h3 className="label-sm uppercase tracking-wider text-muted-foreground">Who has access</h3>
                <button onClick={() => drive.openShare(node)} className="label-sm font-medium hover:underline">
                  Manage
                </button>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="flex -space-x-2">
                  {collaborators(node).slice(0, 4).map((s) => (
                    <Avatar key={s.user.id} className="size-7 ring-2 ring-card">
                      <AvatarFallback className="label-sm bg-secondary">{initials(s.user.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {collaborators(node).length === 0 && (
                    <span className="text-[13px] text-muted-foreground">Only you</span>
                  )}
                </span>
                {collaborators(node).length > 0 && (
                  <span className="data text-muted-foreground">
                    {collaborators(node).length}{" "}
                    {collaborators(node).length === 1 ? "person" : "people"}
                  </span>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="label-sm uppercase tracking-wider text-muted-foreground">File information</h3>
              <dl className="flex flex-col gap-2.5 text-[13px]">
                <Row label="Type" value={node.contentType} />
                {node.meta?.width && <Row label="Dimensions" value={`${node.meta.width} × ${node.meta.height} px`} mono />}
                {node.meta?.pages && <Row label="Pages" value={String(node.meta.pages)} mono />}
                {node.meta?.durationSec && <Row label="Duration" value={clockDuration(node.meta.durationSec)} mono />}
                <Row label="Size" value={`${formatBytes(node.sizeBytes, true)} (${node.sizeBytes.toLocaleString()} bytes)`} mono />
                <Row label="Version" value={`v${node.version}`} mono />
                <Row label="Created" value={formatWhen(node.createdAt)} mono />
                <Row label="Modified" value={formatWhen(node.modifiedAt)} mono />
              </dl>

              {node.sha256 && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="label-sm text-muted-foreground">SHA-256</span>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(node.sha256!);
                      toast.success("Checksum copied");
                    }}
                    className="data flex items-center justify-between gap-2 rounded bg-muted px-2.5 py-1.5 text-left text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="truncate">{node.sha256.slice(0, 32)}…</span>
                    <Copy className="size-3.5 shrink-0" />
                  </button>
                </div>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4 min-h-0 flex-1 overflow-y-auto scroll-slim pr-1">
          <ol className="relative flex flex-col gap-4 pl-1">
            <span aria-hidden className="absolute bottom-2 left-[9px] top-2 w-px bg-border" />
            {[...comments.map(toEntry), ...events.map(toEntry)].map((e) => (
              <li key={e.id} className="relative flex items-start gap-2.5">
                <Avatar className="z-10 size-5 ring-2 ring-card">
                  <AvatarFallback className="label-sm bg-secondary text-[8px]">
                    {initials(e.who)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[13px]">
                    <span className="font-medium">{e.who}</span> {e.text}
                  </p>
                  <span className="label-sm text-muted-foreground">{formatWhen(e.at)}</span>
                </div>
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={() => toast.info("Move arrives with uploader-be")}>
          <Move className="size-3.5" />
          Move
        </Button>
        <Button variant="outline" size="sm" onClick={() => drive.openRename(node)}>
          <Pencil className="size-3.5" />
          Rename
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[#fca5a5] bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] hover:text-[#dc2626]"
          onClick={() => drive.trash(node)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>
    </aside>
  );
}

function toEntry(e: ActivityEvent | Comment) {
  if ("verb" in e) {
    const text =
      e.verb === "uploaded"
        ? `uploaded ${e.detail ?? "a new version"}`
        : e.verb === "commented"
          ? "left a comment"
          : `${e.verb} this file`;
    return { id: e.id, who: e.actor.name, text, at: e.at };
  }
  return { id: e.id, who: e.author.name, text: `“${e.body}”`, at: e.at };
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={mono ? "data text-right" : "truncate text-right font-medium"} title={value}>
        {value}
      </dd>
    </div>
  );
}

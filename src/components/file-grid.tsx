"use client";

import { Lock, Play, Star, Users } from "lucide-react";
import { NodeIcon, specFor } from "@/components/file-icon";
import { RowMenu, type RowActions } from "@/components/file-list";
import { Button } from "@/components/ui/button";
import { clockDuration, formatBytes, formatWhen } from "@/lib/format";
import { collaborators } from "@/lib/nodes";
import type { DriveNode } from "@/lib/types";

interface Props extends RowActions {
  folders: DriveNode[];
  files: DriveNode[];
  selected: Set<string>;
  onSelect: (id: string, on: boolean) => void;
}

export function FolderCards({
  folders,
  ...a
}: { folders: DriveNode[] } & RowActions) {
  if (folders.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {folders.map((f) => (
        <div
          key={f.id}
          onDoubleClick={() => a.onOpen(f)}
          className="group flex cursor-pointer flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-e1)] transition-all hover:border-[var(--hairline)] hover:shadow-[var(--shadow-e2)]"
        >
          <div className="flex items-start justify-between gap-3">
            <NodeIcon node={f} size="lg" />
            <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <RowMenu node={f} {...a} />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={() => a.onOpen(f)}
              className="block w-full truncate text-left font-display text-[15px] font-semibold tracking-tight hover:underline"
              title={f.name}
            >
              {f.name}
            </button>
            <p className="data mt-0.5 text-muted-foreground">
              {f.subtreeFiles ?? 0} files
              <span className="mx-1.5 text-border">·</span>
              {formatBytes(f.subtreeBytes ?? 0)}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5">
            {collaborators(f).length > 0 ? (
              <>
                <span className="flex -space-x-1.5">
                  {collaborators(f).slice(0, 3).map((s) => (
                    <span
                      key={s.user.id}
                      title={s.user.name}
                      className="label-sm grid size-5 place-items-center rounded-full bg-secondary text-[9px] ring-2 ring-card"
                    >
                      {s.user.name[0]}
                    </span>
                  ))}
                </span>
                <span className="label-sm flex items-center gap-1 text-muted-foreground">
                  <Users className="size-3" />
                  Shared
                </span>
              </>
            ) : (
              <>
                <span className="label-sm text-muted-foreground">Private</span>
                <Lock className="size-3 text-muted-foreground" />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FileGrid({ folders, files, selected, onSelect, ...a }: Props) {
  return (
    <div className="flex flex-col gap-8">
      {folders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="label-sm uppercase tracking-wider text-muted-foreground">Folders</h2>
          <FolderCards folders={folders} {...a} />
        </section>
      )}

      {files.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="label-sm uppercase tracking-wider text-muted-foreground">Files</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {files.map((f) => {
              const { label } = specFor(f);
              const isSelected = selected.has(f.id);
              return (
                <div
                  key={f.id}
                  onDoubleClick={() => a.onOpen(f)}
                  onClick={() => onSelect(f.id, !isSelected)}
                  data-selected={isSelected || undefined}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-e1)] transition-all hover:border-[var(--hairline)] hover:shadow-[var(--shadow-e2)] data-[selected]:border-primary data-[selected]:bg-background"
                >
                  <Thumb node={f} label={label} />

                  <div className="flex flex-col gap-1 p-3.5">
                    <div className="flex items-start justify-between gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          a.onOpen(f);
                        }}
                        className="min-w-0 truncate text-left font-display text-[14px] font-semibold tracking-tight hover:underline"
                        title={f.name}
                      >
                        {f.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="-mr-1 -mt-1 size-6 shrink-0 text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          a.onStar(f);
                        }}
                        aria-label={f.starred ? `Unstar ${f.name}` : `Star ${f.name}`}
                        aria-pressed={f.starred}
                      >
                        <Star className="size-3.5" fill={f.starred ? "currentColor" : "none"} />
                      </Button>
                    </div>
                    <div className="data flex items-center justify-between pt-1 text-muted-foreground">
                      <span>{metaLine(f)}</span>
                      <span>{formatWhen(f.modifiedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function metaLine(f: DriveNode): string {
  if (f.meta?.pages) return `${f.meta.pages} pages · ${formatBytes(f.sizeBytes)}`;
  if (f.meta?.width) return `${f.meta.width}×${f.meta.height}`;
  return formatBytes(f.sizeBytes);
}

/**
 * No thumbnail pipeline exists yet, so tiles render a typographic stand-in
 * rather than a broken image. Swap for <img src={node.thumbnailUrl}> once
 * the derivative worker lands.
 */
function Thumb({ node, label }: { node: DriveNode; label: string }) {
  const isVideo = node.contentType.startsWith("video/");

  return (
    <div className="relative flex h-36 items-center justify-center overflow-hidden border-b border-border bg-background">
      <span className="label-sm absolute left-2 top-2 rounded bg-card/90 px-1.5 py-0.5 backdrop-blur">
        {label}
      </span>

      {isVideo ? (
        <>
          <span className="grid size-10 place-items-center rounded-full bg-card text-foreground shadow-[var(--shadow-e2)] transition-transform group-hover:scale-110">
            <Play className="size-5" fill="currentColor" />
          </span>
          {node.meta?.durationSec ? (
            <span className="data absolute bottom-2 right-2 rounded bg-foreground/80 px-1.5 py-0.5 text-[11px] text-background">
              {clockDuration(node.meta.durationSec)}
            </span>
          ) : null}
        </>
      ) : (
        <span className="flex h-28 w-24 flex-col justify-between rounded border border-border bg-card p-2.5 shadow-[var(--shadow-e1)]">
          <NodeIcon node={node} size="sm" />
          <span className="flex flex-col gap-1">
            <span className="h-1 w-full rounded bg-muted" />
            <span className="h-1 w-4/5 rounded bg-muted" />
            <span className="h-1 w-2/3 rounded bg-background" />
          </span>
        </span>
      )}
    </div>
  );
}

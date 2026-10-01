"use client";

import { Check, ChevronDown, ChevronUp, Pause, Play, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatDuration } from "@/lib/format";
import type { Snapshot } from "@/upload/types";

interface Props {
  snapshot: Snapshot;
  destination: string;
  onPause: () => void;
  onResume: () => void;
  onDismiss: () => void;
}

export function UploadTray({ snapshot, destination, onPause, onResume, onDismiss }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const pct = snapshot.totalBytes > 0 ? (snapshot.uploadedBytes / snapshot.totalBytes) * 100 : 0;
  const active = snapshot.tasks.filter((t) => t.status === "uploading");
  const queued = snapshot.tasks.filter((t) => t.status === "pending");
  const problems = snapshot.tasks.filter((t) => t.status === "error" || t.status === "conflict");
  const finished = !snapshot.running && snapshot.doneCount === snapshot.tasks.length;

  return (
    <div className="fixed bottom-5 right-6 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[var(--hairline)] bg-card shadow-[var(--shadow-e3)]">
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] font-semibold tracking-tight">
            {finished
              ? `Uploaded ${snapshot.doneCount} ${snapshot.doneCount === 1 ? "file" : "files"}`
              : snapshot.running
                ? `Uploading ${Math.min(snapshot.doneCount + 1, snapshot.tasks.length)} of ${snapshot.tasks.length}`
                : "Upload paused"}
          </p>
          <p className="data truncate text-muted-foreground">{destination}</p>
        </div>

        {finished ? (
          <Badge variant="secondary" className="label-sm gap-1">
            <Check className="size-3" />
            Done
          </Badge>
        ) : (
          <Badge variant="secondary" className="data">
            {pct.toFixed(0)}%
          </Badge>
        )}

        {!finished &&
          (snapshot.running ? (
            <Button variant="ghost" size="icon" className="size-7" onClick={onPause} aria-label="Pause upload">
              <Pause className="size-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="size-7" onClick={onResume} aria-label="Resume upload">
              <Play className="size-4" />
            </Button>
          ))}

        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand upload tray" : "Collapse upload tray"}
        >
          {collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>

        {!snapshot.running && (
          <Button variant="ghost" size="icon" className="size-7" onClick={onDismiss} aria-label="Dismiss">
            <X className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-3">
        <Progress value={pct} className="h-1" aria-label="Overall upload progress" />
        <div className="data flex items-center justify-between gap-4 text-muted-foreground">
          <span>
            {formatBytes(snapshot.uploadedBytes)} / {formatBytes(snapshot.totalBytes)}
          </span>
          <span>
            {snapshot.running
              ? `${formatBytes(snapshot.bytesPerSecond)}/s · ${formatDuration(snapshot.etaSeconds)} left`
              : `${snapshot.doneCount}/${snapshot.tasks.length} files`}
          </span>
        </div>

        {(snapshot.skippedCount > 0 || problems.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {snapshot.skippedCount > 0 && (
              <Badge variant="secondary" className="label-sm">
                {snapshot.skippedCount} already there
              </Badge>
            )}
            {problems.length > 0 && (
              <Badge variant="destructive" className="label-sm">
                {problems.length} failed
              </Badge>
            )}
          </div>
        )}
      </div>

      {!collapsed && (active.length > 0 || problems.length > 0 || queued.length > 0) && (
        <div className="max-h-56 overflow-y-auto scroll-slim border-t border-border">
          {active.map((t) => (
            <div key={t.relPath} className="flex items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px]" title={t.relPath}>
                {t.relPath}
              </span>
              <span className="data shrink-0 text-muted-foreground">
                {t.size > 0 ? Math.floor((t.uploaded / t.size) * 100) : 100}%
              </span>
            </div>
          ))}
          {queued.slice(0, 4).map((t) => (
            <div key={t.relPath} className="flex items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground" title={t.relPath}>
                {t.relPath}
              </span>
              <span className="data shrink-0 text-muted-foreground">Queued</span>
            </div>
          ))}
          {problems.slice(0, 20).map((t) => (
            <div key={t.relPath} className="px-4 py-2">
              <p className="truncate text-[13px]" title={t.relPath}>
                {t.relPath}
              </p>
              <p className="data text-destructive">{t.error}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { Archive, CloudCheck, Copy, FolderOpen, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDrive } from "@/components/drive-shell";
import { NodeIcon } from "@/components/file-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/format";
import type { CategoryUsage, DriveNode, Quota } from "@/lib/types";

/** Ordered darkest→lightest so the bar reads as a single ramp, not a rainbow.
    The spec keeps colour functional; these are neutrals, not hues. */
const RAMP = ["#0f172a", "#475569", "#64748b", "#94a3b8", "#cbd5e1"];

export function StorageView() {
  const drive = useDrive();
  const [quota, setQuota] = useState<Quota | null>(null);
  const [usage, setUsage] = useState<CategoryUsage[] | null>(null);
  const [largest, setLargest] = useState<DriveNode[] | null>(null);
  const [trashed, setTrashed] = useState<DriveNode[]>([]);

  useEffect(() => {
    void drive.drive.quota().then(setQuota);
    void drive.drive.usageByCategory().then(setUsage);
    void drive.drive.largestFiles(5).then(setLargest);
    void drive.drive.trashed().then(setTrashed);
  }, [drive.drive, drive.revision]);

  const pct = quota ? (quota.usedBytes / quota.quotaBytes) * 100 : 0;
  const free = quota ? quota.quotaBytes - quota.usedBytes : 0;
  const totalUsage = usage?.reduce((a, u) => a + u.bytes, 0) ?? 0;
  const trashBytes = trashed.reduce((a, n) => a + n.sizeBytes, 0);
  const top5 = largest?.reduce((a, n) => a + n.sizeBytes, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight">Storage & analytics</h1>
          <p className="mt-0.5 max-w-2xl text-[14px] text-muted-foreground">
            Where your space is going, and what you could reclaim.
          </p>
        </div>
        <Button onClick={() => toast.info("Plans arrive with billing")}>
          <Sparkles className="size-4" />
          Upgrade plan
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <Label>Used storage</Label>
          {quota ? (
            <>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="data text-[28px] font-semibold leading-none tracking-tight">
                  {formatBytes(quota.usedBytes)}
                </span>
                <span className="text-[15px] text-muted-foreground">
                  of {formatBytes(quota.quotaBytes)}
                </span>
              </p>
              <div className="mt-5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted p-0.5">
                {usage?.map((u, i) => (
                  <span
                    key={u.key}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${totalUsage > 0 ? (u.bytes / totalUsage) * 100 : 0}%`,
                      background: RAMP[i % RAMP.length],
                    }}
                    title={`${u.label}: ${formatBytes(u.bytes)}`}
                  />
                ))}
              </div>
              <p className="data mt-2 text-muted-foreground">{pct.toFixed(1)}% of your plan</p>
            </>
          ) : (
            <Skeleton className="mt-2 h-16 w-full" />
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <Label>Remaining</Label>
              <p className="data mt-1 text-[28px] font-semibold leading-none tracking-tight">
                {quota ? formatBytes(free) : "—"}
              </p>
            </div>
            <span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground">
              <CloudCheck className="size-4" />
            </span>
          </div>
          <p className="mt-5 text-[13px] text-muted-foreground">
            {largest?.[0] ? (
              <>
                Room for about{" "}
                <span className="font-medium text-foreground">
                  {Math.floor(free / largest[0].sizeBytes).toLocaleString()}
                </span>{" "}
                more files the size of {largest[0].name.split(".")[0]}.
              </>
            ) : (
              "Nothing stored yet — the whole plan is free."
            )}
          </p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <Label>Total items</Label>
              <p className="data mt-1 text-[28px] font-semibold leading-none tracking-tight">
                {quota ? quota.fileCount.toLocaleString() : "—"}
              </p>
            </div>
            <span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground">
              <FolderOpen className="size-4" />
            </span>
          </div>
          <p className="mt-5 text-[13px] text-muted-foreground">
            Across{" "}
            <span className="font-medium text-foreground">{quota?.folderCount ?? "—"}</span> folders.
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-[15px] font-semibold tracking-tight">Breakdown by type</h2>
            <p className="text-[13px] text-muted-foreground">What is actually taking the room.</p>
          </div>
        </div>

        {usage ? (
          <>
            <div className="mb-6 flex h-3 gap-1 overflow-hidden rounded-full bg-muted p-0.5">
              {usage.map((u, i) => (
                <span
                  key={u.key}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                  style={{
                    width: `${totalUsage > 0 ? (u.bytes / totalUsage) * 100 : 0}%`,
                    background: RAMP[i % RAMP.length],
                  }}
                  title={`${u.label}: ${formatBytes(u.bytes)}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {usage.map((u, i) => (
                <div key={u.key} className="flex flex-col gap-1 rounded-md bg-muted p-3">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: RAMP[i % RAMP.length] }} />
                    <span className="label-md truncate">{u.label}</span>
                  </span>
                  <span className="flex items-baseline justify-between">
                    <span className="data text-[15px] font-semibold">{formatBytes(u.bytes)}</span>
                    <span className="data text-muted-foreground">
                      {totalUsage > 0 ? ((u.bytes / totalUsage) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Skeleton className="h-32 w-full" />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-[15px] font-semibold tracking-tight">Largest files</h2>
              <p className="text-[13px] text-muted-foreground">Sorted by what they actually occupy.</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {largest?.map((n, i) => (
              <div
                key={n.id}
                className="group flex items-center justify-between gap-3 rounded-md p-2.5 transition-colors hover:bg-muted"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="data w-4 text-center text-muted-foreground">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>
                  <NodeIcon node={n} size="sm" />
                  <button
                    onClick={() => drive.open(n)}
                    className="min-w-0 truncate text-left text-[14px] font-medium hover:underline"
                  >
                    {n.name}
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="data w-20 text-right font-medium">{formatBytes(n.sizeBytes)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    aria-label={`Move ${n.name} to trash`}
                    onClick={() => drive.trash(n)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )) ?? <Skeleton className="h-40 w-full" />}
          </div>

          {largest && quota && (
            <p className="data mt-4 flex items-center justify-between border-t border-border pt-3 text-muted-foreground">
              <span>
                Combined: <span className="font-medium text-foreground">{formatBytes(top5)}</span>
              </span>
              <span>{((top5 / quota.usedBytes) * 100).toFixed(1)}% of everything you store</span>
            </p>
          )}
        </Card>

        <Card className="lg:col-span-4">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            <h2 className="font-display text-[15px] font-semibold tracking-tight">Reclaim space</h2>
          </div>
          <p className="mb-4 text-[13px] text-muted-foreground">
            {trashBytes > 0
              ? `Up to ${formatBytes(trashBytes)} sitting in trash.`
              : "Nothing obvious to clean up right now."}
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5 rounded-md bg-muted p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="label-md">In trash</p>
                  <p className="text-[13px] text-muted-foreground">
                    {trashed.length} {trashed.length === 1 ? "item" : "items"} · {formatBytes(trashBytes)}
                  </p>
                </div>
                {trashed.length > 0 && (
                  <Badge variant="secondary" className="label-sm shrink-0">
                    14d left
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={trashed.length === 0}
                onClick={() => drive.open({ id: "", kind: "folder" } as DriveNode)}
                asChild={trashed.length > 0}
              >
                {trashed.length > 0 ? <a href="/trash">Review trash</a> : <span>Trash is empty</span>}
              </Button>
            </div>

            <div className="flex flex-col gap-2.5 rounded-md bg-muted p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="label-md">Possible duplicates</p>
                  <p className="text-[13px] text-muted-foreground">Matched on content hash</p>
                </div>
                <Badge variant="secondary" className="label-sm shrink-0">
                  <Copy className="size-3" />
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Needs checksums from uploader-be
              </Button>
            </div>

            <div className="flex flex-col gap-2.5 rounded-md bg-muted p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="label-md">Untouched over a year</p>
                  <p className="text-[13px] text-muted-foreground">Move to cold storage</p>
                </div>
                <Badge variant="secondary" className="label-sm shrink-0">
                  <Archive className="size-3" />
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Needs access history
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-e1)] ${className}`}>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="label-sm uppercase tracking-wider text-muted-foreground">{children}</h3>;
}

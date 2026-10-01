"use client";

import { Clock, RotateCcw, Star, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDrive } from "@/components/drive-shell";
import { FileList } from "@/components/file-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DriveNode } from "@/lib/types";

type Kind = "recent" | "starred" | "shared" | "trash";

const COPY: Record<Kind, { title: string; blurb: string; empty: string; Icon: typeof Clock }> = {
  recent: {
    title: "Recent",
    blurb: "Files you opened or changed lately.",
    empty: "Nothing opened yet. Files show up here as you work.",
    Icon: Clock,
  },
  starred: {
    title: "Starred",
    blurb: "The things you come back to.",
    empty: "Star a file and it will wait for you here.",
    Icon: Star,
  },
  shared: {
    title: "Shared with me",
    blurb: "Files other people gave you access to.",
    empty: "Nothing shared with you yet.",
    Icon: Users,
  },
  trash: {
    title: "Trash",
    blurb: "Items are deleted for good after 14 days.",
    empty: "Trash is empty.",
    Icon: Trash2,
  },
};

export function CollectionView({ kind }: { kind: Kind }) {
  const drive = useDrive();
  const [nodes, setNodes] = useState<DriveNode[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { title, blurb, empty, Icon } = COPY[kind];

  useEffect(() => {
    let cancelled = false;
    setNodes(null);
    const load =
      kind === "recent"
        ? drive.drive.recent()
        : kind === "starred"
          ? drive.drive.starred()
          : kind === "shared"
            ? drive.drive.sharedWithMe()
            : drive.drive.trashed();
    void load.then((n) => {
      if (!cancelled) {
        setNodes(n);
        setSelected(new Set());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [kind, drive.drive, drive.revision]);

  const actions = {
    onOpen: drive.open,
    onStar: drive.star,
    onShare: drive.openShare,
    onRename: drive.openRename,
    onTrash: drive.trash,
    onCopyLink: drive.copyLink,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight">{title}</h1>
          <p className="mt-0.5 text-[14px] text-muted-foreground">{blurb}</p>
        </div>

        {kind === "trash" && nodes && nodes.length > 0 && (
          <Button
            variant="outline"
            onClick={async () => {
              await drive.drive.restore(nodes.map((n) => n.id));
              drive.refresh();
              toast.success("Everything restored");
            }}
          >
            <RotateCcw className="size-4" />
            Restore all
          </Button>
        )}
      </div>

      {nodes === null ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-md" />
          ))}
        </div>
      ) : nodes.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-[var(--hairline)] bg-card py-20 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-5" />
            </span>
            <p className="text-[13px] text-muted-foreground">{empty}</p>
          </div>
        </div>
      ) : (
        <FileList
          nodes={nodes}
          selected={selected}
          onSelect={(id, on) =>
            setSelected((s) => {
              const next = new Set(s);
              on ? next.add(id) : next.delete(id);
              return next;
            })
          }
          onSelectAll={(on) => setSelected(on ? new Set(nodes.map((n) => n.id)) : new Set())}
          showOwner={kind !== "trash"}
          {...actions}
        />
      )}
    </div>
  );
}

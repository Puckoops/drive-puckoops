"use client";

import {
  Download,
  Link2,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NodeIcon, specFor } from "@/components/file-icon";
import { useDrive } from "@/components/drive-shell";
import { formatBytes, formatWhen, initials } from "@/lib/format";
import type { DriveNode } from "@/lib/types";

export interface RowActions {
  onOpen: (n: DriveNode) => void;
  onStar: (n: DriveNode) => void;
  onShare: (n: DriveNode) => void;
  onRename: (n: DriveNode) => void;
  onTrash: (n: DriveNode) => void;
  onCopyLink: (n: DriveNode) => void;
}

interface Props extends RowActions {
  nodes: DriveNode[];
  selected: Set<string>;
  onSelect: (id: string, on: boolean) => void;
  onSelectAll: (on: boolean) => void;
  showOwner?: boolean;
}

function ownerOf(n: DriveNode, me: { id: string; name: string } | undefined) {
  // The row already appends "(me)", so this has to be the actual name.
  if (me && n.ownerId === me.id) return { name: me.name, isMe: true };
  // The service puts the owner in sharedWith with role "owner", so a file
  // somebody shared still shows a name rather than an id.
  const entry = n.sharedWith.find((s) => s.role === "owner");
  return { name: entry?.user.name ?? "Someone", isMe: false };
}

export function FileList({
  nodes,
  selected,
  onSelect,
  onSelectAll,
  showOwner = true,
  ...actions
}: Props) {
  const { me } = useDrive();
  const allOn = nodes.length > 0 && nodes.every((n) => selected.has(n.id));

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-e1)]">
      <div className="grid grid-cols-12 items-center gap-3 border-b border-border bg-muted px-4 py-2.5">
        <div className="col-span-6 flex items-center gap-3 sm:col-span-5">
          <Checkbox
            checked={allOn}
            onCheckedChange={(v) => onSelectAll(Boolean(v))}
            aria-label="Select all"
          />
          <span className="label-sm uppercase tracking-wider text-muted-foreground">Name</span>
        </div>
        {showOwner && (
          <span className="label-sm hidden uppercase tracking-wider text-muted-foreground sm:col-span-3 sm:block">
            Owner
          </span>
        )}
        <span className="label-sm col-span-4 uppercase tracking-wider text-muted-foreground sm:col-span-2">
          Modified
        </span>
        <span className="label-sm hidden text-right uppercase tracking-wider text-muted-foreground sm:col-span-1 sm:block">
          Size
        </span>
        <span className="sr-only col-span-2 sm:col-span-1">Actions</span>
      </div>

      <div>
        {nodes.map((n) => {
          const { label } = specFor(n);
          const owner = ownerOf(n, me ?? undefined);
          const isSelected = selected.has(n.id);
          return (
            <div
              key={n.id}
              onDoubleClick={() => actions.onOpen(n)}
              data-selected={isSelected || undefined}
              className="group grid grid-cols-12 items-center gap-3 border-b border-[#f1f5f9] px-4 py-2 transition-colors last:border-b-0 hover:bg-[#f8fafc] data-[selected]:bg-background"
            >
              <div className="col-span-6 flex min-w-0 items-center gap-3 sm:col-span-5">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(v) => onSelect(n.id, Boolean(v))}
                  aria-label={`Select ${n.name}`}
                />
                <NodeIcon node={n} size="sm" />
                <button
                  onClick={() => actions.onOpen(n)}
                  className="min-w-0 flex-1 truncate text-left text-[14px] font-medium hover:underline"
                  title={n.name}
                >
                  {n.name}
                </button>
                {n.kind === "file" && (
                  <span className="label-sm hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-muted-foreground md:inline">
                    {label}
                  </span>
                )}
              </div>

              {showOwner && (
                <div className="hidden min-w-0 items-center gap-2 sm:col-span-3 sm:flex">
                  <Avatar className="size-5">
                    <AvatarFallback className="label-sm bg-secondary text-[9px]">
                      {initials(owner.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-[13px]">
                    {owner.name}
                    {owner.isMe && <span className="ml-1 text-muted-foreground">(me)</span>}
                  </span>
                </div>
              )}

              <span className="data col-span-4 truncate text-muted-foreground sm:col-span-2">
                {formatWhen(n.modifiedAt)}
              </span>

              <span className="data hidden text-right text-muted-foreground sm:col-span-1 sm:block">
                {n.kind === "folder" ? "—" : formatBytes(n.sizeBytes)}
              </span>

              <div className="col-span-2 flex items-center justify-end gap-0.5 sm:col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={
                    n.starred
                      ? "size-7 text-foreground"
                      : "size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  }
                  onClick={() => actions.onStar(n)}
                  aria-label={n.starred ? `Unstar ${n.name}` : `Star ${n.name}`}
                  aria-pressed={n.starred}
                >
                  <Star className="size-4" fill={n.starred ? "currentColor" : "none"} />
                </Button>
                <RowMenu node={n} {...actions} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RowMenu({ node, ...a }: { node: DriveNode } & RowActions) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" aria-label={`Actions for ${node.name}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => a.onShare(node)}>
          <UserPlus className="size-4" />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => a.onCopyLink(node)}>
          <Link2 className="size-4" />
          Copy link
        </DropdownMenuItem>
        {node.kind === "file" && (
          <DropdownMenuItem onSelect={() => a.onOpen(node)}>
            <Download className="size-4" />
            Open preview
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => a.onRename(node)}>
          <Pencil className="size-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => a.onTrash(node)}>
          <Trash2 className="size-4" />
          Move to trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

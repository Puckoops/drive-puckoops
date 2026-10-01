"use client";

import {
  ChevronsUpDown,
  Clock,
  FolderPlus,
  Folder,
  Plus,
  Settings,
  Star,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { formatBytes, initials } from "@/lib/format";
import type { Quota } from "@/lib/types";

const NAV = [
  { href: "/files", label: "My Files", icon: Folder },
  { href: "/recent", label: "Recent", icon: Clock },
  { href: "/starred", label: "Starred", icon: Star },
  { href: "/shared", label: "Shared", icon: Users },
  { href: "/trash", label: "Trash", icon: Trash2 },
];

interface Props {
  user: { name: string; email: string };
  quota: Quota | null;
  onNewFolder: () => void;
  onUploadFiles: () => void;
  onUploadFolder: () => void;
  onSignOut: () => void;
}

export function AppSidebar({
  user,
  quota,
  onNewFolder,
  onUploadFiles,
  onUploadFolder,
  onSignOut,
}: Props) {
  const pathname = usePathname();
  const pct = quota ? (quota.usedBytes / quota.quotaBytes) * 100 : 0;

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-60 flex-col justify-between border-r border-border bg-card p-4">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between px-2 pt-1">
          <Link href="/files" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-md bg-foreground text-[13px] font-semibold text-background"
            >
              P
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">Puckoops</span>
          </Link>
          <span className="label-sm rounded-md border border-border bg-muted px-1.5 py-0.5 text-muted-foreground">
            v2.4
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full justify-between px-3.5" size="sm">
              <span className="flex items-center gap-2">
                <Plus className="size-4" />
                New
              </span>
              <ChevronsUpDown className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onSelect={onNewFolder}>
              <FolderPlus className="size-4" />
              New folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onUploadFiles}>
              <Upload className="size-4" />
              File upload
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onUploadFolder}>
              <Folder className="size-4" />
              Folder upload
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "flex items-center gap-3 rounded-md bg-secondary px-3 py-2 font-medium text-foreground"
                    : "flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                }
              >
                <Icon className="size-4 shrink-0" />
                <span className="text-[14px]">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        <div className="h-px bg-border" />

        <Link href="/storage" className="group flex flex-col gap-2 px-2">
          <div className="flex items-center justify-between">
            <span className="label-sm uppercase tracking-wider text-muted-foreground">Storage</span>
            <span className="data font-medium text-foreground">{pct.toFixed(1)}%</span>
          </div>
          <Progress value={pct} className="h-1" aria-label="Storage used" />
          <div className="flex items-center justify-between pt-0.5">
            <span className="data text-muted-foreground">
              {quota ? `${formatBytes(quota.usedBytes)} of ${formatBytes(quota.quotaBytes)}` : "—"}
            </span>
            <span className="label-sm text-foreground group-hover:underline">Manage</span>
          </div>
        </Link>

        <div className="h-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarFallback className="label-sm bg-secondary text-foreground">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-col">
                  <span className="label-md truncate">{user.name}</span>
                  <span className="label-sm truncate text-muted-foreground">Pro Plan</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                <Settings className="size-4" />
                <ChevronsUpDown className="size-3.5" />
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="label-md">{user.name}</p>
              <p className="label-sm truncate text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/storage">Storage & usage</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

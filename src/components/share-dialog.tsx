"use client";

import { Check, Globe, Link2, Lock, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { NodeIcon } from "@/components/file-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { lookupPerson, searchPeople, type Person } from "@/lib/api";
import { initials } from "@/lib/format";
import type { DriveApi, DriveNode, Role } from "@/lib/types";

const ASSIGNABLE: Exclude<Role, "owner">[] = ["editor", "viewer"];
const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  editor: "Can edit",
  viewer: "Can view",
};

interface Props {
  node: DriveNode | null;
  drive: DriveApi;
  onClose: () => void;
  onChanged: (node: DriveNode) => void;
}

export function ShareDialog({ node, drive, onClose, onChanged }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "owner">>("editor");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // The token comes back once, when the link is created. A node fetched
  // later carries the link's role and expiry but never the secret again.
  const [token, setToken] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Person[]>([]);

  useEffect(() => {
    if (node) {
      setEmail("");
      setRole("editor");
      setCopied(false);
      setSuggestions([]);
    }
  }, [node]);

  useEffect(() => {
    const q = email.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void searchPeople(q, 5)
        .then((people) => !cancelled && setSuggestions(people))
        .catch(() => !cancelled && setSuggestions([]));
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [email]);

  if (!node) return null;

  const owner = node.sharedWith.find((s) => s.role === "owner");
  const others = node.sharedWith.filter((s) => s.role !== "owner");

  async function invite(address?: string) {
    const value = (address ?? email).trim();
    if (!value) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      toast.error("That does not look like an email address");
      return;
    }
    setBusy(true);
    try {
      // Confirm the address belongs to an account before granting anything.
      // Sharing with a typo silently is worse than refusing.
      const person = await lookupPerson(value);
      if (!person) {
        toast.error(`No Puckoops account for ${value}`, {
          description: "They need to sign up before you can share with them.",
        });
        return;
      }
      onChanged(
        await drive.share(
          node!.id,
          { id: person.id, name: person.name, email: person.email, avatarUrl: person.avatar_url },
          role,
        ),
      );
      setEmail("");
      setSuggestions([]);
      toast.success(`Shared with ${person.name}`);
    } catch {
      toast.error("Could not reach the directory");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!token) {
      toast.error("This link's address was only shown when it was created. Create a new one to get a fresh address.");
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not reach the clipboard");
    }
  }

  async function toggleLink() {
    try {
      const updated = await drive.setLinkShare(node!.id, node!.linkShare ? null : "viewer");
      setToken(updated.linkShare?.token ?? null);
      onChanged(updated);
      if (updated.linkShare?.token) {
        await navigator.clipboard
          .writeText(`${window.location.origin}/s/${updated.linkShare.token}`)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Link created and copied");
          })
          .catch(() => toast.success("Link created"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change the link");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <NodeIcon node={node} size="lg" />
            <div className="min-w-0">
              <DialogTitle className="truncate text-left">Share file</DialogTitle>
              <DialogDescription className="truncate text-left">{node.name}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void invite();
          }}
          className="flex items-center gap-1.5 rounded-lg bg-muted p-1.5 focus-within:bg-card focus-within:ring-[3px] focus-within:ring-ring/20"
        >
          <UserPlus className="ml-2 size-4 shrink-0 text-muted-foreground" />
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Add people by email…"
            aria-label="Invite by email"
            className="h-8 border-0 bg-transparent px-1.5 shadow-none focus-visible:ring-0"
          />
          <RolePicker value={role} onChange={setRole} />
          <Button type="submit" size="sm" disabled={busy || !email.trim()}>
            Invite
          </Button>
        </form>

        {suggestions.length > 0 && (
          <ul className="-mt-2 overflow-hidden rounded-lg border border-border">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => void invite(p.email)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="label-sm bg-secondary">
                      {initials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="label-md block truncate">{p.name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {p.email}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <section className="flex flex-col gap-2.5">
          <h3 className="label-sm uppercase tracking-wider text-muted-foreground">
            People with access
          </h3>

          <div className="flex flex-col gap-1">
            {owner && <PersonRow name={owner.user.name} email={owner.user.email} trailing={<span className="label-sm px-2 text-muted-foreground">Owner</span>} />}

            {others.map((s) => (
              <PersonRow
                key={s.user.id}
                name={s.user.name}
                email={s.user.email}
                trailing={
                  <div className="flex items-center gap-1">
                    <RolePicker
                      value={s.role as Exclude<Role, "owner">}
                      onChange={async (r) => onChanged(await drive.setRole(node.id, s.user.id, r))}
                      ghost
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${s.user.name}`}
                      onClick={async () => {
                        onChanged(await drive.unshare(node.id, s.user.id));
                        toast.success(`Removed ${s.user.name}`);
                      }}
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  </div>
                }
              />
            ))}

            {others.length === 0 && (
              <p className="px-2 py-3 text-[13px] text-muted-foreground">
                No one else has been added yet.
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="label-sm uppercase tracking-wider text-muted-foreground">General access</h3>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card shadow-[var(--shadow-e1)]">
                {node.linkShare ? <Globe className="size-4" /> : <Lock className="size-4" />}
              </span>
              <div className="min-w-0">
                <p className="label-md">
                  {node.linkShare ? "Anyone with the link" : "Restricted"}
                  {node.linkShare && (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      · {ROLE_LABEL[node.linkShare.role]}
                    </span>
                  )}
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {node.linkShare
                    ? "Anyone on the internet with the link can open this"
                    : "Only people added above can open this"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLink}
              >
                {node.linkShare ? "Restrict" : "Create link"}
              </Button>
              {node.linkShare && (
                <Button variant="outline" size="sm" onClick={copyLink}>
                  {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function PersonRow({
  name,
  email,
  trailing,
}: {
  name: string;
  email: string;
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className="label-sm bg-secondary">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="label-md truncate">{name}</p>
          <p className="truncate text-[13px] text-muted-foreground">{email}</p>
        </div>
      </div>
      {trailing}
    </div>
  );
}

function RolePicker({
  value,
  onChange,
  ghost,
}: {
  value: Exclude<Role, "owner">;
  onChange: (r: Exclude<Role, "owner">) => void;
  ghost?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={ghost ? "ghost" : "ghost"} size="sm" className="label-md shrink-0">
          {ROLE_LABEL[value]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ASSIGNABLE.map((r) => (
          <DropdownMenuItem key={r} onSelect={() => onChange(r)}>
            {ROLE_LABEL[r]}
            {r === value && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

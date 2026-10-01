"use client";

import { Cloud, Search, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchPeople, type Person } from "@/lib/api";
import { formatBytes, initials } from "@/lib/format";
import type { DriveNode } from "@/lib/types";

interface Props {
  title: string;
  user: { name: string };
  onSearch: (q: string) => Promise<DriveNode[]>;
  onOpen: (node: DriveNode) => void;
  onUploadFiles: () => void;
}

export function AppHeader({ title, user, onSearch, onOpen, onUploadFiles }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DriveNode[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setPeople([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setOpen(true);
    const t = setTimeout(async () => {
      // Files come from the Drive service, people from user-svc. A failing
      // directory must not blank out the file results, hence allSettled.
      const [files, found] = await Promise.allSettled([
        onSearch(query),
        searchPeople(query, 4),
      ]);
      if (cancelled) return;
      setResults(files.status === "fulfilled" ? files.value : []);
      setPeople(found.status === "fulfilled" ? found.value : []);
      setSearching(false);
    }, 140);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, onSearch]);

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="flex h-full items-center gap-6 px-6">
        <div className="flex min-w-44 items-center gap-2">
          <Cloud className="size-4 text-muted-foreground" />
          <span className="label-md text-muted-foreground">/</span>
          <span className="font-display text-[15px] font-medium">{title}</span>
        </div>

        <div ref={boxRef} className="relative mx-auto w-full max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search files, folders, people…"
            aria-label="Search"
            className="h-9 border-0 bg-muted pl-9 pr-16 shadow-none focus-visible:bg-card focus-visible:ring-[3px]"
          />
          <kbd className="label-sm pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ⌘ K
          </kbd>

          {open && query.trim() && (
            <div className="absolute left-0 right-0 top-11 overflow-hidden rounded-lg border border-[var(--hairline)] bg-popover shadow-[var(--shadow-e2)]">
              {searching && results.length === 0 && people.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                  Searching…
                </p>
              ) : results.length === 0 && people.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                  Nothing matches “{query}”.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto scroll-slim py-1">
                  {results.length > 0 && (
                    <>
                      <p className="label-sm px-4 py-1 uppercase tracking-wider text-muted-foreground">
                        Files
                      </p>
                      <ul>
                        {results.map((n) => (
                          <li key={n.id}>
                            <button
                              onClick={() => {
                                setOpen(false);
                                setQuery("");
                                onOpen(n);
                              }}
                              className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-muted"
                            >
                              <span className="truncate text-[13px]">{n.name}</span>
                              <span className="data shrink-0 text-muted-foreground">
                                {n.kind === "folder" ? "Folder" : formatBytes(n.sizeBytes)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {people.length > 0 && (
                    <>
                      <p className="label-sm px-4 py-1 pt-2 uppercase tracking-wider text-muted-foreground">
                        People
                      </p>
                      <ul>
                        {people.map((p) => (
                          <li key={p.id}>
                            <span className="flex w-full items-center gap-3 px-4 py-2">
                              <Avatar className="size-6">
                                <AvatarFallback className="label-sm bg-secondary text-[9px]">
                                  {initials(p.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px]">{p.name}</span>
                                <span className="block truncate text-[12px] text-muted-foreground">
                                  {p.email}
                                </span>
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button variant="outline" size="sm" onClick={onUploadFiles}>
            <Upload className="size-4" />
            Upload
          </Button>
          <div className="h-4 w-px bg-border" />
          <Avatar className="size-7">
            <AvatarFallback className="label-sm bg-secondary">{initials(user.name)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

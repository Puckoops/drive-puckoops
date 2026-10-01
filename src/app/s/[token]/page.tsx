"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NodeIcon, specFor } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import { DRIVE_BASE } from "@/lib/api";
import { formatBytes, formatWhen } from "@/lib/format";
import type { DriveNode } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ready"; node: DriveNode }
  | { kind: "gone"; message: string };

/**
 * Where a share link lands. No session required and none used: the token in
 * the URL is the whole credential, so this page deliberately does not go
 * through the authenticated client.
 */
export default function SharedPage() {
  const token = String(useParams().token ?? "");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "gone", message: "This link is missing its token." });
      return;
    }

    let cancelled = false;
    fetch(`${DRIVE_BASE}/links/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json || json.error) {
          setState({
            kind: "gone",
            message: json?.message ?? "This link is no longer available.",
          });
          return;
        }
        setState({ kind: "ready", node: json.data as DriveNode });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "gone", message: "Could not reach the server." });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-md bg-foreground text-sm font-semibold text-background"
          >
            P
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight">Puckoops</span>
        </div>

        {state.kind === "loading" && (
          <p className="text-[14px] text-muted-foreground">Opening…</p>
        )}

        {state.kind === "gone" && (
          <>
            <h1 className="text-[28px] leading-tight">This link isn&rsquo;t available</h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">{state.message}</p>
            <p className="mt-4 text-[13px] text-muted-foreground">
              Links can be turned off or expire. Ask whoever shared it for a new one.
            </p>
            <Button asChild variant="outline" className="mt-7 w-full">
              <Link href="/login">Sign in to Puckoops</Link>
            </Button>
          </>
        )}

        {state.kind === "ready" && (
          <>
            <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-e1)]">
              <div className="flex items-start gap-4">
                <NodeIcon node={state.node} size="lg" />
                <div className="min-w-0">
                  <h1 className="truncate text-[20px] leading-tight">{state.node.name}</h1>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {specFor(state.node).label}
                    {state.node.kind === "file" && ` · ${formatBytes(state.node.sizeBytes)}`}
                    {` · updated ${formatWhen(state.node.modifiedAt)}`}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-[13px] text-muted-foreground">
                {state.node.access === "editor"
                  ? "Anyone with this link can view and edit."
                  : "Anyone with this link can view."}
              </p>
            </div>

            {/* Downloading needs a session: a signed URL is issued to an
                identified caller, not to a link. */}
            <Button asChild className="mt-5 w-full">
              <Link href="/login">Sign in to open it</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

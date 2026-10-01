"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/api";

type State =
  | { kind: "working" }
  | { kind: "done"; name: string }
  | { kind: "failed"; message: string };

function Verify() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>({ kind: "working" });
  // Strict Mode mounts effects twice in development; without this the
  // request fires twice and the second response overwrites the first.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setState({ kind: "failed", message: "This link is missing its verification token." });
      return;
    }

    verifyEmail(token)
      .then((me) => setState({ kind: "done", name: me.name }))
      .catch((err) =>
        setState({
          kind: "failed",
          message:
            err instanceof Error ? err.message : "We could not confirm this link.",
        }),
      );
  }, [token]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-md bg-foreground text-sm font-semibold text-background"
          >
            P
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight">Puckoops</span>
        </div>

        {state.kind === "working" && (
          <>
            <h1 className="text-[28px] leading-tight">Confirming your email</h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">One moment.</p>
          </>
        )}

        {state.kind === "done" && (
          <>
            <h1 className="text-[28px] leading-tight">You&rsquo;re all set{state.name ? `, ${state.name}` : ""}</h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              Your email is confirmed and your drive is ready.
            </p>
            <Button asChild className="mt-7 w-full">
              <Link href="/login">Sign in</Link>
            </Button>
          </>
        )}

        {state.kind === "failed" && (
          <>
            <h1 className="text-[28px] leading-tight">This link didn&rsquo;t work</h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">{state.message}</p>
            <p className="mt-4 text-[13px] text-muted-foreground">
              Verification links expire after 24 hours. Sign in and we&rsquo;ll send a fresh one.
            </p>
            <Button asChild variant="outline" className="mt-7 w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  // useSearchParams needs a Suspense boundary or the whole route opts out of
  // static rendering at build time.
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}

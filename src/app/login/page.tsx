"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, login, resendVerification, signUp } from "@/lib/api";
import { WHO_ARE_YOU_LETTERING } from "./who-are-you-lettering";

// user-svc's sign-up rule, shared by every product's form.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phoneNumber: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set when the address is registered but unconfirmed. Holds the address so
  // "resend" does not depend on the field still being filled in.
  const [unverified, setUnverified] = useState<string | null>(null);
  // After signing up there is no session to go to — the link in the inbox is
  // the next step.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !PASSWORD_RULE.test(form.password)) {
      setError("Use at least 8 characters with an uppercase letter, a lowercase letter, a digit and a symbol.");
      return;
    }
    setBusy(true);
    setError(null);
    setUnverified(null);
    try {
      if (mode === "signup") {
        // Deliberately no login here. Signing in straight after signup is
        // what let people into the drive without ever opening the email.
        await signUp({ ...form, countryCode: "IN" });
        setSentTo(form.email);
        return;
      }
      await login(form.email, form.password);
      router.push("/files");
    } catch (err) {
      // 403 means the password was right and the address is not confirmed.
      if (err instanceof ApiError && err.status === 403) {
        setUnverified(form.email);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  }

  async function resend(email: string) {
    setBusy(true);
    try {
      await resendVerification(email);
      setResent(true);
    } catch {
      setError("Could not send a new link. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  // Signing up now ends here rather than in the drive: the account exists,
  // but it cannot be used until the address is confirmed.
  if (sentTo) {
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

          <h1 className="text-[28px] leading-tight">Confirm your email</h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            We sent a link to <span className="text-foreground">{sentTo}</span>. Open it and your
            drive is ready.
          </p>
          <p className="mt-4 text-[13px] text-muted-foreground">
            The link expires in 24 hours. Check your spam folder if it has not arrived.
          </p>

          <div className="mt-7 flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={busy || resent}
              onClick={() => resend(sentTo)}
            >
              {resent ? "Link sent again" : busy ? "Sending…" : "Send it again"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSentTo(null);
                setResent(false);
                setMode("login");
              }}
            >
              Back to sign in
            </Button>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-[13px] text-destructive">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  const signup = mode === "signup";

  return (
    <main
      className={
        signup
          ? "signup-bg grid min-h-screen place-items-center px-6 lg:place-items-start lg:items-center lg:pl-16 xl:pl-24 lg:pr-[min(42vw,36rem)]"
          : "grid min-h-screen place-items-center px-6"
      }
    >
      {signup && <SignupArt />}
      <div
        className={
          signup
            ? "relative z-10 w-full max-w-sm rounded-xl bg-white/90 p-6 shadow-[var(--shadow-e2)] backdrop-blur-md lg:bg-white lg:p-0 lg:shadow-none lg:backdrop-blur-none"
            : "w-full max-w-sm"
        }
      >
        {signup ? (
          <h1 className="signup-who">
            <svg
              viewBox="95 99 265 50"
              preserveAspectRatio="xMinYMid meet"
              role="img"
              aria-label="Who are you?"
            >
              <path fill="currentColor" fillRule="evenodd" d={WHO_ARE_YOU_LETTERING} />
            </svg>
          </h1>
        ) : (
          <>
            <div className="mb-8 flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-md bg-foreground text-sm font-semibold text-background"
              >
                P
              </span>
              <span className="font-display text-[17px] font-semibold tracking-tight">Puckoops</span>
            </div>
            <h1 className="text-[28px] leading-tight">Sign in to your drive</h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">Your files, wherever you left them.</p>
          </>
        )}

        <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
          {mode === "signup" && (
            <>
              <Field id="name" label="Name" value={form.name} onChange={set("name")} autoComplete="name" required />
              <Field
                id="phone"
                label="Phone"
                value={form.phoneNumber}
                onChange={set("phoneNumber")}
                inputMode="numeric"
                maxLength={10}
                minLength={10}
                required
              />
            </>
          )}
          <Field
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            required
          />
          <Field
            id="password"
            label="Password"
            type="password"
            value={form.password}
            onChange={set("password")}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
          {mode === "signup" && (
            <p className="-mt-2 text-[12px] text-muted-foreground">
              At least 8 characters, with upper and lower case, a digit and a symbol.
            </p>
          )}

          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}

          {unverified && (
            <div className="rounded-lg bg-muted p-3 text-[13px]">
              {resent ? (
                <p>A new link is on its way to {unverified}.</p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Open the link we emailed to {unverified}, then sign in.
                  </p>
                  <button
                    type="button"
                    onClick={() => resend(unverified)}
                    disabled={busy}
                    className="mt-1.5 font-medium text-foreground underline underline-offset-2 disabled:opacity-50"
                  >
                    Send it again
                  </button>
                </>
              )}
            </div>
          )}

          <Button type="submit" className="mt-1 w-full" disabled={busy}>
            {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-[13px] text-muted-foreground">
          {mode === "login" ? "No account yet?" : "Already have one?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}

function SignupArt() {
  return (
    <div className="signup-art" aria-hidden>
      <img
        className="signup-art-figure"
        src="/bg/edna.webp"
        alt=""
        width={355}
        height={297}
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="label-md">
        {label}
      </Label>
      <Input id={id} {...props} />
    </div>
  );
}

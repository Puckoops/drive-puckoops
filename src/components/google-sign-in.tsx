"use client";

import { useEffect, useRef, useState } from "react";

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

interface GoogleIdentity {
  initialize(config: { client_id: string; callback: (response: { credential?: string }) => void }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "signin_with" | "signup_with";
      shape: "rectangular";
      logo_alignment: "center";
      width: number;
    },
  ): void;
}

type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleIdentity } } };

let loading: Promise<GoogleIdentity> | null = null;
let initializedFor: string | null = null;
let deliver: ((credential: string) => void) | null = null;

function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const ready = () => (window as GoogleWindow).google?.accounts?.id;
  const loaded = ready();
  if (loaded) return Promise.resolve(loaded);
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const id = ready();
      if (id) resolve(id);
      else reject(new Error("Google's sign-in script loaded without google.accounts.id"));
    };
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Google's sign-in script did not load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Google's own sign-in button, drawn by Google's script. It hands over Google's
 * ID token, which user-svc's /user/oauth takes as id_token. Google keeps one
 * callback per page, so render one at a time.
 */
export function GoogleSignIn({
  clientId,
  onCredential,
  text = "signin",
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  text?: "signin" | "signup";
}) {
  const slot = useRef<HTMLDivElement>(null);
  const handler = useRef(onCredential);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    handler.current = onCredential;
  });

  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    const measure = () => setWidth(Math.round(el.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const own = (credential: string) => handler.current(credential);
    deliver = own;
    return () => {
      if (deliver === own) deliver = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGoogleIdentity().then(
      (id) => {
        const el = slot.current;
        if (cancelled || !el) return;
        if (initializedFor !== clientId) {
          id.initialize({ client_id: clientId, callback: (response) => response.credential && deliver?.(response.credential) });
          initializedFor = clientId;
        }
        el.replaceChildren();
        id.renderButton(el, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: `${text}_with`,
          shape: "rectangular",
          logo_alignment: "center",
          // Google draws 200 to 400px wide; a hidden parent measures 0.
          width: Math.min(400, Math.max(200, width || 400)),
        });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [clientId, text, width]);

  if (failed) return null;
  return <div ref={slot} className="flex min-h-10 w-full items-center justify-center" />;
}

"use client";
// The header's right end (next to the language menu) and the footer: "Sign in", or "Dashboard" once this tab holds a
// session (rvp-accounts.md, update 2026-11-25). The server can't know, so the slot keeps a fixed width and fills in after
// mount: nothing in the header moves. It follows sign-in and sign-out in this tab without a reload.
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, takeNote, SESSION_EVENT } from "./api";

export type AccountWords = { signIn: string; dashboard: string; signInHref: string; dashHref: string };

export function AccountLink({ w, where }: { w: AccountWords; where: "header" | "footer" }) {
  const [state, setState] = useState<"" | "in" | "out">("");
  useEffect(() => {
    const read = () => setState(getSession() ? "in" : "out");
    read();
    window.addEventListener(SESSION_EVENT, read);
    return () => window.removeEventListener(SESSION_EVENT, read);
  }, []);
  const link = state === "in" ? <Link href={w.dashHref}>{w.dashboard}</Link> : state === "out" ? <Link href={w.signInHref}>{w.signIn}</Link> : null;
  return where === "header" ? <span className="acct-slot" data-acct={state || undefined}>{link}</span> : <>{link ? <> · {link}</> : null}</>;
}

/** "You're signed out." once, on the page Sign out lands on (the personality test's start page). Dismissible. */
export function SignedOutBanner({ text, dismiss }: { text: string; dismiss: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (takeNote() === "out") setShow(true); }, []);
  return (
    <div aria-live="polite">
      {show ? (
        <div className="ds-banner primary acct-banner"><p>{text}</p><button type="button" className="ds-btn text" onClick={() => setShow(false)}>{dismiss}</button></div>
      ) : null}
    </div>
  );
}

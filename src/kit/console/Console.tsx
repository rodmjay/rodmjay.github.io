"use client";
// Should kit (ADR 0001): the owner's command console. A command picker built from the instance's command registry, one text
// field, and the owner's recent requests with their replies. Design system components only (ds-*). Strings come from the site.
import { useEffect, useRef, useState } from "react";
import { consoleClient, waitFor, type Auth, type Command, type Request } from "./client";

export type ConsoleStrings = Record<
  "title" | "lede" | "placeholder" | "run" | "commands" | "recent" | "none" | "queued" | "running" | "done" | "failed" | "expired"
  | "forbidden" | "signin" | "limit" | "network" | "outward",
  string
>;

const statusClass: Record<Request["status"], string> = { queued: "", running: "", done: "ok", failed: "err", expired: "err" };

export function Console({ url, auth, s, signinHref }: { url: string; auth: Auth; s: ConsoleStrings; signinHref: string }) {
  const c = useRef(consoleClient(url, auth)).current;
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "signin" | "network">("loading");
  const [cmds, setCmds] = useState<Command[]>([]);
  const [reqs, setReqs] = useState<Request[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const r = await c.commands();
      if (r.status === 401) return setState("signin");
      if (r.status === 403) return setState("forbidden");
      if (r.status !== 200) return setState("network");
      setCmds(r.json.commands ?? []);
      const h = await c.history();
      if (h.status === 200) setReqs(h.json.requests ?? []);
      setState("ready");
    })();
  }, [c]);

  const update = (r: Request) => setReqs((all) => all.map((x) => (x.id === r.id ? { ...x, ...r } : x)));

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr(null);
    const r = await c.run(body);
    setBusy(false);
    if (r.status !== 200 || !r.json?.id) {
      if (r.status === 401) return setState("signin");
      return setErr(r.status === 429 ? s.limit : r.status === 403 ? s.forbidden : s.network);
    }
    const req: Request = { id: r.json.id, body, status: "queued", reply: null, created_at: new Date().toISOString() };
    setReqs((all) => [req, ...all].slice(0, 20));
    setText("");
    waitFor(c, req.id, update);
  }

  if (state === "loading") return <p className="ds-body-medium" aria-busy="true">…</p>;
  if (state === "signin") return <p className="ds-body-large"><a className="ds-btn" href={signinHref}>{s.signin}</a></p>;
  if (state === "forbidden") return <p className="ds-body-large">{s.forbidden}</p>;
  if (state === "network") return <p className="ds-body-large">{s.network}</p>;

  return (
    <div className="kit-console">
      <form className="kit-console-form" onSubmit={submit}>
        <label className="ds-text-field" htmlFor="kit-console-text">
          <textarea id="kit-console-text" ref={input} rows={2} maxLength={1000} value={text} placeholder={s.placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />
        </label>
        <button className="ds-btn" type="submit" disabled={busy || !text.trim()}>{s.run}</button>
        {err && <p className="ds-body-medium kit-console-err" role="alert">{err}</p>}
      </form>

      <section aria-labelledby="kit-console-recent">
        <h2 id="kit-console-recent" className="ds-title-medium">{s.recent}</h2>
        {reqs.length === 0 ? <p className="ds-body-medium">{s.none}</p> : (
          <ul className="kit-console-list" aria-live="polite">
            {reqs.map((r) => (
              <li key={r.id} className="ds-card kit-console-item">
                <p className="ds-label-large kit-console-body">{r.body}</p>
                <p className={`ds-label-medium kit-console-status ${statusClass[r.status]}`}>{s[r.status]}</p>
                {r.reply && <p className="ds-body-medium kit-console-reply">{r.reply}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="kit-console-cmds">
        <summary className="ds-title-small">{s.commands}</summary>
        <ul>
          {cmds.map((k) => (
            <li key={k.command}>
              <button type="button" className="ds-btn text" onClick={() => { setText(k.command + " "); input.current?.focus(); }}>{k.command}</button>
              <span className="ds-body-small">{k.does}{k.outward ? ` (${s.outward})` : ""}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

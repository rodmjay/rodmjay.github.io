// Should kit (ADR 0001): the browser side of the owner's command console. It talks only to the instance's console-api Edge
// Function, with the session the site's sign-in already holds. It sends text, never a tool, prompt or skill name.

export type Command = { command: string; aliases: string[] | null; usage: string | null; does: string | null; outward: boolean };
export type Request = { id: string; body?: string; status: "queued" | "running" | "done" | "failed" | "expired"; reply: string | null; created_at?: string; finished_at?: string | null };
export type Auth = { token: () => string | null; refresh: () => Promise<boolean>; signedOut: () => void };
type Res = { status: number; json: any };

export function consoleClient(url: string, auth: Auth) {
  async function post(body: object): Promise<Res> {
    const once = async (): Promise<Res> => {
      const t = auth.token();
      if (!t) return { status: 401, json: { error: "signed_out" } };
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify(body) });
        let json: any = {};
        try { json = await r.json(); } catch { /* empty */ }
        return { status: r.status, json };
      } catch { return { status: 0, json: { error: "network" } }; }
    };
    let r = await once();
    if (r.status === 401 && (await auth.refresh())) r = await once();
    if (r.status === 401) auth.signedOut();
    return r;
  }
  return {
    /** 200 with the list for the owner; 403 for anyone else; 401 when signed out. */
    commands: () => post({ action: "commands" }),
    history: () => post({ action: "history" }),
    run: (text: string) => post({ action: "run", text }),
    poll: (id: string) => post({ action: "poll", id }),
  };
}

/** Polls one request until it finishes (done, failed or expired), or gives up after `ms`. */
export async function waitFor(c: ReturnType<typeof consoleClient>, id: string, onStatus: (r: Request) => void, ms = 5 * 60_000): Promise<Request | null> {
  const end = Date.now() + ms;
  let delay = 1500;
  while (Date.now() < end) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 6000);
    const r = await c.poll(id);
    if (r.status !== 200 || !r.json?.status) continue;
    const req = { id, ...r.json } as Request;
    onStatus(req);
    if (req.status === "done" || req.status === "failed" || req.status === "expired") return req;
  }
  return null;
}

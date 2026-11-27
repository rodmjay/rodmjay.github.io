"use client";
// The owner's command console on rodmjay.com (should-core ADR 0001): the kit's Console with this site's session. Only where
// ACCOUNTS_ON=1 (page.acct.tsx). Everyone but the allow-listed owner sees "not available"; the server decides, not this page.
import { Console, type ConsoleStrings } from "@/kit/console/Console";
import { kitAuth } from "./api";

const URL = "https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/console-api";

export function ConsoleView({ s, signinHref }: { s: ConsoleStrings; signinHref: string }) {
  return <Console url={URL} auth={kitAuth} s={s} signinHref={signinHref} />;
}

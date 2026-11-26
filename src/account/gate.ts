// The one door from the always-built site into the account code (ADR 0004 rollout gate 2: staging only until the reviews
// pass and Rod says yes). Where ACCOUNTS_ON and NEXT_PUBLIC_ACCOUNTS_ON aren't both "1", next.config.mjs replaces
// ./account-slots with ./account-slots.off at build, so no account code, string or function URL ships at all, in any
// chunk (a build-time swap, because an unrendered import still lands in Next's client manifest).
// The pages themselves (/signin/, /dashboard/) are page.acct.tsx and exist only where ACCOUNTS_ON=1.
import * as Slots from "./account-slots";

export const Account: typeof Slots | null = Slots.ON ? Slots : null;

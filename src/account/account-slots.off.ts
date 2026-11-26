// What src/account/gate.ts gets where accounts are off (next.config.mjs swaps it in for account-slots.ts): nothing.
// Same names, so the always-built pages compile either way; gate.ts sees ON=false and hands them null.
export const ON = false;
export const AccountLink = () => null;
export const SignedOutBanner = () => null;
export const SaveCard = () => null;

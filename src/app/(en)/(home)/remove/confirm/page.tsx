import { RemoveConfirm, removeMeta } from "@/zones/remove/Remove";

export const metadata = removeMeta("en", true);
export default function Page() { return <RemoveConfirm lang="en" />; }

import { RemoveConfirm, removeMeta } from "@/zones/remove/Remove";

export const metadata = removeMeta("es", true);
export default function Page() { return <RemoveConfirm lang="es" />; }

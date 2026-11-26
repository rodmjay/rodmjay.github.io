import { RvpTakePage, rvpMeta } from "@/rvp/RvpPages";

export const generateMetadata = () => rvpMeta("es", "take");
export default function Page() { return <RvpTakePage lang="es" />; }

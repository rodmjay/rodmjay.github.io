import { RvpIndex, rvpMeta } from "@/rvp/RvpPages";

export const generateMetadata = () => rvpMeta("es", "");
export default function Page() { return <RvpIndex lang="es" />; }

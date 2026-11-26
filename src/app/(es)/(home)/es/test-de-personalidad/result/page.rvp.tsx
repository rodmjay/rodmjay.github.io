import { RvpResultPage, rvpMeta } from "@/rvp/RvpPages";

export const generateMetadata = () => rvpMeta("es", "result");
export default function Page() { return <RvpResultPage lang="es" />; }

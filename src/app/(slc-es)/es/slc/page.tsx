import { Discover, discoverMeta } from "@/zones/discover/Discover";

export const generateMetadata = () => discoverMeta("es", "all");
export default function Page() { return <Discover lang="es" view="all" />; }

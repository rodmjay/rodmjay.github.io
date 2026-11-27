import { Discover, discoverMeta } from "@/zones/discover/Discover";

export const generateMetadata = () => discoverMeta("en", "all");
export default function Page() { return <Discover lang="en" view="all" />; }

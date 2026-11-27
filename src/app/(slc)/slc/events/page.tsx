import { Discover, discoverMeta } from "@/zones/discover/Discover";

export const generateMetadata = () => discoverMeta("en", "events");
export default function Page() { return <Discover lang="en" view="events" />; }

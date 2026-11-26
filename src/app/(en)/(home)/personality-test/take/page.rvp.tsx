import { RvpTakePage, rvpMeta } from "@/rvp/RvpPages";

export const generateMetadata = () => rvpMeta("en", "take");
export default function Page() { return <RvpTakePage lang="en" />; }

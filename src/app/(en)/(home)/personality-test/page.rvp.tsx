import { RvpIndex, rvpMeta } from "@/rvp/RvpPages";

export const generateMetadata = () => rvpMeta("en", "");
export default function Page() { return <RvpIndex lang="en" />; }

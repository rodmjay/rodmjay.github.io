import { RvpResultPage, rvpMeta } from "@/rvp/RvpPages";

export const generateMetadata = () => rvpMeta("en", "result");
export default function Page() { return <RvpResultPage lang="en" />; }

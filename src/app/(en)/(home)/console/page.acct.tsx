import { ConsolePage, accountMeta } from "@/account/pages";

export const generateMetadata = () => accountMeta("en", "console");
export default function Page() { return <ConsolePage lang="en" />; }

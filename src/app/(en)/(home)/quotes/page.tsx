import { Quotes, quotesMeta } from "@/zones/quotes/Quotes";

export const generateMetadata = () => quotesMeta("en");
export default function Page() { return <Quotes lang="en" />; }

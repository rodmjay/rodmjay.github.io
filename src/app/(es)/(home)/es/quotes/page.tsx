import { Quotes, quotesMeta } from "@/zones/quotes/Quotes";

export const generateMetadata = () => quotesMeta("es");
export default function Page() { return <Quotes lang="es" />; }

import { ConsolePage, accountMeta } from "@/account/pages";

export const generateMetadata = () => accountMeta("es", "console");
export default function Page() { return <ConsolePage lang="es" />; }

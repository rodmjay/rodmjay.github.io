import { DashboardPage, accountMeta } from "@/account/pages";

export const generateMetadata = () => accountMeta("es", "dashboard");
export default function Page() { return <DashboardPage lang="es" />; }

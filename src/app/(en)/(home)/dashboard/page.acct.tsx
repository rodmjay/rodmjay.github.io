import { DashboardPage, accountMeta } from "@/account/pages";

export const generateMetadata = () => accountMeta("en", "dashboard");
export default function Page() { return <DashboardPage lang="en" />; }

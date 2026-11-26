import { SignInPage, accountMeta } from "@/account/pages";

export const generateMetadata = () => accountMeta("es", "signin");
export default function Page() { return <SignInPage lang="es" />; }

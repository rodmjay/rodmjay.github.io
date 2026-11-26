import { SignInPage, accountMeta } from "@/account/pages";

export const generateMetadata = () => accountMeta("en", "signin");
export default function Page() { return <SignInPage lang="en" />; }

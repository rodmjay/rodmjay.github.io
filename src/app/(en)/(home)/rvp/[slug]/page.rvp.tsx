import { RvpArchetypePage, archetypeMeta, archetypeParams } from "@/rvp/RvpPages";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = archetypeParams;
export const generateMetadata = async ({ params }: P) => archetypeMeta("en", (await params).slug);
export default async function Page({ params }: P) { return <RvpArchetypePage lang="en" slug={(await params).slug} />; }

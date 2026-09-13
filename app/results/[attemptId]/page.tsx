import { Results } from "@/components/mindcompass/results";
export default async function Page({params}:{params:Promise<{attemptId:string}>}){return <Results id={(await params).attemptId}/>;}

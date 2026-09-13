import { Questionnaire } from "@/components/mindcompass/questionnaire";
export default async function Page({params}:{params:Promise<{scaleId:string}>}){return <Questionnaire scaleId={(await params).scaleId}/>;}

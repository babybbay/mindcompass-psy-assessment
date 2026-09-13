import type { Scale, Scores } from "./assessment/types";
export type Attempt = {id:string;scaleId:string;version:string;status:"draft"|"completed"|"withdrawn"|"expired";answers:Record<string,number>;scores:Scores|null;cursor:number;revision:number;startedAt:number;updatedAt:number;completedAt:number|null};
export type AttemptPayload = {attempt:Attempt;scale:Scale};
export type SummaryGroup = {scale:Scale;started:number;completed:number;participants:number;completionRate:number|null;meanElapsedMinutes:number|null;dimensionStats:Record<string,{mean:number|null;distribution:Record<string,number>;n:number}>;itemDistributions:Record<string,{value:number;count:number}[]>};
export type MaintenanceRun = {ranAt:number;expiredDrafts:number;deletedAttempts:number;deletedFeedback:number;deletedParticipants:number};
export type Operations = {authenticatedAdmin:true;adminAuthConfigured:boolean;appOriginConfigured:boolean;appOriginMatches:boolean;contactConfigured:boolean;scheduledCleanup:MaintenanceRun|null;manualCleanup:MaintenanceRun|null};
export type Summary = {participants:number;legacyCount:number;legacySummary:{count:number;validCount:number;averages:Record<string,number|null>;itemDistributions:Record<string,{value:number;count:number}[]>};groups:SummaryGroup[];feedback:{category:string;count:number}[];operations:Operations;asOf:number;sampling:string};
export async function api<T>(path:string,method="GET",body?:unknown):Promise<T>{
 const r=await fetch(`/api/study/${path}`,{method,credentials:"same-origin",cache:"no-store",headers:body===undefined?{}:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json() as T & {error?:string};if(!r.ok)throw new Error(data.error||"操作未完成，请稍后重试。");return data;
}

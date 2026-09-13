import { env } from "cloudflare:workers";
import { Feedback } from "@/components/mindcompass/feedback";
export default function Page(){return <Feedback contactEmail={env.RESEARCH_CONTACT_EMAIL}/>;}

import { env } from "cloudflare:workers";
import { Privacy } from "@/components/mindcompass/privacy";
export default function Page(){return <Privacy contactEmail={env.RESEARCH_CONTACT_EMAIL}/>;}

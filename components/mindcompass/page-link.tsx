import type { AnchorHTMLAttributes } from "react";
// Full document navigation avoids stale soft-navigation cache in vinext beta.
// Questionnaire state is persisted server-side before intentional navigation.
export default function PageLink(props:AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props}/>;}

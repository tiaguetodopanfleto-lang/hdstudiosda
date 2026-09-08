/** CSRF guard for the JSON APIs, including deployments behind reverse proxies. */
export function isTrustedRequest(request:Request):boolean {
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return false;
 const rawOrigin=request.headers.get('origin');
 if(!rawOrigin)return false;
 let origin:string;
 try{const parsed=new URL(rawOrigin);if(!['http:','https:'].includes(parsed.protocol)||parsed.origin!==rawOrigin)return false;origin=parsed.origin}catch{return false}

 // Set by the browser, not by page JavaScript. Compare browser-visible origins
 // before a proxy rewrites request.url to an internal host or protocol.
 const site=request.headers.get('sec-fetch-site');
 if(site==='same-origin')return true;
 if(['same-site','cross-site','none'].includes(site||''))return false;

 // Older clients: exact public origin check, never a suffix/wildcard match and
 // never trust client-supplied Host/X-Forwarded-Host as an origin allowlist.
 const configured=[process.env.APP_ORIGIN,process.env.URL,process.env.DEPLOY_PRIME_URL,process.env.DEPLOY_URL].filter(Boolean) as string[];
 const candidates=configured.length?configured:[request.url];
 return candidates.some(value=>{try{const parsed=new URL(value);return ['http:','https:'].includes(parsed.protocol)&&parsed.origin===origin}catch{return false}});
}

import {isTrustedRequest} from '@/lib/request-security';
const env=process.env;
import {db,identity} from '@/lib/store';
export const dynamic='force-dynamic';
const json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(r:Request){try{
 if(!(await identity(r))?.owner)return json({error:'Somente o dono pode administrar contas.'},403);
 const q=new URL(r.url).searchParams,search=(q.get('q')||'').slice(0,254),page=Math.max(0,Math.min(100000,Math.floor(Number(q.get('page'))||0)));
 const pattern='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
 const rows=await db().prepare("SELECT id,name,email,role,created FROM accounts WHERE email LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' ORDER BY created DESC,id LIMIT 51 OFFSET ?").bind(pattern,pattern,page*50).all();
 return json({users:rows.results.slice(0,50),hasMore:rows.results.length>50,emailReady:Boolean((env as any).RESEND_API_KEY&&(env as any).EMAIL_FROM)});
 }catch{return json({error:'Não foi possível carregar as contas.'},503)}}
export async function POST(r:Request){try{
 if(!isTrustedRequest(r))return json({error:'Origem inválida.'},403);
 if(!(await identity(r))?.owner)return json({error:'Somente o dono pode alterar cargos.'},403);
 const raw=await r.text();if(raw.length>1000)return json({error:'Dados muito longos.'},413);
 const b=JSON.parse(raw);if(typeof b.id!=='string'||!['customer','admin','moderator','seller','partner','support'].includes(b.role))return json({error:'Cargo inválido.'},400);
 const result=await db().prepare("UPDATE accounts SET role=? WHERE id=? AND role<>'owner' AND email<>'tpdasilva@icloud.com'").bind(b.role,b.id).run();
 if(!result.meta.changes)return json({error:'Conta não encontrada ou protegida.'},409);
 return json({ok:true});
 }catch{return json({error:'Não foi possível alterar o cargo.'},400)}}

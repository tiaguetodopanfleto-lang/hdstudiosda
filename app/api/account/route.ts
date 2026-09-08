import {isTrustedRequest} from '@/lib/request-security';
const env=process.env;
import {randomInt} from 'node:crypto';
import {db} from '@/lib/store';
import {OWNER_EMAIL,appIdentity,passwordInput,passwordHash,passwordMatches,secret,digest,sessionCookie,logout,limit} from '@/lib/auth';
export const dynamic='force-dynamic';
const json=(v:any,status=200,cookie?:string)=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
const mailReady=()=>Boolean((env as any).RESEND_API_KEY&&(env as any).EMAIL_FROM);
export async function GET(r:Request){try{return json({user:await appIdentity(r),registrationAvailable:mailReady()})}catch{return json({error:'Não foi possível carregar sua conta.'},503)}}
export async function POST(r:Request){try{
 if(!isTrustedRequest(r))return json({error:'Origem inválida.'},403);
 const raw=await r.text();if(raw.length>5000)return json({error:'Dados muito longos.'},413);
 const b=JSON.parse(raw),d=db();
 if(b.action==='logout')return json({ok:true},200,await logout(r));
 const ip=r.headers.get('x-nf-client-connection-ip')||'anonymous';
 if(!await limit('ip:'+ip,40))return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
 if(['verify','cancel'].includes(b.action)){
  if(typeof b.pendingId!=='string'||!/^[a-f0-9]{64}$/.test(b.pendingId))return json({error:'Solicitação inválida.'},400);
  if(b.action==='cancel'){await d.prepare('DELETE FROM pending_accounts WHERE id=?').bind(digest(b.pendingId)).run();return json({ok:true})}
  if(typeof b.code!=='string'||!/^\d{6}$/.test(b.code))return json({error:'Digite os seis dígitos do código.'},400);
  const p=await d.prepare('UPDATE pending_accounts SET attempts=attempts+1 WHERE id=? AND expires>? AND attempts<5 RETURNING *').bind(digest(b.pendingId),Date.now()).first();
  if(!p||p.code!==digest(b.pendingId+':'+b.code))return json({error:'Código inválido, expirado ou com tentativas esgotadas. Confira o e-mail ou reinicie o cadastro.'},400);
  const id=crypto.randomUUID();
  const result=await d.batch([
   d.prepare("INSERT INTO accounts(id,email,name,password,role,recovery,created) SELECT ?,email,name,password,'customer',?,? FROM pending_accounts WHERE id=? AND code=? AND expires>? AND attempts<=5").bind(id,digest(secret()),Date.now(),p.id,p.code,Date.now()),
   d.prepare('INSERT INTO customers(id,name,email,created) SELECT id,name,email,? FROM accounts WHERE id=?').bind(new Date().toISOString(),id),
   d.prepare('DELETE FROM pending_accounts WHERE id=?').bind(p.id)
  ]);
  if(!result[0].meta.changes)return json({error:'Solicitação já utilizada. Entre ou reinicie o cadastro.'},409);
  return json({ok:true},201,await sessionCookie(id));
 }
 if(!['register','login','recover'].includes(b.action))return json({error:'Ação inválida.'},400);
 const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return json({error:'Informe um e-mail válido.'},400);
 const password=passwordInput(b.password);
 if(!await limit('email:'+email,10))return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
 let account=await d.prepare('SELECT * FROM accounts WHERE email=?').bind(email).first();
 if(b.action==='register'){
  if(email===OWNER_EMAIL)return json({error:'Este e-mail está reservado ao dono. Use a opção Entrar.'},403);
  if(account)return json({error:'Não foi possível cadastrar esse e-mail. Tente entrar.'},409);
  if(!mailReady())return json({error:'Cadastro temporariamente indisponível. O envio de e-mail ainda não foi configurado.'},503);
  if(!await limit('register:'+email,3))return json({error:'Aguarde 15 minutos antes de solicitar outro código.'},429);
  const name=typeof b.name==='string'?b.name.trim():'';if(!name||name.length>80)return json({error:'Informe seu nome, com até 80 caracteres.'},400);
  const pendingId=secret(),code=String(randomInt(1000000)).padStart(6,'0'),hash=await passwordHash(password);
  await d.prepare('DELETE FROM pending_accounts WHERE expires<=?').bind(Date.now()).run();
  await d.prepare('INSERT INTO pending_accounts(id,email,name,password,code,expires,attempts) VALUES(?,?,?,?,?,?,0) ON CONFLICT(email) DO UPDATE SET id=excluded.id,name=excluded.name,password=excluded.password,code=excluded.code,expires=excluded.expires,attempts=0').bind(digest(pendingId),email,name,hash,digest(pendingId+':'+code),Date.now()+600000).run();
  try{
   const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+(env as any).RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':pendingId},body:JSON.stringify({from:(env as any).EMAIL_FROM,to:[email],subject:'Seu código de confirmação — HD Studio',text:`Seu código do HD Studio é ${code}. Ele expira em 10 minutos. Volte ao site, digite o código e clique em Confirmar. Se não solicitou este cadastro, ignore este e-mail.`}),signal:AbortSignal.timeout(15000)});
   if(!sent.ok)throw new Error('mail');
  }catch{await d.prepare('DELETE FROM pending_accounts WHERE id=?').bind(digest(pendingId)).run();return json({error:'Não foi possível enviar o código. Tente novamente mais tarde.'},503)}
  return json({pendingId,email},202);
 }
 if(b.action==='login'){
  // Bootstrap only after proving knowledge of the server-side owner secret.
  const ownerHash=!account&&email===OWNER_EMAIL?env.OWNER_PASSWORD_HASH||(env.OWNER_PASSWORD?await passwordHash(passwordInput(env.OWNER_PASSWORD)):''):'';
  if(ownerHash&&await passwordMatches(password,ownerHash)){
   const id=crypto.randomUUID();await d.prepare("INSERT INTO accounts(id,email,name,password,role,recovery,created) VALUES(?,?,?,?,'owner',?,?) ON CONFLICT(email) DO NOTHING").bind(id,email,'North_HD',ownerHash,digest(secret()),Date.now()).run();account=await d.prepare('SELECT * FROM accounts WHERE email=?').bind(email).first();
  }
  const valid=account?await passwordMatches(password,account.password):(await passwordHash(password),false);
  if(!valid)return json({error:'E-mail ou senha incorretos.'},401);
  return json({ok:true,owner:account.role==='owner',canSupport:['owner','admin'].includes(account.role)},200,await sessionCookie(account.id));
 }
 const code=typeof b.code==='string'?b.code.trim().toLowerCase():'';
 if(!account||!/^[a-f0-9]{64}$/.test(code)||digest(code)!==account.recovery)return json({error:'E-mail ou código de recuperação inválido.'},401);
 const next=secret(),hash=await passwordHash(password);
 const result=await d.batch([d.prepare('UPDATE accounts SET password=?,recovery=? WHERE id=? AND recovery=?').bind(hash,digest(next),account.id,digest(code)),d.prepare('DELETE FROM account_sessions WHERE account_id=?').bind(account.id)]);
 if(!result[0].meta.changes)return json({error:'Código já utilizado.'},409);
 return json({ok:true,recovery:next,owner:account.role==='owner'},200,await sessionCookie(account.id));
 }catch(e){console.error('Account operation failed',e instanceof Error?e.name:'unknown');return json({error:'Não foi possível concluir. Confira seus dados e tente novamente.'},400)}}

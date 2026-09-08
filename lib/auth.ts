import {db} from './database';
import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
const d=db;
export const OWNER_EMAIL='tpdasilva@icloud.com';
export const COOKIE='__Host-hd_session';
const LIFE=60*60*24*7;
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const secret=()=>randomBytes(32).toString('hex');
export function passwordInput(v:any){if(typeof v!=='string'||v.length<12||v.length>128)throw new Error('Use uma senha de 12 a 128 caracteres.');return v;}
function derive(p:string,salt:string):Promise<Buffer>{return new Promise((resolve,reject)=>scrypt(p,salt,32,{N:16384,r:8,p:5,maxmem:32*1024*1024},(e,k)=>e?reject(e):resolve(k)));}
export async function passwordHash(p:string){const salt=secret();return 'scrypt$16384$8$5$'+salt+'$'+(await derive(p,salt)).toString('hex');}
export async function passwordMatches(p:string,stored:string){const fields=stored.split('$');if(fields.length!==6)return false;const actual=await derive(p,fields[4]),expected=Buffer.from(fields[5],'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export function cookieToken(r:Request){return r.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';}
export async function appIdentity(r:Request){const token=cookieToken(r);if(!/^[a-f0-9]{64}$/.test(token))return null;const user=await d().prepare('SELECT a.id,a.name,a.email,a.role FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token=? AND s.expires>?').bind(digest(token),Date.now()).first();return user?{id:user.id,name:user.name,email:user.email,role:user.role,owner:user.role==='owner',canSupport:['owner','admin'].includes(user.role)}:null;}
export async function sessionCookie(id:string){const token=secret();await d().prepare('INSERT INTO account_sessions(token,account_id,expires) VALUES(?,?,?)').bind(digest(token),id,Date.now()+LIFE*1000).run();return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${LIFE}`;}
export async function logout(r:Request){const token=cookieToken(r);if(token)await d().prepare('DELETE FROM account_sessions WHERE token=?').bind(digest(token)).run();return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;}
export async function limit(key:string,max:number){const now=Date.now(),hashed=digest(key);const row=await d().prepare('INSERT INTO auth_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_limits.expires<=? THEN 1 ELSE auth_limits.count+1 END,expires=CASE WHEN auth_limits.expires<=? THEN excluded.expires ELSE auth_limits.expires END RETURNING count').bind(hashed,now+15*60*1000,now,now).first();return row.count<=max;}

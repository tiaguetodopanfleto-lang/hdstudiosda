import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import * as cryptoModule from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import ts from 'typescript';

test('Postgres migration, authentication, permissions, chat and store',async()=>{
 const pg=new PGlite();await pg.exec(fs.readFileSync('netlify/database/migrations/0001_hd_studio.sql','utf8'));
 const query=async(sql,values=[])=>{const r=await pg.query(sql,values);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length}};
 const pool={query,connect:async()=>({query,release(){}})};
 const env={};let sent=null,failMail=false;
 const context=vm.createContext({process:{env},console,Buffer,Request,Response,URL,crypto:cryptoModule.webcrypto,AbortSignal,fetch:async(url,opts)=>{assert.equal(url,'https://api.resend.com/emails');sent=JSON.parse(opts.body);return Response.json({}, {status:failMail?503:200})}});
 const modules=new Map();
 async function load(file){if(modules.has(file))return modules.get(file);const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;const m=new vm.SourceTextModule(source,{context,identifier:file});modules.set(file,m);await m.link(async spec=>{if(spec==='@netlify/database')return new vm.SyntheticModule(['getDatabase'],function(){this.setExport('getDatabase',()=>({pool}))},{context});if(spec==='node:crypto')return new vm.SyntheticModule(Object.keys(cryptoModule),function(){for(const k of Object.keys(cryptoModule))this.setExport(k,cryptoModule[k])},{context});return load(path.resolve(spec.startsWith('@/')?spec.slice(2)+'.ts':path.join(path.dirname(file),spec+'.ts')))});return m}
 async function module(file){const m=await load(path.resolve(file));if(m.status!=='evaluated')await m.evaluate();return m.namespace}
 const auth=await module('lib/auth.ts'),account=await module('app/api/account/route.ts'),admin=await module('app/api/admin/route.ts'),chat=await module('app/api/chat/route.ts'),store=await module('app/api/store/route.ts'),database=await module('lib/database.ts');
 assert.equal(database.parameters("SELECT '?' AS literal, ? AS bound"),"SELECT '?' AS literal, $1 AS bound");
 const password='Local-test-password!42';
 const request=(body,cookie='',origin='https://studio.test')=>new Request('http://localhost:3000/api',{method:'POST',headers:{origin,cookie,'sec-fetch-site':origin==='https://studio.test'?'same-origin':'cross-site','Content-Type':'application/json','x-nf-client-connection-ip':cryptoModule.randomUUID()},body:JSON.stringify(body)});
 const post=body=>account.POST(request(body));
 const get=(url,cookie='')=>new Request('https://studio.test'+url,{headers:{cookie}});
 assert.equal((await post({action:'register',email:'tpdasilva@icloud.com',name:'Intruder',password})).status,403);
 assert.equal((await post({action:'register',email:'a@example.com',name:'A',password})).status,503);
 env.RESEND_API_KEY='test';env.EMAIL_FROM='HD Studio <test@example.com>';
 let r=await post({action:'register',email:'a@example.com',name:'A',password,role:'owner'}),p=await r.json();assert.equal(r.status,202);
 assert.equal((await query('SELECT count(*)::int AS n FROM accounts')).rows[0].n,0);
 assert.equal((await post({action:'login',email:'a@example.com',password})).status,401);
 const code=sent.text.match(/\b\d{6}\b/)[0];
 assert.equal((await post({action:'verify',pendingId:p.pendingId,code:'xxxxxx'})).status,400);
 r=await post({action:'verify',pendingId:p.pendingId,code});assert.equal(r.status,201);const customerCookie=r.headers.get('set-cookie');assert.match(customerCookie,/HttpOnly; Secure/);
 assert.equal((await query('SELECT role FROM accounts')).rows[0].role,'customer');
 assert.equal((await post({action:'verify',pendingId:p.pendingId,code})).status,400);
 assert.equal((await admin.GET(get('/api/admin',customerCookie))).status,403);
 env.OWNER_PASSWORD=password;
 assert.equal((await post({action:'login',email:'tpdasilva@icloud.com',password:'Wrong-password!!42'})).status,401);
 r=await post({action:'login',email:'tpdasilva@icloud.com',password});assert.equal(r.status,200);const ownerCookie=r.headers.get('set-cookie');
 const ownerId=(await query("SELECT id FROM accounts WHERE role='owner'")).rows[0].id;
 assert.equal((await admin.POST(request({id:ownerId,role:'customer'},ownerCookie))).status,409);
 assert.equal((await admin.POST(request({id:ownerId,role:'admin'},ownerCookie,'https://evil.test'))).status,403);
 const ticket=await chat.POST(request({action:'create'},customerCookie));assert.equal(ticket.status,200);const ticketId=(await ticket.json()).id;
 const again=await chat.POST(request({action:'create'},customerCookie));assert.equal((await again.json()).id,ticketId);
 await query('INSERT INTO accounts VALUES($1,$2,$3,$4,$5,$6,$7)',['other','other@example.com','Other',await auth.passwordHash(password),'customer','unused',Date.now()]);const otherCookie=await auth.sessionCookie('other');
 const readChat=cookie=>chat.GET(get('/api/chat?id='+ticketId,cookie));
 assert.equal((await readChat(otherCookie)).status,404);assert.equal((await readChat(ownerCookie)).status,200);
 const mid=cryptoModule.randomUUID();assert.equal((await chat.POST(request({action:'message',ticketId,id:mid,body:'Olá!'},customerCookie))).status,200);
 assert.equal((await chat.POST(request({action:'message',ticketId,id:mid,body:'Olá!'},customerCookie))).status,200);
 assert.equal((await admin.POST(request({id:'other',role:'admin'},ownerCookie))).status,200);assert.equal((await readChat(otherCookie)).status,200);
 assert.equal((await chat.POST(request({action:'message',ticketId,id:cryptoModule.randomUUID(),body:'Olá, sou administrador.'},otherCookie))).status,200);
 assert.equal((await admin.GET(get('/api/admin',otherCookie))).status,403);
 for(const role of ['moderator','seller','partner','support','customer']){assert.equal((await admin.POST(request({id:'other',role},ownerCookie))).status,200);assert.equal((await readChat(otherCookie)).status,404)}
 const listed=await admin.GET(get('/api/admin?q=a%40example.com',ownerCookie));assert.equal(listed.status,200);assert.equal((await listed.json()).users[0].email,'a@example.com');
 for(const kind of ['cancel','expire','attempts']){r=await post({action:'register',email:kind+'@example.com',name:kind,password});p=await r.json();const right=sent.text.match(/\b\d{6}\b/)[0];if(kind==='cancel')await post({action:'cancel',pendingId:p.pendingId});if(kind==='expire')await query('UPDATE pending_accounts SET expires=0 WHERE email=$1',[kind+'@example.com']);if(kind==='attempts')for(let n=0;n<5;n++)assert.equal((await post({action:'verify',pendingId:p.pendingId,code:right==='000000'?'000001':'000000'})).status,400);assert.equal((await post({action:'verify',pendingId:p.pendingId,code:right})).status,400)}
 failMail=true;assert.equal((await post({action:'register',email:'failed@example.com',name:'Fail',password})).status,503);assert.equal((await query("SELECT count(*)::int n FROM pending_accounts WHERE email='failed@example.com'")).rows[0].n,0);
 const product={action:'product',name:'Plugin',description:'Descrição',category:'Plugin',price:10,cost:2};assert.equal((await store.POST(request(product,ownerCookie))).status,200);
 assert.equal((await store.POST(request(product,customerCookie))).status,403);
 const products=await (await store.GET(get('/api/store?view=products'))).json();const productId=products[0].id;
 assert.equal((await store.POST(request({action:'order',id:cryptoModule.randomUUID(),productId},customerCookie))).status,200);
 r=await store.GET(get('/api/store?view=dashboard',ownerCookie));assert.equal(r.status,200);const dashboard=await r.json();assert.equal(dashboard.orders.length,1);assert.equal(dashboard.clients[0].orders_count,1);
 assert.equal((await store.GET(get('/api/store?view=dashboard',otherCookie))).status,403);
 const loggedOut=await account.POST(request({action:'logout'},customerCookie));assert.equal(loggedOut.status,200);assert.equal(await auth.appIdentity(get('/',customerCookie)),null);
 await pg.close();
});

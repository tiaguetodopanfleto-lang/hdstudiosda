import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

async function guard(env={}){const source=ts.transpileModule(fs.readFileSync('lib/request-security.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;const module=new vm.SourceTextModule(source,{context:vm.createContext({URL,process:{env}})});await module.link(()=>{throw new Error('Unexpected dependency')});await module.evaluate();return module.namespace.isTrustedRequest}
const request=(origin='https://hd-studio.netlify.app',headers={})=>new Request('http://localhost:3000/api/account',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:'{}'});

test('accepts same-origin browser requests through a proxy without disabling CSRF',async()=>{
 const allowed=await guard();
 assert.equal(allowed(request(undefined,{'sec-fetch-site':'same-origin'})),true);
 assert.equal(allowed(request('https://custom.example',{'sec-fetch-site':'same-origin'})),true);
 assert.equal(allowed(request('https://evil.example',{'sec-fetch-site':'cross-site'})),false);
 assert.equal(allowed(request('https://sibling.example',{'sec-fetch-site':'same-site'})),false);
 assert.equal(allowed(request(undefined,{'sec-fetch-site':'none'})),false);
 assert.equal(allowed(request('null',{'sec-fetch-site':'same-origin'})),false);
 assert.equal(allowed(request('',{'sec-fetch-site':'same-origin'})),false);
 assert.equal(allowed(request('https://hd-studio.netlify.app/path',{'sec-fetch-site':'same-origin'})),false);
 assert.equal(allowed(request(undefined,{'sec-fetch-site':'same-origin','content-type':'text/plain'})),false);
 assert.equal(allowed(request('https://evil.example',{'x-forwarded-host':'evil.example','host':'evil.example'})),false);
});
test('older browsers require an exact configured public origin',async()=>{
 const allowed=await guard({APP_ORIGIN:'https://hd-studio.netlify.app'});
 assert.equal(allowed(request()),true);
 assert.equal(allowed(request('https://hd-studio.netlify.app.evil.example')),false);
 assert.equal(allowed(request('http://hd-studio.netlify.app')),false);
 assert.equal(allowed(request('http://localhost:3000')),false);
 assert.equal(allowed(request(undefined,{'sec-fetch-site':'cross-site'})),false);
 const local=await guard();assert.equal(local(request('http://localhost:3000')),true);
});

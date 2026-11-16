import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/[[path]].js';
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001.sql',import.meta.url),'utf8'));
 const env={ADMIN_PASSWORD:'a-test-password-long-enough',DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:db.prepare(sql).run(...args)};}};}}};
 const call=async(path,data,cookie='')=>onRequest({request:new Request('https://dar.test/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:'https://dar.test','Content-Type':'application/json',Cookie:cookie},body:data===undefined?undefined:JSON.stringify(data)}),env,waitUntil(){}});
 return {db,env,call};
}
test('authentication, enquiry persistence, revisions, preview and duplicate suppression',async()=>{
 const {db,env,call}=setup();assert.equal((await call('orders')).status,401);
 const login=await call('login',{password:env.ADMIN_PASSWORD});const cookie=login.headers.get('set-cookie').split(';')[0];
 const enquiry={id:crypto.randomUUID(),name:'Тест',email:'test@example.com',message:'Картичка',items:[]};
 assert.equal((await call('enquiries',enquiry)).status,201);assert.equal((await call('enquiries',enquiry)).status,200);
 assert.equal(db.prepare('SELECT count(*) n FROM orders').get().n,1);
 let {orders}=await (await call('orders',undefined,cookie)).json();const order={...orders[0],status:'confirmed',notes:'PRIVATE NOTE'};
 assert.equal((await call('orders',order,cookie)).status,200);assert.equal((await call('orders',order,cookie)).status,409);
 const preview=await (await call('email-preview',{id:order.id},cookie)).json();assert.ok(!preview.body.includes('PRIVATE NOTE'));
 env.BREVO_API_KEY='fake';env.MAIL_FROM='sender@example.com';const oldFetch=globalThis.fetch;let sends=0;
 globalThis.fetch=async()=>{sends++;return Response.json({messageId:'test-id'});};
 try {for(let n=0;n<2;n++)assert.equal((await call('send-email',{id:order.id,revision:preview.revision},cookie)).status,200);assert.equal(sends,1);}finally{globalThis.fetch=oldFetch;}
 assert.equal(db.prepare("SELECT state FROM emails WHERE stage='confirmed'").get().state,'accepted');
});
test('invalid inputs and foreign origin are rejected',async()=>{
 const {call,env}=setup();assert.equal((await call('enquiries',{id:crypto.randomUUID(),name:'x',email:'bad',message:'x'})).status,400);
 const r=await onRequest({request:new Request('https://dar.test/api/login',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'}),env});assert.equal(r.status,403);
});
test('provider timeout stays unknown and cannot be accidentally resent',async()=>{
 const {db,env,call}=setup();const login=await call('login',{password:env.ADMIN_PASSWORD});const cookie=login.headers.get('set-cookie').split(';')[0];
 const id=crypto.randomUUID();await call('enquiries',{id,name:'Test',email:'test@example.com',message:'Test'});
 env.BREVO_API_KEY='fake';env.MAIL_FROM='test@example.com';const oldFetch=globalThis.fetch;let attempts=0;
 globalThis.fetch=async()=>{attempts++;throw Error('timeout');};
 try{await call('send-email',{id,revision:1},cookie);const mail=db.prepare('SELECT * FROM emails').get();assert.equal(mail.state,'unknown');await call('retry-email',{id:mail.id},cookie);assert.equal(attempts,1);}finally{globalThis.fetch=oldFetch;}
});

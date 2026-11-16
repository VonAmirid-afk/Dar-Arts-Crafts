import '../../admin-core.js';
const C = globalThis.DarAdmin;
const json = (data, status=200, headers={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const fail = (message,status=400) => Object.assign(new Error(message),{status});
const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
export function emailFor(o,stage) {
  const labels={new:'Получихме Вашето запитване',confirmed:'Поръчката Ви е потвърдена',making:'Започнахме изработката',ready:'Поръчката Ви е готова'};
  if(!labels[stage])throw fail('Няма имейл за този статус.');
  const details=stage==='new'?'Ще се свържем с Вас за уточняване на цена и срок. Това не е потвърдена поръчка.':stage==='confirmed'?`Обща цена: ${(C.total(o)/100).toFixed(2)} EUR. Срок: ${o.due}.`:stage==='making'?'Работим по Вашата поръчка с внимание към всеки детайл.':'Ще се свържем с Вас за уговореното получаване или доставка.';
  return {recipient:o.email,subject:`ДАР · ${labels[stage]} · ${o.code}`,body:`Здравейте, ${o.customer}!\n\n${labels[stage]}.\n${details}\n\n${o.items.map(i=>`${i.title} × ${i.qty}`).join('\n')}\n\nС обич,\nПламена · ДАР`};
}
async function queue(env,o,stage){const m=emailFor(o,stage);await env.DB.prepare('INSERT OR IGNORE INTO emails(id,order_id,stage,recipient,subject,body) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),o.id,stage,m.recipient,m.subject,m.body).run();}
async function deliver(env,id){
  if(!env.BREVO_API_KEY||!env.MAIL_FROM)throw fail('Имейл услугата още не е настроена.',503);
  const claim=await env.DB.prepare("UPDATE emails SET state='sending' WHERE id=? AND state='pending' RETURNING *").bind(id).first();
  if(!claim)return;
  // Never automatically retry an ambiguous timeout: the provider may have accepted the message.
  try{
    const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Пламена · ДАР',email:env.MAIL_FROM},to:[{email:claim.recipient}],replyTo:{email:env.OWNER_EMAIL||env.MAIL_FROM},subject:claim.subject,textContent:claim.body}),signal:AbortSignal.timeout(15000)});
    if(!r.ok){await env.DB.prepare("UPDATE emails SET state=? WHERE id=?").bind(r.status>=500?'unknown':'failed',id).run();return;}
    const data=await r.json();await env.DB.prepare("UPDATE emails SET state='accepted',message_id=? WHERE id=?").bind(data.messageId||'',id).run();
  }catch{await env.DB.prepare("UPDATE emails SET state='unknown' WHERE id=?").bind(id).run();}
}
async function body(request){if(!request.headers.get('content-type')?.includes('application/json'))throw fail('Изисква се JSON.',415);const text=await request.text();if(text.length>100000)throw fail('Твърде много данни.',413);try{return JSON.parse(text);}catch{throw fail('Невалидни данни.');}}
async function rate(env,key,max){const bucket=`${key}:${Math.floor(Date.now()/3600000)}`;const row=await env.DB.prepare('INSERT INTO limits(key,count) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(bucket).first();if(row.count>max)throw fail('Твърде много опити. Опитайте по-късно.',429);}
export async function onRequest({request,env,waitUntil}){
 try{
  const url=new URL(request.url),path=url.pathname.replace('/api/',''),method=request.method;
  if(!env.DB)throw fail('Услугата още не е настроена.',503);
  if(method!=='GET'&&request.headers.get('Origin')!==url.origin)throw fail('Невалиден произход.',403);
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  if(path==='login'&&method==='POST'){
    await rate(env,`login:${ip}`,20);const data=await body(request);
    if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<16)throw fail('Входът още не е настроен.',503);
    if(await hash(String(data.password))!==await hash(env.ADMIN_PASSWORD))throw fail('Невалидна парола.',401);
    const token=crypto.randomUUID()+crypto.randomUUID();await env.DB.prepare('INSERT INTO sessions VALUES(?,?)').bind(await hash(token),Date.now()+28800000).run();
    return json({ok:true},200,{'Set-Cookie':`dar_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=28800`});
  }
  if(path==='enquiries'&&method==='POST'){
    const data=await body(request);if(data.website)throw fail('Невалидно запитване.');
    if(!/^[a-f0-9-]{36}$/.test(data.id||''))throw fail('Невалиден номер.');
    const existing=await env.DB.prepare('SELECT id FROM orders WHERE id=?').bind(data.id).first();if(existing)return json({ok:true});
    await rate(env,`enquiry:${ip}`,10);
    const date=new Date().toISOString().slice(0,10);
    const o={id:data.id,code:`З-${data.id.slice(0,8)}`,customer:data.name,email:data.email,phone:'',occasion:data.occasion||'',created:date,due:date,status:'new',paid:0,notes:data.message||'',items:data.items?.length?data.items.map(i=>({...i,price:0})):[{model:'',title:'Запитване по индивидуална идея',qty:1,price:0}]};
    C.validateOrder(o);if(!o.email||(!o.notes&&!data.items?.length))throw fail('Добавете имейл и описание или модел.');
    await env.DB.prepare('INSERT OR IGNORE INTO orders(id,data) VALUES(?,?)').bind(o.id,JSON.stringify(o)).run();
    await queue(env,o,'new');
    if(env.OWNER_EMAIL)await env.DB.prepare('INSERT OR IGNORE INTO emails(id,order_id,stage,recipient,subject,body) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),o.id,'owner',env.OWNER_EMAIL,`Ново запитване · ${o.code}`,`${o.customer}\n${o.email}\n${o.notes}\n${o.items.map(i=>`${i.title} × ${i.qty}`).join('\n')}`).run();
    if(env.BREVO_API_KEY&&env.MAIL_FROM){const rows=await env.DB.prepare("SELECT id FROM emails WHERE order_id=? AND state='pending'").bind(o.id).all();waitUntil(Promise.all(rows.results.map(r=>deliver(env,r.id))));}
    return json({ok:true},201);
  }
  const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)dar_session=([^;]+)/)?.[1]||'';
  const session=await env.DB.prepare('SELECT expires FROM sessions WHERE token=?').bind(await hash(token)).first();if(!session||session.expires<Date.now())throw fail('Влезте с администраторската парола.',401);
  if(path==='logout'&&method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(await hash(token)).run();return json({ok:true},200,{'Set-Cookie':'dar_session=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0'});}
  if(path==='orders'&&method==='GET'){const rows=await env.DB.prepare('SELECT * FROM orders').all();return json({orders:rows.results.map(r=>({...JSON.parse(r.data),revision:r.revision}))});}
  if(path==='orders'&&method==='POST'){
    const o=await body(request);C.validateOrder(o);
    let result;if(o.revision)result=await env.DB.prepare('UPDATE orders SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(o),o.id,o.revision).run();
    else result=await env.DB.prepare('INSERT OR IGNORE INTO orders(id,data) VALUES(?,?)').bind(o.id,JSON.stringify(o)).run();
    if(!result.meta.changes)throw fail('Поръчката е променена другаде. Обновете страницата.',409);return json({ok:true});
  }
  if(path==='emails'&&method==='GET'){const rows=await env.DB.prepare('SELECT * FROM emails WHERE order_id=?').bind(url.searchParams.get('order')||'').all();return json(rows.results);}
  if(path==='email-preview'&&method==='POST'){const {id}=await body(request);const row=await env.DB.prepare('SELECT data,revision FROM orders WHERE id=?').bind(id).first();if(!row)throw fail('Няма такава поръчка.',404);const o=JSON.parse(row.data);if(!o.email)throw fail('Добавете имейл на клиента.');return json({...emailFor(o,o.status),revision:row.revision});}
  if(path==='send-email'&&method==='POST'){
    const {id,revision}=await body(request);const row=await env.DB.prepare('SELECT data,revision FROM orders WHERE id=?').bind(id).first();if(!row||row.revision!==revision)throw fail('Поръчката е променена. Отворете прегледа отново.',409);
    const o=JSON.parse(row.data);if(!o.email)throw fail('Добавете имейл на клиента.');await queue(env,o,o.status);const mail=await env.DB.prepare('SELECT id FROM emails WHERE order_id=? AND stage=?').bind(id,o.status).first();await deliver(env,mail.id);return json({ok:true});
  }
  if(path==='retry-email'&&method==='POST'){const {id}=await body(request);await env.DB.prepare("UPDATE emails SET state='pending' WHERE id=? AND state='failed'").bind(id).run();await deliver(env,id);return json({ok:true});}
  return json({error:'Not found'},404);
 }catch(error){return json({error:error.status?error.message:error.message?.startsWith('П')?error.message:'Операцията не успя. Опитайте отново.'},error.status||400);}
}

/* Integration checks against a disposable Chromium profile and local preview.
   Run: node tests/admin-browser.cjs (CDP on :9223, preview on :8000). */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='http://127.0.0.1:8000';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const pages=await (await fetch('http://127.0.0.1:9223/json')).json();
  const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
  let serial=0;const pending=new Map(),errors=[];
  ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(msg.error):p.resolve(msg.result);}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text+' '+(msg.params.exceptionDetails.exception?.description||''));});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await pause(50);}throw Error('Timed out: '+expression);};
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const navigate=async path=>{await send('Page.navigate',{url:root+path});await waitFor(`document.readyState==='complete' && typeof DarAdmin!=='undefined' && document.querySelector('#stats').children.length===4`);};
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await navigate('/admin.html');
  // This profile is only for integration tests. Never use the user's browser profile.
  await evaluate(`localStorage.removeItem('dar-admin-v1-real');localStorage.removeItem('dar-admin-v1-demo');localStorage.removeItem('dar-admin-mode')`);
  await navigate('/admin.html');
  assert.equal(await evaluate(`document.querySelector('#modeTitle').textContent`),'Примерни данни');
  assert.equal(await evaluate(`document.querySelectorAll('#recentOrders tbody tr').length`),5);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  await pause(300);
  fs.writeFileSync('/tmp/dar-admin-desktop.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  await click('#switchMode');
  assert.equal(await evaluate(`document.querySelector('#navCount').textContent`),'0');
  await click('#newOrder');
  assert.equal(await evaluate(`document.querySelector('#orderDialog').open`),true);
  await evaluate(`(()=>{const f=document.querySelector('#orderForm');f.elements.customer.value='Test <img src=x onerror=alert(1)>';f.elements.email.value='test@example.com';f.elements.paid.value='10';document.querySelector('[data-field=title]').value='Custom card';document.querySelector('[data-field=qty]').value='3';document.querySelector('[data-field=price]').value='12.99';f.requestSubmit();})()`);
  assert.equal(await evaluate(`document.querySelector('#orderDialog').open`),false);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('dar-admin-v1-real')).orders[0].items[0].price`),1299);
  assert.equal(await evaluate(`document.querySelectorAll('#recentOrders img').length`),0);
  await navigate('/admin.html#orders');
  assert.equal(await evaluate(`document.querySelectorAll('#ordersTable tbody tr').length`),1);
  await evaluate(`document.querySelector('#paymentFilter').value='paid';document.querySelector('#paymentFilter').dispatchEvent(new Event('change'))`);
  assert.equal(await evaluate(`document.querySelectorAll('#ordersTable tbody tr').length`),0);
  await evaluate(`document.querySelector('#paymentFilter').value='partial';document.querySelector('#paymentFilter').dispatchEvent(new Event('change'))`);
  assert.equal(await evaluate(`document.querySelectorAll('#ordersTable tbody tr').length`),1);
  await click('#ordersTable [data-edit]');
  await evaluate(`(()=>{const f=document.querySelector('#orderForm');f.elements.paid.value='100';f.requestSubmit()})()`);
  assert.match(await evaluate(`document.querySelector('#formError').textContent`),/плащане/);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('dar-admin-v1-real')).orders[0].paid`),1000);
  await evaluate(`(()=>{const f=document.querySelector('#orderForm');f.elements.paid.value='38.97';f.elements.status.value='making';f.requestSubmit()})()`);
  await evaluate(`location.hash='production'`);await pause(80);
  assert.equal(await evaluate(`document.querySelectorAll('.task-card').length`),1);
  await evaluate(`(()=>{const s=document.querySelector('[data-status]');s.value='ready';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('dar-admin-v1-real')).orders[0].status`),'ready');
  await evaluate(`(()=>{const s=document.querySelector('[data-status]');s.value='cancelled';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await click('#confirmNo');
  assert.equal(await evaluate(`document.querySelector('[data-status]').value`),'ready');
  await click('#switchMode');
  assert.equal(await evaluate(`document.querySelectorAll('.task-card').length`),8);
  await click('#switchMode');
  assert.equal(await evaluate(`document.querySelectorAll('.task-card').length`),1);
  await evaluate(`location.hash='customers'`);await pause(80);
  assert.equal(await evaluate(`document.querySelectorAll('#customersTable tbody tr').length`),1);
  // Restore validation: invalid data does not replace stored orders.
  const before=await evaluate(`localStorage.getItem('dar-admin-v1-real')`);
  fs.writeFileSync('/tmp/dar-invalid-backup.json','{"version":1,"currency":"EUR","orders":[{}]}');
  await send('DOM.enable');const documentNode=await send('DOM.getDocument');const input=await send('DOM.querySelector',{nodeId:documentNode.root.nodeId,selector:'#backupFile'});
  await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:['/tmp/dar-invalid-backup.json']});await pause(100);
  assert.equal(await evaluate(`localStorage.getItem('dar-admin-v1-real')`),before);
  const backup=JSON.parse(before);backup.orders[0].customer='Restored customer';fs.writeFileSync('/tmp/dar-valid-backup.json',JSON.stringify(backup));
  await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:['/tmp/dar-valid-backup.json']});await waitFor(`document.querySelector('#confirmDialog').open`);await click('#confirmYes');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('dar-admin-v1-real')).orders[0].customer`),'Restored customer');
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:'/tmp/dar-admin-downloads'});await click('#exportCsv');await click('#backup');await pause(300);
  const files=fs.readdirSync('/tmp/dar-admin-downloads');assert.ok(files.some(f=>f.endsWith('.csv')));assert.ok(files.some(f=>f.endsWith('.json')));
  // Return preview to sample data and check every mobile view.
  await click('#switchMode');await evaluate(`location.hash='overview'`);await pause(100);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(150);
  fs.writeFileSync('/tmp/dar-admin-mobile.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  for(const view of ['overview','orders','production','customers']){await evaluate(`location.hash=${JSON.stringify(view)}`);await pause(80);assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`mobile overflow: ${view}`);}
  await click('#newOrder');assert.equal(await evaluate(`document.querySelector('#orderDialog').scrollWidth<=document.querySelector('#orderDialog').clientWidth`),true);await click('#closeOrder');
  // Public catalogue is still independent of the admin area.
  await send('Page.navigate',{url:root+'/index.html'});await waitFor(`document.readyState==='complete' && document.querySelectorAll('.catalogue-card').length>0`);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: dashboard, creation, persistence, validation, filters, production, customer history, demo isolation, backup/restore, exports, mobile layouts and public catalogue; no JS errors.');
  ws.close();
})().catch(error=>{console.error(error);process.exit(1)});

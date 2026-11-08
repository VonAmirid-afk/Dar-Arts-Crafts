/* Shared order calculations and validation. Monetary values are integer cents. */
(function (root) {
  'use strict';
  const statuses = {new:'Нова',confirmed:'Потвърдена',making:'В изработка',ready:'Готова',shipped:'Изпратена',done:'Завършена',cancelled:'Отказана'};
  const active = order => !['done','cancelled'].includes(order.status);
  const total = order => order.items.reduce((sum,item) => sum + item.qty * item.price, 0);
  const balance = order => Math.max(0,total(order)-order.paid);
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '2000-01-01' && value <= '2100-12-31' && !Number.isNaN(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
  const daysUntil = (due,today=dateKey(new Date())) => Math.round((Date.parse(due+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
  function validateOrder(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw Error('Невалидна поръчка.');
    for (const [key,max] of Object.entries({id:100,code:40,customer:100,email:254,phone:40,occasion:100,notes:2000})) {
      if (typeof o[key] !== 'string' || o[key].length>max || (['id','code','customer'].includes(key)&&!o[key].trim())) throw Error('Провери името и данните на клиента.');
    }
    if (o.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) throw Error('Въведи валиден имейл.');
    if (!Object.hasOwn(statuses,o.status)) throw Error('Невалиден статус.');
    if (!dateValid(o.created)||!dateValid(o.due)||o.due<o.created) throw Error('Крайният срок трябва да е на или след датата на поръчката.');
    if (!Array.isArray(o.items)||o.items.length<1||o.items.length>50) throw Error('Добави между 1 и 50 модела.');
    for (const item of o.items) {
      if (!item || typeof item.title!=='string'||!item.title.trim()||item.title.length>160||typeof item.model!=='string'||item.model.length>50||!Number.isInteger(item.qty)||item.qty<1||item.qty>10000||!Number.isSafeInteger(item.price)||item.price<0||item.price>100000000) throw Error('Провери описанието, броя и цената на моделите.');
    }
    if (total(o)>1000000000) throw Error('Общата сума е твърде голяма.');
    if (!Number.isSafeInteger(o.paid)||o.paid<0||o.paid>total(o)) throw Error('Полученото плащане трябва да е между 0 и общата сума.');
    return o;
  }
  function validateBackup(data) {
    if (!data || data.version!==1 || data.currency!=='EUR' || !Array.isArray(data.orders) || data.orders.length>10000) throw Error('Невалиден архив на ДАР (версия 1, EUR).');
    const ids=new Set(),codes=new Set();
    data.orders.forEach(o=>{validateOrder(o);if(ids.has(o.id)||codes.has(o.code))throw Error('Архивът съдържа дублирани поръчки.');ids.add(o.id);codes.add(o.code);});
    return data.orders;
  }
  function stats(orders,period,today=dateKey(new Date())) {
    let start='2000-01-01';
    if(period==='month') start=today.slice(0,7)+'-01';
    if(period==='30') {const d=new Date(today+'T12:00:00');d.setDate(d.getDate()-29);start=dateKey(d);}
    const selected=orders.filter(o=>o.status!=='cancelled'&&o.created>=start&&o.created<=today);
    return {count:selected.length,value:selected.reduce((n,o)=>n+total(o),0),paid:selected.reduce((n,o)=>n+o.paid,0),balance:selected.reduce((n,o)=>n+balance(o),0)};
  }
  function months(orders,now=new Date()) {
    return Array.from({length:6},(_,i)=>{
      const date=new Date(now.getFullYear(),now.getMonth()-5+i,1),key=dateKey(date).slice(0,7);
      return {key,date,value:orders.filter(o=>o.status!=='cancelled'&&o.created.startsWith(key)&&o.created<=dateKey(now)).reduce((n,o)=>n+total(o),0)};
    });
  }
  function customers(orders) {
    const map=new Map();
    orders.forEach(o=>{const key=o.email?`email:${o.email.toLowerCase()}`:o.phone?`phone:${o.phone.replace(/[^\d+]/g,'')}`:`name:${o.customer.trim().toLowerCase()}`;
      if(!map.has(key))map.set(key,{name:o.customer,email:o.email,phone:o.phone,count:0,value:0,balance:0,last:o.created});
      const c=map.get(key);c.count++;if(o.status!=='cancelled'){c.value+=total(o);c.balance+=balance(o);}if(o.created>=c.last){c.last=o.created;c.name=o.customer;c.email=o.email;c.phone=o.phone;}
    });
    return [...map.values()].sort((a,b)=>b.value-a.value);
  }
  function csvCell(v) {let s=String(v??'');if(/^[\s]*[=+@-]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
  function csv(orders) {
    const rows=[['Номер','Клиент','Имейл','Телефон','Дата','Срок','Статус','Модели','Общо EUR','Получено EUR','Остатък EUR','Бележки']];
    orders.forEach(o=>rows.push([o.code,o.customer,o.email,o.phone,o.created,o.due,statuses[o.status],o.items.map(i=>`${i.title} × ${i.qty}`).join('; '),(total(o)/100).toFixed(2),(o.paid/100).toFixed(2),(balance(o)/100).toFixed(2),o.notes]));
    return '\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
  }
  const api={statuses,active,total,balance,dateKey,dateValid,daysUntil,validateOrder,validateBackup,stats,months,customers,csv};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DarAdmin=api;
})(globalThis);

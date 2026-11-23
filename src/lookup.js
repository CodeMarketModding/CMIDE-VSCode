'use strict';
const keywords={if:'lang.if',else:'lang.if',while:'lang.while',for:'lang.for',foreach:'lang.for',break:'lang.break',continue:'lang.break',class:'lang.classes',static:'lang.static',using:'lang.import',import:'lang.import',string:'lang.strings',String:'lang.strings',int:'lang.variables',bool:'lang.variables',boolean:'lang.variables',double:'lang.variables',var:'lang.variables',List:'lang.lists',ArrayList:'lang.lists',Console:'lang.print',print:'lang.print',Math:'lang.math'};
const types=new Set(['Robot','Store','Order','Customer','Shelf','Cell','Product','Direction','Entity','Season']);
const word=c=>!!c && /[\p{L}\p{N}_]/u.test(c);
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function commentOrString(code,end) {
  let state=0;
  for(let i=0;i<end;i++) {const c=code[i],n=code[i+1];
    if(!state) {if(c==='/'&&n==='/'){state=1;i++;}else if(c==='/'&&n==='*'){state=2;i++;}else if(c==='@'&&n==='"'){state=4;i++;}else if(c==='"')state=3;else if(c==="'")state=5;}
    else if(state===1){if(c==='\n')state=0;} else if(state===2){if(c==='*'&&n==='/'){state=0;i++;}}
    else if(state===4){if(c==='"'&&n==='"')i++;else if(c==='"')state=0;}
    else if(c==='\\')i++;else if((state===3&&c==='"')||(state===5&&c==="'"))state=0;
  }return !!state;
}
function typeOf(name,code,end) {
  if(name==='robot')return 'Robot';if(name==='store')return 'Store';
  const esc=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp('\\b(Robot|Store|Order|Customer|Shelf|Cell|Product|Direction|Entity|Season|(?:ArrayList|List)\\s*(?:<[^>]+>)?|int|bool|boolean|string|String|double|var)\\s+'+esc+'\\b([^;\\n]*)','g');
  const matches=[...code.slice(0,end).matchAll(re)];if(!matches.length)return null;
  let [,type,rhs]=matches[matches.length-1];if(type.startsWith('List'))return 'List';if(type.startsWith('ArrayList'))return 'ArrayList';
  if(type!=='var')return type;
  if(/\.\s*(TakeOrder|takeOrder)\s*\(/.test(rhs))return 'Order';if(/\.\s*(GetShelf|getShelf)\s*\(/.test(rhs))return 'Shelf';
  if(/\.\s*(GetCustomer|getCustomer|GetWaitingCustomer|getWaitingCustomer)\s*\(/.test(rhs))return 'Customer';
  if(/\.\s*(GetList|getList|GetCarried|getCarried|GetDelivery|getDelivery)\s*\(/.test(rhs))return 'List';return null;
}
function find(code,offset,entries) {
  if(offset<0||offset>=code.length||!word(code[offset])||commentOrString(code,offset))return null;
  let start=offset,end=offset+1;while(start>0&&word(code[start-1]))start--;while(end<code.length&&word(code[end]))end++;
  const token=code.slice(start,end);let id=null,dot=start-1;while(dot>=0&&/\s/.test(code[dot]))dot--;
  if(code[dot]==='.') {
    let n=dot-1;while(n>=0&&/\s/.test(code[n]))n--;const finish=n+1;while(n>=0&&word(code[n]))n--;
    const owner=code.slice(n+1,finish),type=typeOf(owner,code,start);
    if(owner==='Product')id=entries.find(x=>x.id.startsWith('goods.')&&norm(x.id.slice(6))===norm(token))?.id||'type.Product';
    else if(owner==='Entity')id=entries.find(x=>x.id.startsWith('entity.')&&norm(x.id.slice(7))===norm(token))?.id||'type.Entity';
    else if(owner==='Direction')id='type.Direction';else if(owner==='Console'||(owner==='out'&&/\bSystem\s*\.\s*$/.test(code.slice(0,n+1))))id='lang.print';
    else if(owner==='Math')id='lang.math';else if(['Robot','Store','Order','Customer','Shelf','Cell'].includes(type))id=type.toLowerCase()+'.'+token[0].toLowerCase()+token.slice(1);
    else if(['Product','Direction','Entity','Season'].includes(type))id='type.'+type;else if(['List','ArrayList'].includes(type))id='lang.lists';
  } else if(types.has(token))id='type.'+token;else if(token==='robot')id='type.Robot';else if(token==='store')id='type.Store';
  else if(keywords[token])id=keywords[token];else {const type=typeOf(token,code,end);if(type)id=types.has(type)?'type.'+type:['List','ArrayList'].includes(type)?'lang.lists':'lang.variables';}
  const entry=entries.find(x=>x.id.toLowerCase()===id?.toLowerCase());return entry?{id:entry.id,start,end}:null;
}
module.exports={find,commentOrString};

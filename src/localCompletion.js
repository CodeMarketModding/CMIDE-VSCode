'use strict';
const fs=require('node:fs');const path=require('node:path');
function load(root,language){const folder=path.join(root,'SDK',language==='java'?'Java':'CSharp'),map={};
  for(const type of ['Robot','Store']){const f=path.join(folder,type+(language==='java'?'.java':'.cs'));if(!fs.existsSync(f))continue;const code=fs.readFileSync(f,'utf8'),items=[];
    for(const m of code.matchAll(/public\s+([\w<>?]+)\s+(\w+)\(([^)]*)\)/g))items.push({label:m[2],insert:m[2]+'()',caret:m[3]?m[2].length+1:-1,detail:m[1],doc:`${m[1]} ${m[2]}(${m[3]})\nOffline reference; game unlocks are not checked.`});map[type==='Robot'?'robot':'store']=items;}
  for(const type of ['Product','Direction','Entity','Season']){const f=path.join(folder,type+(language==='java'?'.java':'.cs'));if(!fs.existsSync(f))continue;const code=fs.readFileSync(f,'utf8'),start=code.indexOf('{')+1,end=language==='java'?(code.indexOf(';',start)<0?code.indexOf('}',start):code.indexOf(';',start)):code.indexOf('}',start);
    if(start>0&&end>=start)map[type]=code.slice(start,end).split(',').map(x=>x.trim()).filter(x=>/^\w+$/.test(x)).map(x=>({label:x,insert:x,detail:type,caret:-1}));}
  return map;
}
function complete(map,text,offset){const match=text.slice(0,offset).match(/\b(robot|store|Direction|Product|Entity|Season)\.([\w]*)$/);if(!match)return null;
  return {from:offset-match[2].length,items:(map[match[1]]||[]).filter(x=>x.label.toLowerCase().startsWith(match[2].toLowerCase()))};}
module.exports={load,complete};

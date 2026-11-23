'use strict';
const vscode=require('vscode');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
const colors={Guide:'#bce5c3',Language:'#a7d7f2',Method:'#f7df7c',Type:'#d5c5f4',Entity:'#f4b6c1',Goods:'#f7cb9e',Help:'#f27d6e',Challenge:'#f5a04a'};
function mapHtml(spec){const rows=spec.split('/'),tiles={'.':['#3a4552','','floor'],T:['#b5503e','🍅','the tomato table'],g:['#8e99a6','⬆','garage door'],R:['#4c6ef5','⬇','robot'],p:['#7e9bf2','⬇','bag packing'],S:['#59636f','▣','register'],B:['#b98a55','','bag'],c:['#d9709a','','customer']};
  const width=Math.max(...rows.map(x=>x.length)),seen=[...new Set(rows.join('').split(''))].filter(c=>c!=='.'&&tiles[c]);
  let html=`<div class="map" style="grid-template-columns:20px repeat(${width},38px)">`;
  rows.forEach((row,y)=>{html+=`<span class="axis">${rows.length-1-y}</span>`;for(let x=0;x<width;x++){const t=tiles[row[x]]||tiles['.'];html+=`<span class="tile" title="${esc(t[2])}" style="background:${t[0]}">${t[1]}</span>`;}});
  html+='<span></span>';for(let x=0;x<width;x++)html+=`<span class="axis">${x}</span>`;
  return html+'</div><div class="legend">'+seen.map(c=>`<span><i style="background:${tiles[c][0]}"></i>${esc(tiles[c][2])}</span>`).join('')+'</div>';
}
function blocks(text){const lines=text.replace(/\r/g,'').split('\n');let html='',para=[];const flush=()=>{if(para.length){html+='<p>'+inline(para.join(' '))+'</p>';para=[];}};
  for(let i=0;i<lines.length;i++){const line=lines[i].trim();
    if(line.startsWith('```')){flush();const code=[];while(++i<lines.length&&!lines[i].trim().startsWith('```'))code.push(lines[i]);html+='<pre>'+esc(code.join('\n'))+'</pre>';}
    else if(line.startsWith('>>>')){flush();const header=line.slice(3).trim().replace(/^!/,'').trim(),separator=header.indexOf(' | '),title=separator<0?header:header.slice(0,separator).trim(),summary=separator<0?'':header.slice(separator+3).trim(),inside=[];while(++i<lines.length&&lines[i].trim()!=='<<<')inside.push(lines[i]);html+='<details><summary>'+esc(title)+(summary?'<span class="fold-summary">'+inline(summary)+'</span>':'')+'</summary>'+blocks(inside.join('\n'))+'</details>';}
    else if(line.startsWith('@map ')){flush();html+=mapHtml(line.slice(5).trim());}else if(!line)flush();else para.push(line);
  }flush();return html;
}
class Reference {
  constructor(bridge){this.bridge=bridge;this.entries=[];this.view=null;this.page=null;this.query='';this.signature='';}
  async refresh(){const r=await this.bridge.request('referenceIndex'),signature=JSON.stringify(r.referenceItems||[]);if(signature===this.signature)return;this.signature=signature;this.entries=(r.referenceItems||[]).map(x=>JSON.parse(x));this.render();}
  resolveWebviewView(view){this.view=view;view.webview.options={enableScripts:true};view.webview.onDidReceiveMessage(async m=>{
    if(m.type==='open')await this.open(m.id);else if(m.type==='back'){this.page=null;this.render();}else if(m.type==='search'){this.query=String(m.value||'');this.render();}
  });this.render();}
  async open(id){try{if(!this.entries.some(x=>x.id===id))throw new Error('That reference entry is not unlocked in this world.');
    const page=await this.bridge.request('referencePage',{path:id});this.page={id,...page};const entry=this.entries.find(x=>x.id===id);if(entry)entry.unread=false;this.signature='';this.render();return page;
  }catch(e){vscode.window.showErrorMessage('Code Market reference: '+e.message);return null;}}
  chip(e){const color=colors[e.highlight]||colors[e.kind]||'#cbd5e1';return `<button class="chip" style="background:${color}" data-id="${esc(e.id)}">${esc(e.chip||e.title)}${e.unread?' <b class="unread">!</b>':''}</button>`;}
  render(){if(!this.view)return;let content='';
    if(this.page){const p=this.page,e=this.entries.find(x=>x.id===p.id);content=`<button id="back">← Contents</button><div class="section">${esc(e?.section||'')}</div><h2>${esc(p.referenceTitle||e?.title||'')}</h2>${p.referenceSubtitle?'<code>'+esc(p.referenceSubtitle)+'</code>':''}${blocks(p.referenceText||'')}`;
      const links=(p.related||[]).map(id=>this.entries.find(x=>x.id===id)).filter(Boolean);if(links.length)content+='<h3>See also</h3>'+links.map(x=>this.chip(x)).join('');
    }else {content=`<input id="search" type="search" placeholder="Search reference" value="${esc(this.query)}" />`;let section=null;const q=this.query.toLowerCase();
      for(const e of this.entries.filter(x=>!q||`${x.chip} ${x.title} ${x.section}`.toLowerCase().includes(q))){if(section!==e.section){section=e.section;content+=`<h2>${esc(section)}</h2>${e.note?'<p class="note">'+esc(e.note)+'</p>':''}`;}content+=this.chip(e);}
      if(!this.entries.length)content+='<p>Connect to a game world to see its unlocked reference.</p>';
    }
    const nonce=require('node:crypto').randomBytes(16).toString('hex');
    this.view.webview.html=`<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'"><style>
      body{font:13px var(--vscode-font-family);color:var(--vscode-foreground);padding:10px;background:var(--vscode-sideBar-background)}h2{font-size:19px;margin:20px 0 10px}h3{margin-top:20px}p{line-height:1.5}input{width:100%;padding:7px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border,transparent)}
      .chip{border:0;border-radius:4px;color:#25303a;padding:7px;margin:0 5px 6px 0;font-weight:600;cursor:pointer}.unread{color:#dc4d38}#back{border:0;background:var(--vscode-button-background);color:var(--vscode-button-foreground);padding:5px 8px;cursor:pointer}.section,.note{color:var(--vscode-descriptionForeground)}.section{margin-top:16px}code,pre{font-family:var(--vscode-editor-font-family);color:#ffd27a}pre{white-space:pre-wrap;background:var(--vscode-textCodeBlock-background);padding:10px;color:var(--vscode-editor-foreground)}details{background:var(--vscode-textCodeBlock-background);padding:8px;margin:8px 0}summary{cursor:pointer}.fold-summary{display:block;margin:4px 0 0 16px;color:var(--vscode-descriptionForeground)}.map{display:grid;gap:4px;margin:12px 0}.tile{width:38px;height:38px;border-radius:5px;display:grid;place-items:center;font-size:22px;color:white}.axis{display:grid;place-items:center;color:var(--vscode-descriptionForeground)}.legend{display:flex;flex-wrap:wrap;gap:8px}.legend span{display:flex;align-items:center;gap:5px}.legend i{width:10px;height:10px;border-radius:2px}
      </style></head><body>${content}<script nonce="${nonce}">const api=acquireVsCodeApi();document.querySelectorAll('[data-id]').forEach(x=>x.addEventListener('click',()=>api.postMessage({type:'open',id:x.dataset.id})));document.querySelector('#back')?.addEventListener('click',()=>api.postMessage({type:'back'}));const s=document.querySelector('#search');s?.addEventListener('change',()=>api.postMessage({type:'search',value:s.value}));</script></body></html>`;
  }
}
module.exports={Reference,blocks};

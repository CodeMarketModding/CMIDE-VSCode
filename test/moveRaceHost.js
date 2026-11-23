'use strict';
const vscode=require('vscode'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
async function run(){const dir=process.env.CODEMARKET_IDE_BRIDGE_DIR;await fs.mkdir(dir,{recursive:true});const state={text:'original',path:'Main',moving:false};let polling=false;
 const mock=setInterval(async()=>{if(polling)return;polling=true;try{for(const name of await fs.readdir(dir)){if(!name.endsWith('.request'))continue;const file=path.join(dir,name);let q;try{q=JSON.parse(await fs.readFile(file,'utf8'));await fs.unlink(file);}catch{continue;}let r={ok:true,session:'test-session',world:6,language:'csharp'};
  if(q.command==='list')Object.assign(r,{files:[state.path],folders:['Folder']});else if(q.command==='referenceIndex')r.referenceItems=[];else if(q.command==='complete'){r.from=q.caret;r.items=[];}
  else if(q.command==='read'){if(q.path!==state.path){r.ok=false;r.error='not found';}else r.text=state.text;}
  else if(q.command==='write'){if(q.path!==state.path||q.expected!==state.text){r.ok=false;r.error='conflict';}else state.text=q.text;}
  else if(q.command==='move'){state.moving=true;await new Promise(resolve=>setTimeout(resolve,900));if(q.path!==state.path||q.expected!==state.text){r.ok=false;r.error='conflict';}else{state.path='Folder/Main';Object.assign(r,{path:state.path,text:state.text,files:[state.path],folders:['Folder']});}}
  await fs.writeFile(file.replace('.request','.response'),JSON.stringify(r));}}finally{polling=false;}},15);
 try{const ext=vscode.extensions.getExtension('codemarketmodding.codemarket-live');await ext.activate();await vscode.commands.executeCommand('codemarket.connect');await vscode.commands.executeCommand('codemarket.open',{path:'Main'});
  const editor=vscode.window.activeTextEditor,old=editor.document.uri,next=old.with({path:old.path.replace(/Main$/,'Folder/Main')});const edit=new vscode.WorkspaceEdit();edit.renameFile(old,next);const pending=vscode.workspace.applyEdit(edit);
  const end=Date.now()+5000;while(!state.moving&&Date.now()<end)await new Promise(r=>setTimeout(r,20));assert.ok(state.moving);await editor.edit(builder=>builder.insert(new vscode.Position(0,0),'unsynced '));await pending;await new Promise(r=>setTimeout(r,1500));
  const docs=vscode.workspace.textDocuments.filter(d=>d.uri.scheme==='codemarket');assert.ok(docs.some(d=>d.isDirty&&d.getText().includes('unsynced'))||state.text.includes('unsynced'),'edits lost or marked clean while moving');
  console.log('PASS edit during move preserved');
 }finally{clearInterval(mock);}}
module.exports={async run(){try{await run();await fs.writeFile(path.join(process.env.CODEMARKET_IDE_BRIDGE_DIR,'race-result.txt'),'PASS');}catch(e){await fs.writeFile(path.join(process.env.CODEMARKET_IDE_BRIDGE_DIR,'race-result.txt'),e.stack||String(e));throw e;}}};

'use strict';
const vscode=require('vscode'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
async function run(){
 const dir=process.env.CODEMARKET_IDE_BRIDGE_DIR;await fs.mkdir(dir,{recursive:true});const state={text:'robot.Move();',writes:0,pages:0};let polling=false;
 const mock=setInterval(async()=>{if(polling)return;polling=true;try{for(const name of await fs.readdir(dir)){if(!name.endsWith('.request'))continue;const file=path.join(dir,name);let q;try{q=JSON.parse(await fs.readFile(file,'utf8'));await fs.unlink(file);}catch{continue;}
   let r={ok:true,session:'test-session',world:6,language:'csharp'};
   if(q.command==='list')Object.assign(r,{files:['Main'],folders:[]});
   else if(q.command==='referenceIndex')r.referenceItems=[JSON.stringify({section:'Robot · robot',id:'robot.move',title:'robot.Move',chip:'Move',kind:'Method'})];
   else if(q.command==='read')r.text=state.text;
   else if(q.command==='write'){if(q.expected!==state.text){r.ok=false;r.error='This script changed in the game';}else{state.text=q.text;state.writes++;}}
   else if(q.command==='complete'){r.from=q.caret;r.items=[JSON.stringify({label:'Move',insert:'Move()',detail:'bool',doc:'Move the robot',caret:5})];}
   else if(q.command==='referencePage'){state.pages++;Object.assign(r,{referenceTitle:'robot.Move',referenceText:'Moves the robot.',related:[]});}
   else {r.ok=false;r.error='Unexpected test command '+q.command;}
   await fs.writeFile(file.replace('.request','.response'),JSON.stringify(r));
 }}finally{polling=false;}},15);
 try{
   const ext=vscode.extensions.getExtension('codemarketmodding.codemarket-live');assert.ok(ext,'extension is discovered');await ext.activate();
   await vscode.commands.executeCommand('codemarket.connect');await vscode.commands.executeCommand('codemarket.open',{path:'Main'});
   const editor=vscode.window.activeTextEditor;assert.ok(editor);assert.equal(editor.document.languageId,'codemarket-csharp');assert.equal(editor.document.getText(),'robot.Move();');
   const editorSettings=vscode.workspace.getConfiguration('editor',{uri:editor.document.uri,languageId:editor.document.languageId});
   assert.equal(editorSettings.get('inlineSuggest.enabled'),false);assert.equal(editorSettings.get('wordBasedSuggestions'),'off');assert.equal(editorSettings.get('suggest.showWords'),false);assert.equal(editorSettings.get('suggest.showSnippets'),false);
   await editor.edit(edit=>edit.insert(new vscode.Position(0,0),'// synced\n'));
   await until(()=>state.writes>0,5000);assert.ok(state.text.startsWith('// synced'));await until(()=>!editor.document.isDirty,5000);
   const list=await vscode.commands.executeCommand('vscode.executeCompletionItemProvider',editor.document.uri,new vscode.Position(1,6));assert.ok(list.items.some(x=>x.label==='Move'));
   const definitions=await vscode.commands.executeCommand('vscode.executeDefinitionProvider',editor.document.uri,new vscode.Position(1,7));assert.equal(definitions[0].uri.scheme,'codemarket-reference');
   const refdoc=await vscode.workspace.openTextDocument(definitions[0].uri);assert.equal(state.pages,0,'definition preview should not mark a page as read');
   await vscode.window.showTextDocument(refdoc,{preview:false,viewColumn:vscode.ViewColumn.Beside});await until(()=>state.pages===1,5000);await until(()=>refdoc.getText().includes('Moves the robot'),5000);
   await vscode.window.showTextDocument(editor.document,{preview:false,viewColumn:vscode.ViewColumn.One});
   state.text='// external game edit';await until(()=>editor.document.getText()===state.text,8000);
   state.text='// conflicting game edit';await editor.edit(edit=>edit.insert(new vscode.Position(0,0),'// local unsynced\n'));
   await new Promise(r=>setTimeout(r,1800));assert.equal(state.text,'// conflicting game edit');assert.ok(editor.document.getText().startsWith('// local unsynced'));assert.ok(editor.document.isDirty);
   console.log('PASS VS Code host: activation, live open, completion, automatic sync, remote refresh, conflict preservation');
 }finally{clearInterval(mock);}
}
async function until(fn,timeout){const end=Date.now()+timeout;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,50));}throw new Error('Timed out waiting for VS Code integration state');}
module.exports={async run(){try{await run();await fs.writeFile(path.join(process.env.CODEMARKET_IDE_BRIDGE_DIR,'test-result.txt'),'PASS');}catch(e){await fs.writeFile(path.join(process.env.CODEMARKET_IDE_BRIDGE_DIR,'test-result.txt'),e.stack||String(e));throw e;}}};

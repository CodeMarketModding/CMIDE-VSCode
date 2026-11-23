'use strict';
const vscode=require('vscode');const path=require('node:path');
const {Bridge}=require('./bridge');const {GameFiles,SCHEME}=require('./gameFiles');const {Explorer}=require('./explorer');const {GameDragDrop}=require('./dragDrop');const {Reference}=require('./reference');const {ClassMap}=require('./classMap');const {CompletionCache}=require('./completionCache');const lookup=require('./lookup');const localCompletion=require('./localCompletion');

function activate(context){
  const config=()=>vscode.workspace.getConfiguration('codemarket');
  const directory=config().get('bridgeDirectory')||process.env.CODEMARKET_IDE_BRIDGE_DIR||path.join(process.env.LOCALAPPDATA||'', 'CodeMarketLiveIDE','bridge');
  const bridge=new Bridge(directory),files=new GameFiles(bridge),explorer=new Explorer(files),reference=new Reference(bridge),classMap=new ClassMap(),completionCache=new CompletionCache();
  const status=vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,50);status.text='$(debug-disconnect) Code Market: Disconnected';status.command='codemarket.connect';status.show();
  const log=vscode.window.createOutputChannel('Code Market');let busy=false,polling=false,refAt=0,lastPollError='';const timers=new Map();
  const register=(name,fn)=>context.subscriptions.push(vscode.commands.registerCommand(name,async(...args)=>{try{return await fn(...args);}catch(e){log.appendLine(`${name}: ${e.stack||e}`);vscode.window.showErrorMessage('Code Market: '+e.message);}}));
  const activeDocs=()=>vscode.workspace.textDocuments.filter(d=>d.uri.scheme===SCHEME);
  const open=async node=>{if(!node?.path)return;const uri=files.uri(node.path);let doc=await vscode.workspace.openTextDocument(uri);doc=await vscode.languages.setTextDocumentLanguage(doc,bridge.language==='java'?'codemarket-java':'codemarket-csharp');await vscode.window.showTextDocument(doc,{preview:false});};
  const updateProject=r=>{files.setProject(r);explorer.refresh();};
  files.onProjectChanged=()=>explorer.refresh();
  register('codemarket.connect',async()=>{
    if(busy)return;if(activeDocs().some(d=>d.isDirty))throw new Error('Save or copy all unsynced Code Market edits before reconnecting.');
    busy=true;completionCache.reset();status.text='$(sync~spin) Code Market: Connecting';try{const r=await bridge.connect();updateProject(r);files.conflicts.clear();reference.page=null;reference.signature='';referenceDocs.clear();updateStatus();
      try{await reference.refresh();refAt=Date.now()+5000;}catch(e){log.appendLine('Reference: '+e.message);}vscode.window.setStatusBarMessage('Code Market connected',3000);
    }catch(e){bridge.session=null;files.setProject({});explorer.refresh();reference.entries=[];reference.page=null;reference.signature='';reference.render();status.text='$(debug-disconnect) Code Market: Disconnected';throw e;}finally{busy=false;}
  });
  register('codemarket.open',open);
  register('codemarket.newFile',async node=>{const name=await vscode.window.showInputBox({prompt:'New script name',validateInput:validateName});if(name===undefined)return;
    const folder=node?.folder?node.path:node?.path?.includes('/')?node.path.slice(0,node.path.lastIndexOf('/')):'';const r=await bridge.request('create',{path:folder,name:name.trim()});updateProject(r);await open({path:r.path});});
  register('codemarket.newFolder',async node=>{const name=await vscode.window.showInputBox({prompt:'New folder name',validateInput:validateName});if(name===undefined)return;
    const folder=node?.folder?node.path:node?.path?.includes('/')?node.path.slice(0,node.path.lastIndexOf('/')):'';updateProject(await bridge.request('createFolder',{path:folder,name:name.trim()}));});
  async function ensureClean(node){const doc=activeDocs().find(d=>{try{return files.gamePath(d.uri)===node.path;}catch{return false;}});if(doc?.isDirty)throw new Error('Save or copy unsynced edits before changing this script.');const current=await bridge.request('read',{path:node.path});return current.text||'';}
  register('codemarket.rename',async node=>{if(!node||node.folder)return;const name=await vscode.window.showInputBox({prompt:'Rename script',value:node.name,validateInput:validateName});if(name===undefined)return;
    const expected=await ensureClean(node);const r=await bridge.request('rename',{path:node.path,name:name.trim(),expected});updateProject(r);await open({path:r.path});});
  register('codemarket.delete',async node=>{if(!node||node.folder)return;const expected=await ensureClean(node);const choice=await vscode.window.showWarningMessage(`Delete '${node.path}'? The game stops it if it is running.`,{modal:true},'Delete');
    if(choice!=='Delete')return;updateProject(await bridge.request('delete',{path:node.path,expected}));});
  register('codemarket.reference',async()=>{await vscode.commands.executeCommand('codemarket.referenceView.focus');if(bridge.session)await reference.refresh();});
  register('codemarket.openReference',async id=>{if(typeof id!=='string')return;await vscode.commands.executeCommand('codemarket.referenceView.focus');await reference.open(id);});
  register('codemarket.retrySync',async()=>{const doc=vscode.window.activeTextEditor?.document;if(!doc||doc.uri.scheme!==SCHEME)return;
    const key=doc.uri.toString(),path=files.gamePath(doc.uri),current=await bridge.request('read',{path}),baseline=files.baselines.get(key);
    if((current.text||'')!==baseline)throw new Error('The game version differs from the version you edited. Copy your changes, then reopen the script to resolve the conflict.');
    files.conflicts.delete(key);if(doc.isDirty && !await doc.save())throw new Error('Sync failed; your editor text is still open.');});
  register('codemarket.gotoSymbol',async(uri,offset)=>{const doc=await vscode.workspace.openTextDocument(uri),editor=await vscode.window.showTextDocument(doc);const pos=doc.positionAt(offset);editor.selection=new vscode.Selection(pos,pos);editor.revealRange(new vscode.Range(pos,pos),vscode.TextEditorRevealType.InCenter);});
  context.subscriptions.push(files,explorer,classMap,status,log,vscode.workspace.registerFileSystemProvider(SCHEME,files,{isCaseSensitive:true}),vscode.window.createTreeView('codemarket.explorer',{treeDataProvider:explorer,dragAndDropController:new GameDragDrop(files)}),vscode.window.registerTreeDataProvider('codemarket.classMap',classMap),vscode.window.registerWebviewViewProvider('codemarket.referenceView',reference));
  const gameSelector={scheme:SCHEME};
  const completion=async(doc,pos,token,ctx)=>{if(!bridge.session)return;let gamePath;try{gamePath=files.gamePath(doc.uri);}catch{return;}
    const version=doc.version,text=doc.getText(),caret=doc.offsetAt(pos),forced=ctx.triggerKind===vscode.CompletionTriggerKind.Invoke;
    let r=completionCache.complete(text,caret,forced);
    if(!r){try{const response=await bridge.request('complete',{path:gamePath,text,caret,forced},()=>token.isCancellationRequested);r={from:response.from,items:(response.items||[]).map(x=>JSON.parse(x))};}catch(e){if(e.code==='CANCELLED'||token.isCancellationRequested)return;throw e;}}
    if(token.isCancellationRequested||doc.version!==version||r.from<0||r.from>caret)return;
    return new vscode.CompletionList((r.items||[]).map((item,i)=>toCompletion(item,doc,r.from,caret,i)),true);};
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(gameSelector,{provideCompletionItems:completion},'.'));
  const localMaps={csharp:localCompletion.load(context.extensionPath,'csharp'),java:localCompletion.load(context.extensionPath,'java')};
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider([{scheme:'file',language:'csharp'},{scheme:'file',language:'java'}],{provideCompletionItems(doc,pos){
    if(!config().get('localCompletions'))return;const text=doc.getText(),caret=doc.offsetAt(pos);if(lookup.commentOrString(text,caret))return;
    const r=localCompletion.complete(localMaps[doc.languageId],text,caret);return r?.items.map((x,i)=>toCompletion(x,doc,r.from,caret,i));}},'.'));
  context.subscriptions.push(vscode.languages.registerDefinitionProvider(gameSelector,{provideDefinition(doc,pos){const t=lookup.find(doc.getText(),doc.offsetAt(pos),reference.entries);if(!t)return;
    return new vscode.Location(vscode.Uri.from({scheme:'codemarket-reference',path:'/'+t.id}),new vscode.Position(0,0));}}));
  context.subscriptions.push(vscode.languages.registerHoverProvider(gameSelector,{provideHover(doc,pos){const t=lookup.find(doc.getText(),doc.offsetAt(pos),reference.entries);if(!t)return;
    const link=vscode.Uri.parse('command:codemarket.openReference?'+encodeURIComponent(JSON.stringify([t.id]))),md=new vscode.MarkdownString(`[Open in Code Market Reference](${link})`);md.isTrusted={enabledCommands:['codemarket.openReference']};return new vscode.Hover(md,new vscode.Range(doc.positionAt(t.start),doc.positionAt(t.end)));}}));
  const referenceDocs=new Map(),referenceEvents=new vscode.EventEmitter(),openingReferences=new Set();
  context.subscriptions.push(referenceEvents,vscode.workspace.registerTextDocumentContentProvider('codemarket-reference',{onDidChange:referenceEvents.event,provideTextDocumentContent(uri){return referenceDocs.get(uri.toString())||'Open this reference to view the in-game entry.';}}));
  context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(editors=>{for(const editor of editors){const uri=editor.document.uri,key=uri.toString();
    if(uri.scheme!=='codemarket-reference'||referenceDocs.has(key)||openingReferences.has(key))continue;
    openingReferences.add(key);reference.open(uri.path.slice(1)).then(async p=>{if(!p)return;referenceDocs.set(key,`# ${p.referenceTitle||uri.path.slice(1)}\n\n${p.referenceSubtitle||''}\n\n${p.referenceText||''}`);referenceEvents.fire(uri);await vscode.commands.executeCommand('codemarket.referenceView.focus');}).finally(()=>openingReferences.delete(key));
  }}));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e=>{if(e.document.uri.scheme===SCHEME){classMap.refresh();if(!config().get('autoSync')||!e.document.isDirty||files.conflicts.has(e.document.uri.toString()))return;
    const key=e.document.uri.toString();clearTimeout(timers.get(key));timers.set(key,setTimeout(async()=>{timers.delete(key);if(!e.document.isClosed&&e.document.isDirty&&!files.conflicts.has(key)){const ok=await e.document.save();if(!ok){files.conflicts.add(key);vscode.window.showWarningMessage('Code Market sync stopped. Your editor text is preserved; use Retry Sync after resolving the problem.');}}},500));}}));
  function updateStatus(){const active=vscode.window.activeTextEditor?.document;status.text=bridge.session?(active&&active.uri.scheme!=='codemarket'&&active.uri.scheme!=='codemarket-reference'?`$(file) Code Market: Local file (not upgrade-filtered)`:`$(plug) Code Market: World ${bridge.world} · ${bridge.language}`):'$(debug-disconnect) Code Market: Disconnected';}
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(()=>{classMap.refresh();updateStatus();}));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc=>{const key=doc.uri.toString();clearTimeout(timers.get(key));timers.delete(key);}));
  const poll=setInterval(async()=>{if(!bridge.session||busy||polling)return;polling=true;try{
    for(const doc of activeDocs())await files.pollDocument(doc);
    if(Date.now()>=refAt){await reference.refresh();refAt=Date.now()+5000;}
    if(Date.now()>=completionCache.nextRefresh)await completionCache.refresh(bridge,files.files[0]);
    if(lastPollError){lastPollError='';updateStatus();}
  }catch(e){completionCache.reset();if(e.message!==lastPollError){lastPollError=e.message;log.appendLine('Polling: '+e.message);}status.text='$(warning) Code Market: Reconnect';}finally{polling=false;}},2000);
  context.subscriptions.push(new vscode.Disposable(()=>{clearInterval(poll);for(const t of timers.values())clearTimeout(t);}));
}
function validateName(value){const s=value.trim();if(!s)return 'Enter a name.';if(s.length>32)return 'Names can contain at most 32 characters.';if(/[\/\\\r\n\0]/.test(s))return 'Names cannot contain slashes or line breaks.';}
function toCompletion(item,doc,from,caret,index){const c=new vscode.CompletionItem(item.label,vscode.CompletionItemKind.Method);c.detail=item.detail||'';c.documentation=item.doc||'';c.sortText=String(index).padStart(5,'0');c.range=new vscode.Range(doc.positionAt(from),doc.positionAt(caret));
  const insert=item.insert||item.label;if(item.caret>=0&&item.caret<=insert.length){const s=new vscode.SnippetString();s.appendText(insert.slice(0,item.caret));s.appendTabstop(0);s.appendText(insert.slice(item.caret));c.insertText=s;if(item.caret>0&&insert[item.caret-1]==='.')c.command={command:'editor.action.triggerSuggest',title:'Show game suggestions'};}else c.insertText=insert;return c;}
function deactivate(){}
module.exports={activate,deactivate,validateName,toCompletion};

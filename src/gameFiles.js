'use strict';
const vscode=require('vscode');
const SCHEME='codemarket';
class GameFiles {
  constructor(bridge) {
    this.bridge=bridge;this.files=[];this.folders=[];this.baselines=new Map();this.conflicts=new Set();this.times=new Map();
    this.emitter=new vscode.EventEmitter();this.onDidChangeFile=this.emitter.event;
  }
  dispose(){this.emitter.dispose();}
  setProject(response){this.files=response.files||[];this.folders=response.folders||[];}
  uri(path){return vscode.Uri.from({scheme:SCHEME,path:`/${this.bridge.session}/${this.bridge.world}/${path}`});}
  gamePath(uri){
    const prefix=`/${this.bridge.session}/${this.bridge.world}/`;
    if(!this.bridge.session||uri.scheme!==SCHEME||!uri.path.startsWith(prefix))throw vscode.FileSystemError.Unavailable('This document belongs to another game session or world. Reconnect and reopen it; copy unsynced edits first.');
    return uri.path.slice(prefix.length);
  }
  watch(){return new vscode.Disposable(()=>{});}
  stat(uri){const p=this.gamePath(uri);const isFile=this.files.includes(p),isFolder=p===''||this.folders.includes(p);
    if(!isFile&&!isFolder)throw vscode.FileSystemError.FileNotFound(uri);
    return {type:isFile?vscode.FileType.File:vscode.FileType.Directory,ctime:0,mtime:this.times.get(uri.toString())||0,size:Buffer.byteLength(this.baselines.get(uri.toString())||'')};}
  readDirectory(uri){const root=this.gamePath(uri),prefix=root?root+'/':'';const children=new Map();
    for(const [paths,type] of [[this.folders,vscode.FileType.Directory],[this.files,vscode.FileType.File]])for(const p of paths){if(!p.startsWith(prefix))continue;const tail=p.slice(prefix.length);if(tail&&!tail.includes('/'))children.set(tail,type);}
    return [...children];}
  async readFile(uri){const path=this.gamePath(uri),key=uri.toString();
    const r=await this.bridge.request('read',{path});const text=r.text||'';
    const open=vscode.workspace.textDocuments.find(x=>x.uri.toString()===key);
    if(!open?.isDirty)this.baselines.set(key,text);
    return Buffer.from(text,'utf8');}
  async writeFile(uri,content){const path=this.gamePath(uri),key=uri.toString(),expected=this.baselines.get(key);
    if(expected===undefined)throw vscode.FileSystemError.Unavailable('Original game text is unavailable. Copy your edits, reconnect, and reopen the script.');
    if(this.conflicts.has(key))throw vscode.FileSystemError.Unavailable('Synchronization stopped after an error. Preserve your edits and use Code Market: Retry Sync after resolving the problem.');
    const text=Buffer.from(content).toString('utf8');
    try {await this.bridge.request('write',{path,text,expected});this.baselines.set(key,text);this.times.set(key,Date.now());}
    catch(e){this.conflicts.add(key);throw vscode.FileSystemError.Unavailable(e.message+' Your editor text has been preserved.');}
  }
  createDirectory(){throw vscode.FileSystemError.NoPermissions('Use Code Market: New Folder.');}
  delete(){throw vscode.FileSystemError.NoPermissions('Use Code Market: Delete Script.');}
  rename(){throw vscode.FileSystemError.NoPermissions('Use Code Market: Rename Script.');}
  async pollDocument(doc){
    if(doc.uri.scheme!==SCHEME||doc.isDirty||this.conflicts.has(doc.uri.toString()))return;
    let path;try {path=this.gamePath(doc.uri);}catch{return;}
    const key=doc.uri.toString(),baseline=this.baselines.get(key);if(baseline===undefined)return;
    const r=await this.bridge.request('read',{path});
    if(!doc.isDirty && this.baselines.get(key)===baseline && (r.text||'')!==baseline){this.times.set(key,Date.now());this.emitter.fire([{type:vscode.FileChangeType.Changed,uri:doc.uri}]);}
  }
}
module.exports={GameFiles,SCHEME};

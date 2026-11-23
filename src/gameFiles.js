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
    const root=`/${this.bridge.session}/${this.bridge.world}`,prefix=root+'/';
    if(this.bridge.session&&uri.scheme===SCHEME&&uri.path===root)return '';
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
  delete(){throw vscode.FileSystemError.NoPermissions('Use Delete Script or Delete Folder in the Code Market sidebar.');}
  async deleteFolder(uri) {
    const path = this.gamePath(uri);
    if (!path || !this.folders.includes(path)) throw vscode.FileSystemError.FileNotFound(uri);
    if (!this.bridge.canDeleteFolders) throw new Error('Folder deletion requires CMIDE Bridge 1.0.11 or newer.');

    const contains = candidate => candidate.scheme === SCHEME && candidate.path.startsWith(uri.path + '/');
    const checkForUnsyncedEdits = () => {
      this.gamePath(uri);
      if (vscode.workspace.textDocuments.some(doc => doc.isDirty && contains(doc.uri))) {
        throw new Error('Save or copy unsynced edits in this folder before deleting it.');
      }
      return false;
    };
    const preview = await this.bridge.request('previewFolderDeletion', {path}, checkForUnsyncedEdits);
    const fileCount = preview.files.length;
    const folderCount = preview.folders.length - 1;
    const detail = `This permanently deletes ${fileCount} ${fileCount === 1 ? 'script' : 'scripts'} and ${folderCount} ${folderCount === 1 ? 'subfolder' : 'subfolders'}. Running scripts in this folder will stop.`;
    const choice = await vscode.window.showWarningMessage(`Delete folder '${path}'?`, {modal: true, detail}, 'Delete');
    if (choice !== 'Delete') return;

    checkForUnsyncedEdits();
    const result = await this.bridge.request('deleteFolder', {path, expected: preview.folderSnapshot}, checkForUnsyncedEdits);
    this.setProject(result);
    this.onProjectChanged?.();
    const dirty = new Set(vscode.workspace.textDocuments.filter(doc => doc.isDirty && contains(doc.uri)).map(doc => doc.uri.toString()));
    const changes = [];
    for (const deletedPath of [...preview.files, ...preview.folders]) {
      const deletedUri = this.uri(deletedPath);
      const key = deletedUri.toString();
      this.baselines.delete(key);
      this.conflicts.delete(key);
      this.times.delete(key);
      if (!dirty.has(key)) changes.push({type: vscode.FileChangeType.Deleted, uri: deletedUri});
    }
    this.emitter.fire(changes);
  }
  async rename(oldUri,newUri){
    const oldPath=this.gamePath(oldUri),newPath=this.gamePath(newUri),oldKey=oldUri.toString(),newKey=newUri.toString();
    if(!this.files.includes(oldPath))throw vscode.FileSystemError.FileNotFound(oldUri);
    const basename=p=>p.slice(p.lastIndexOf('/')+1),parent=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';
    if(basename(oldPath)!==basename(newPath))throw vscode.FileSystemError.NoPermissions('Use Code Market: Rename Script to rename a file.');
    const destination=parent(newPath);if(destination&&!this.folders.includes(destination))throw vscode.FileSystemError.FileNotFound(newUri);
    if(parent(oldPath)===destination)return;
    if(this.files.some(p=>p.toLowerCase()===newPath.toLowerCase())||this.folders.some(p=>p.toLowerCase()===newPath.toLowerCase()))throw vscode.FileSystemError.FileExists(newUri);
    const open=vscode.workspace.textDocuments.find(d=>d.uri.toString()===oldKey);
    if(open?.isDirty||this.conflicts.has(oldKey))throw vscode.FileSystemError.Unavailable('Save or copy unsynced edits before moving the script.');
    const expected=this.baselines.get(oldKey)??(await this.bridge.request('read',{path:oldPath})).text??'';
    if(open?.isDirty)throw vscode.FileSystemError.Unavailable('The script has unsynced edits. Save it before moving.');
    const result=await this.bridge.request('move',{path:oldPath,name:destination,expected});
    if(result.path!==newPath)throw vscode.FileSystemError.Unavailable('The game returned an unexpected destination. Refresh the Explorer.');
    this.setProject(result);this.baselines.set(newKey,result.text??expected);this.baselines.delete(oldKey);this.conflicts.delete(oldKey);this.times.set(newKey,Date.now());this.onProjectChanged?.();
  }
  async pollDocument(doc){
    if(doc.uri.scheme!==SCHEME||doc.isDirty||this.conflicts.has(doc.uri.toString()))return;
    let path;try {path=this.gamePath(doc.uri);}catch{return;}
    const key=doc.uri.toString(),baseline=this.baselines.get(key);if(baseline===undefined)return;
    let r;
    try {r=await this.bridge.request('read',{path});}
    catch(error){if(!this.baselines.has(key))return;throw error;}
    if(!doc.isDirty && this.baselines.get(key)===baseline && (r.text||'')!==baseline){this.times.set(key,Date.now());this.emitter.fire([{type:vscode.FileChangeType.Changed,uri:doc.uri}]);}
  }
}
module.exports={GameFiles,SCHEME};

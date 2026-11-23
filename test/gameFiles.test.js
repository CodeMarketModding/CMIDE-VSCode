'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
class FileError extends Error { static Unavailable(x){return new FileError(x);}static FileNotFound(x){return new FileError(String(x));}static NoPermissions(x){return new FileError(x);}static FileExists(x){return new FileError(String(x));} }
const documents=[];let confirmDeletion;const stub={EventEmitter:class{constructor(){this.event=()=>{};this.events=[];}fire(x){this.events.push(x);}dispose(){}},Disposable:class{},FileSystemError:FileError,FileType:{File:1,Directory:2},FileChangeType:{Changed:1,Deleted:3},Uri:{from(x){return {...x,toString(){return `${this.scheme}:${this.path}`;}};}},workspace:{textDocuments:documents},window:{showWarningMessage(...args){return confirmDeletion(...args);}}};
const old=Module._load;Module._load=function(request,...args){return request==='vscode'?stub:old.call(this,request,...args);};const {GameFiles}=require('../src/gameFiles');Module._load=old;
test('writes use the exact baseline and reject conflicting edits',async()=>{let remote='initial',calls=[];const bridge={session:'abc',world:6,async request(command,args){calls.push({command,args});if(command==='read')return {text:remote};if(command==='write'){if(args.expected!==remote)throw new Error('changed in game');remote=args.text;return {text:remote};}}};
  const f=new GameFiles(bridge);f.setProject({files:['Folder/Main'],folders:['Folder']});const uri=f.uri('Folder/Main');assert.equal(Buffer.from(await f.readFile(uri)).toString(),'initial');await f.writeFile(uri,Buffer.from('edit'));assert.equal(remote,'edit');assert.equal(calls.at(-1).args.expected,'initial');
  remote='external';await assert.rejects(()=>f.writeFile(uri,Buffer.from('local')),/changed in game/);assert.equal(remote,'external');assert.ok(f.conflicts.has(uri.toString()));await assert.rejects(()=>f.writeFile(uri,Buffer.from('local')),/Synchronization stopped/);});
test('stale sessions cannot write and remote changes notify only clean documents',async()=>{let remote='a';const bridge={session:'abc',world:6,async request(){return {text:remote};}};const f=new GameFiles(bridge);f.setProject({files:['Main'],folders:[]});const uri=f.uri('Main');await f.readFile(uri);const doc={uri,isDirty:true};documents.push(doc);remote='remote';await f.pollDocument(doc);assert.equal(f.emitter.events.length,0);doc.isDirty=false;await f.pollDocument(doc);assert.equal(f.emitter.events.length,1);bridge.world=7;assert.throws(()=>f.gamePath(uri),/another game session or world/);documents.pop();});
test('recognizes the session root with or without a trailing slash',()=>{const f=new GameFiles({session:'abc',world:6});const root=f.uri('');assert.equal(f.gamePath(root),'');assert.equal(f.gamePath({...root,path:root.path.slice(0,-1)}),'');});
test('moving checks dirty documents, collisions and the bridge baseline',async()=>{let sent;const bridge={session:'abc',world:6,async request(command,args){if(command==='read')return {text:'original'};sent={command,args};return {path:'Dir/Main',text:'original',files:['Dir/Main'],folders:['Dir']};}};const f=new GameFiles(bridge);f.setProject({files:['Main'],folders:['Dir']});const from=f.uri('Main'),to=f.uri('Dir/Main');await f.readFile(from);
 const doc={uri:from,isDirty:true};documents.push(doc);await assert.rejects(()=>f.rename(from,to),/unsynced/);doc.isDirty=false;await f.rename(from,to);assert.deepEqual(sent,{command:'move',args:{path:'Main',name:'Dir',expected:'original'}});assert.equal(f.baselines.get(to.toString()),'original');assert.deepEqual(f.files,['Dir/Main']);documents.pop();});

function folderDeletionFixture() {
  const calls = [];
  const preview = {files:['Folder/Nested/Main'], folders:['Folder','Folder/Nested'], folderSnapshot:'snapshot'};
  const remaining = {files:['Folder2/Main'], folders:['Folder2']};
  const bridge = {
    session:'abc', world:6, canDeleteFolders:true,
    async request(command, args, beforeSend) {
      beforeSend?.();
      calls.push({command, args});
      if (command === 'read') return {text:'original'};
      if (command === 'previewFolderDeletion') return preview;
      if (command === 'deleteFolder') return remaining;
      throw new Error('unexpected request');
    }
  };
  const files = new GameFiles(bridge);
  files.setProject({files:[...preview.files,...remaining.files], folders:[...preview.folders,...remaining.folders]});
  return {files, bridge, calls};
}

test('deletes the confirmed folder and invalidates its cached scripts only', async t => {
  const {files,calls} = folderDeletionFixture();
  const folder = files.uri('Folder');
  const script = files.uri('Folder/Nested/Main');
  const sibling = files.uri('Folder2/Main');
  await files.readFile(script);
  await files.readFile(sibling);
  documents.push({uri:sibling,isDirty:true});
  t.after(() => documents.pop());
  let refreshed = false;
  files.onProjectChanged = () => {refreshed = true;};
  confirmDeletion = async (message, options, action) => {
    assert.equal(message, "Delete folder 'Folder'?");
    assert.equal(options.modal, true);
    assert.match(options.detail, /1 script and 1 subfolder/);
    return action;
  };
  await files.deleteFolder(folder);
  assert.deepEqual(calls.slice(-2), [
    {command:'previewFolderDeletion',args:{path:'Folder'}},
    {command:'deleteFolder',args:{path:'Folder',expected:'snapshot'}}
  ]);
  assert.deepEqual(files.files, ['Folder2/Main']);
  assert.equal(files.baselines.has(script.toString()), false);
  assert.equal(files.baselines.has(sibling.toString()), true);
  assert.equal(refreshed, true);
  assert.deepEqual(files.emitter.events[0].map(change => [change.type, files.gamePath(change.uri)]), [
    [3,'Folder/Nested/Main'], [3,'Folder'], [3,'Folder/Nested']
  ]);
});

test('folder deletion respects cancellation, unsynced descendants, and world switches', async t => {
  const {files,bridge,calls} = folderDeletionFixture();
  const folder = files.uri('Folder');
  const doc = {uri:files.uri('Folder/Nested/Main'),isDirty:true};
  documents.push(doc);
  t.after(() => documents.pop());
  confirmDeletion = async () => assert.fail('should not prompt with existing unsynced edits');
  await assert.rejects(files.deleteFolder(folder), /unsynced/);
  assert.equal(calls.length, 0);
  doc.isDirty = false;
  confirmDeletion = async () => undefined;
  await files.deleteFolder(folder);
  confirmDeletion = async () => {doc.isDirty = true;return 'Delete';};
  await assert.rejects(files.deleteFolder(folder), /unsynced/);
  doc.isDirty = false;
  confirmDeletion = async () => {bridge.world = 7;return 'Delete';};
  await assert.rejects(files.deleteFolder(folder), /another game session or world/);
  assert.deepEqual(calls.map(call => call.command), Array(3).fill('previewFolderDeletion'));
  bridge.world = 6;
  bridge.canDeleteFolders = false;
  await assert.rejects(files.deleteFolder(folder), /requires CMIDE Bridge 1.0.11/);
  assert.equal(calls.length, 3);
});

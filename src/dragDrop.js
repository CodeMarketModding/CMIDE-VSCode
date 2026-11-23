'use strict';
const vscode=require('vscode');
const MIME='application/vnd.code.tree.codemarket.explorer';
class GameDragDrop {
  constructor(files){this.files=files;this.dragMimeTypes=[MIME];this.dropMimeTypes=[MIME];}
  handleDrag(sources,transfer){if(sources.length!==1||sources[0].folder||!this.files.bridge.session)return;
    transfer.set(MIME,new vscode.DataTransferItem({path:sources[0].path,session:this.files.bridge.session,world:this.files.bridge.world}));}
  async handleDrop(target,transfer,token){
    const data=transfer.get(MIME)?.value;if(!data||token.isCancellationRequested)return;
    try{
      if(data.session!==this.files.bridge.session||data.world!==this.files.bridge.world)throw new Error('The game world changed during the drag. Reconnect and try again.');
      if(!this.files.files.includes(data.path))throw new Error('The script no longer exists. Refresh the Explorer.');
      const destination=target?.folder?target.path:target?.path?.includes('/')?target.path.slice(0,target.path.lastIndexOf('/')):'';
      const name=data.path.slice(data.path.lastIndexOf('/')+1),oldFolder=data.path.includes('/')?data.path.slice(0,data.path.lastIndexOf('/')):'';
      if(destination===oldFolder)return;
      const next=destination?`${destination}/${name}`:name;
      const edit=new vscode.WorkspaceEdit();edit.renameFile(this.files.uri(data.path),this.files.uri(next),{overwrite:false});
      if(!await vscode.workspace.applyEdit(edit))throw new Error('VS Code could not move the script. Check for unsynced edits or a duplicate name.');
    }catch(e){vscode.window.showErrorMessage('Code Market: '+e.message);}
  }
}
module.exports={GameDragDrop,MIME};

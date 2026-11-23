'use strict';
const vscode=require('vscode');
class Explorer {
  constructor(files){this.files=files;this.emitter=new vscode.EventEmitter();this.onDidChangeTreeData=this.emitter.event;}
  dispose(){this.emitter.dispose();}
  refresh(){this.emitter.fire();}
  getTreeItem(node){
    const item=new vscode.TreeItem(node.name,node.folder?vscode.TreeItemCollapsibleState.Collapsed:vscode.TreeItemCollapsibleState.None);
    item.contextValue=node.folder?'folder':'file';item.iconPath=new vscode.ThemeIcon(node.folder?'folder':'file-code');item.tooltip=node.path;
    if(!node.folder)item.command={command:'codemarket.open',title:'Open',arguments:[node]};return item;
  }
  getChildren(node){
    if(!this.files.bridge.session)return [];
    const prefix=node?.path?node.path+'/':'',result=[];
    for(const [paths,folder] of [[this.files.folders,true],[this.files.files,false]])for(const path of paths){if(!path.startsWith(prefix))continue;const name=path.slice(prefix.length);if(name&&!name.includes('/'))result.push({name,path,folder});}
    return result.sort((a,b)=>Number(b.folder)-Number(a.folder)||a.name.localeCompare(b.name));
  }
}
module.exports={Explorer};

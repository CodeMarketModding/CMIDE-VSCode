'use strict';
const vscode=require('vscode');
const {SCHEME}=require('./gameFiles');
class ClassMap {
  constructor(){this.emitter=new vscode.EventEmitter();this.onDidChangeTreeData=this.emitter.event;}
  dispose(){this.emitter.dispose();}
  refresh(){this.emitter.fire();}
  getTreeItem(node){const item=new vscode.TreeItem(node.label,node.children?.length?vscode.TreeItemCollapsibleState.Expanded:vscode.TreeItemCollapsibleState.None);item.description=node.detail||'';item.iconPath=new vscode.ThemeIcon(node.kind||'symbol-method');item.command={command:'codemarket.gotoSymbol',title:'Go to declaration',arguments:[node.uri,node.offset]};return item;}
  getChildren(parent){if(parent)return parent.children||[];const editor=vscode.window.activeTextEditor;if(!editor||editor.document.uri.scheme!==SCHEME)return [];
    const doc=editor.document,text=doc.getText(),items=[];let current=null,depth=0,started=0,state='normal';
    // Strip comments and strings while preserving offsets and line breaks.
    let clean='';for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
      if(state==='normal'&&c==='/'&&n==='/'){state='line';clean+='  ';i++;continue;}if(state==='normal'&&c==='/'&&n==='*'){state='block';clean+='  ';i++;continue;}
      if(state==='normal'&&(c==='"'||c==="'")){state=c;clean+=' ';continue;}
      if(state==='line'){clean+=c==='\n'?'\n':' ';if(c==='\n')state='normal';continue;}
      if(state==='block'){if(c==='*'&&n==='/'){clean+='  ';i++;state='normal';}else clean+=c==='\n'?'\n':' ';continue;}
      if(state!=='normal'){if(c==='\\'&&i+1<text.length){clean+='  ';i++;continue;}clean+=c==='\n'?'\n':' ';if(c===state)state='normal';continue;}clean+=c;
    }
    const regex=/\b(class|interface|enum|record|struct)\s+([A-Za-z_]\w*)[^;{}]*\{|\{|\}|;/g;let m;
    while((m=regex.exec(clean))){const token=m[0];
      if(m[1]){const start=m.index+token.indexOf(m[2]);const node={label:m[2],detail:m[1],kind:'symbol-class',uri:doc.uri,offset:start,children:[],depth};items.push(node);current=node;depth++;started=regex.lastIndex;continue;}
      if((token==='{'||token===';')&&current&&depth===current.depth+1){const header=clean.slice(started,m.index).trim();const method=header.match(/\b([A-Za-z_]\w*)\s*\(([^()]*)\)\s*$/);const field=header.match(/\b([A-Za-z_]\w*(?:<[^>]+>)?)\s+([A-Za-z_]\w*)\s*(?:=.*)?$/s);const match=method||field;
        if(match&&!/\b(return|if|while|for|switch|new)\b/.test(header)){const name=method?match[1]:match[2],index=clean.lastIndexOf(name,m.index);current.children.push({label:method?name+'('+match[2].trim()+')':name,detail:method?'method':field[1],kind:method?'symbol-method':'symbol-field',uri:doc.uri,offset:index});}}
      if(token==='{')depth++;else if(token==='}'){depth=Math.max(0,depth-1);if(current&&depth<=current.depth)current=items.slice().reverse().find(x=>x.depth<depth)||null;}started=regex.lastIndex;
    }return items;
  }
}
module.exports={ClassMap};

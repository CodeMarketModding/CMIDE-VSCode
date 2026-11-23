'use strict';
const {commentOrString}=require('./lookup');
class CompletionCache {
  constructor(){this.active=new Map();this.ready=false;this.generation=0;this.nextRefresh=0;this.refreshing=false;}
  reset(){this.generation++;this.active.clear();this.ready=false;this.nextRefresh=0;this.refreshing=false;}
  async refresh(bridge,file){
    if(this.refreshing||!file||!bridge.session)return;this.refreshing=true;const generation=this.generation,session=bridge.session,world=bridge.world;
    const targets=bridge.language==='java'?['robot','store','Direction','Product','Entity','Season','System.out']:['robot','store','Direction','Product','Entity','Season','Console'];
    const staging=new Map();try{
      for(const name of targets){if(generation!==this.generation||session!==bridge.session||world!==bridge.world)return;const text=name+'.';
        const response=await bridge.request('complete',{path:file,text,caret:text.length,forced:true});
        staging.set(name,(response.items||[]).map(item=>JSON.parse(item)));}
      if(generation===this.generation&&session===bridge.session&&world===bridge.world){this.active=staging;this.ready=true;this.nextRefresh=Date.now()+10000;}
    }finally{if(generation===this.generation)this.refreshing=false;}
  }
  complete(code,caret,forced){
    if(!this.ready||Date.now()>=this.nextRefresh||caret<0||caret>code.length||commentOrString(code,caret))return null;
    const match=code.slice(0,caret).match(/(?<![\w.)])\b(robot|store|Direction|Product|Entity|Season|Console|System\.out)\.([\w]*)$/);
    if(!match||!this.active.has(match[1]))return null;
    const prefix=match[2],items=this.active.get(match[1]).filter(x=>x.label.toLowerCase().startsWith(prefix.toLowerCase())).sort((a,b)=>Number(!a.label.startsWith(prefix))-Number(!b.label.startsWith(prefix)));
    if(!forced&&items.length===1&&items[0].label===prefix)items.length=0;
    return {from:caret-prefix.length,items};
  }
}
module.exports={CompletionCache};

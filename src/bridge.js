'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

class Bridge {
  constructor(directory, timeout = 6000) { this.directory=directory; this.timeout=timeout; this.session=null; this.world=null; this.language=null; this.canDeleteFolders=false; this.queue=Promise.resolve(); }
  async connect() {
    const r=await this.send({command:'list'});
    if(!r.session || !Number.isInteger(r.world)) throw new Error('The game bridge returned an invalid session.');
    if(!['csharp','java'].includes(r.language)) throw new Error(`This world uses '${r.language}', which Code Market Live does not support yet. Open a C# or Java world.`);
    this.session=r.session;this.world=r.world;this.language=r.language;this.canDeleteFolders=r.canDeleteFolders===true;return r;
  }
  request(command, params={}, isCancelled=()=>false) {
    if(!this.session)return Promise.reject(new Error('Connect to a game world first.'));
    const session=this.session, world=this.world;
    return this.send({command,session,world,...params},isCancelled).then(r=>{
      if(r.session!==session || r.world!==world || this.session!==session || this.world!==world)throw new Error('The game session or world changed. Reconnect before editing.');
      return r;
    });
  }
  send(request,isCancelled=()=>false) {
    const action=()=>{if(isCancelled()){const error=new Error('Request cancelled.');error.code='CANCELLED';throw error;}return this.sendOne(request);};
    const pending=this.queue.then(action,action);
    this.queue=pending.catch(()=>{});
    return pending;
  }
  async sendOne(request) {
    await fs.mkdir(this.directory,{recursive:true});
    const id=crypto.randomUUID().replaceAll('-','');
    const base=path.join(this.directory,id), temp=base+'.tmp', input=base+'.request', output=base+'.response';
    try {
      await fs.writeFile(temp,JSON.stringify(request),'utf8');await fs.rename(temp,input);
      const deadline=Date.now()+this.timeout;
      while(Date.now()<deadline) {
        try {
          const text=await fs.readFile(output,'utf8');const r=JSON.parse(text);
          if(!r.ok)throw new Error(r.error||'The game rejected the request.');
          return r;
        } catch(e) { if(e.code!=='ENOENT')throw e; }
        await new Promise(resolve=>setTimeout(resolve,40));
      }
      throw new Error('The game bridge did not respond. Start Code Market and load a world.');
    } finally { await Promise.all([temp,input,output].map(f=>fs.rm(f,{force:true}).catch(()=>{}))); }
  }
}
module.exports={Bridge};

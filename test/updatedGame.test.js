'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Bridge}=require('../src/bridge');
test('unsupported game languages are explained without connecting',async()=>{
  const bridge=new Bridge('unused');bridge.send=async()=>({session:'s',world:2,language:'python'});
  await assert.rejects(bridge.connect(),/python.*does not support.*C# or Java/);
  assert.equal(bridge.session,null);
});
test('reference fold summaries use the game title and summary format',()=>{
  const Module=require('node:module'),load=Module._load;
  try {Module._load=function(request,...rest){return request==='vscode'?{}:load.call(this,request,...rest);};
    const {blocks}=require('../src/reference');
    const html=blocks('>>> list.Add(x) | Adds **one** item\nBody\n<<<');
    assert.match(html,/<summary>list\.Add\(x\)<span class="fold-summary">Adds <strong>one<\/strong> item<\/span><\/summary>/);
    assert.match(html,/<p>Body<\/p>/);
  } finally {Module._load=load;}
});

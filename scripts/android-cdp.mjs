import {writeFile} from 'node:fs/promises';
export async function connect(){
  const targets=await(await fetch('http://127.0.0.1:9223/json/list')).json();
  const target=targets.find(t=>t.url.startsWith('https://localhost'));
  if(!target)throw Error('Atlas WebView not found');
  const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),events=[];let sequence=0;
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const task=pending.get(message.id);pending.delete(message.id);clearTimeout(task.timeout);message.error?task.reject(Error(JSON.stringify(message.error))):task.resolve(message.result);}else if(message.method)events.push(message);};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},20000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  const pause=(ms=700)=>new Promise(resolve=>setTimeout(resolve,ms));
  const click=async selector=>{const point=await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)throw Error('Missing '+${JSON.stringify(selector)});element.scrollIntoView({block:'center'});const r=element.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});await pause();};
  const screenshot=async path=>{const result=await call('Page.captureScreenshot',{format:'png'});await writeFile(path,Buffer.from(result.data,'base64'));};
  return{call,evaluate,click,pause,screenshot,events,close:()=>socket.close()};
}

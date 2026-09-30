import { Capacitor, registerPlugin } from '@capacitor/core';
export async function installAndroidContent(){
 if(Capacitor.getPlatform()!=='android')return;
 const plugin=registerPlugin('OperationalContent');
 globalThis.ipc={postMessage(message){
   const prefix='ruby:webview-content:';
   if(!message.startsWith(prefix))return;
   const rest=message.slice(prefix.length), i=rest.indexOf(':');
   const kind=rest.slice(0,i),fields=Object.fromEntries(new URLSearchParams(rest.slice(i+1)));
   if(kind==='upsert')plugin.upsert(fields).catch(console.error);
   if(kind==='remove')plugin.remove(fields).catch(console.error);
 }};
}

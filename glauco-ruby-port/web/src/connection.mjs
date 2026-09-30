import { Capacitor } from '@capacitor/core';
export function installConnection() {
 const android=Capacitor.getPlatform()==='android';
 const key='alianca.server.v1';
 const base=()=>localStorage.getItem(key)||(android?'http://10.0.2.2:8080':'http://127.0.0.1:8080');
 globalThis.RubyConnection={base,url(view){return base()+'/admin?glauco_shell=1#view='+encodeURIComponent(view)},save(value){
   const u=new URL(String(value).trim());
   if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('Informe o endereço HTTP ou HTTPS do servidor.');
   localStorage.setItem(key,u.origin);location.reload();
 }};
 const toggle=()=>{document.documentElement.classList.toggle('alianca-menu-open');globalThis.dispatchEvent(new Event('resize'));};
 const button=document.createElement('button');button.id='alianca-menu';button.textContent='☰ Aliança Park';button.onclick=toggle;document.body.append(button);
 document.addEventListener('click',e=>{if(e.target.closest('#alianca-nav button')&&e.target.textContent!=='Conectar'){document.documentElement.classList.remove('alianca-menu-open');globalThis.dispatchEvent(new Event('resize'));}});
}

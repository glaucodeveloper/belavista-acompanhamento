import {contextBridge,ipcRenderer} from 'electron';

contextBridge.exposeInMainWorld('aliancaDesktop',{
  runtime:()=>ipcRenderer.invoke('desktop:runtime'),
  openExternal:url=>ipcRenderer.invoke('desktop:openExternal',url),
  goAdmin:()=>ipcRenderer.invoke('desktop:goAdmin')
});

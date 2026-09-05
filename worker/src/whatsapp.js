// Pseudo-notificação de WhatsApp para o Worker.
// Este projeto não entrega mensagens externas. O agente apenas publica um
// envelope no Firebase Realtime Database; os dispositivos autorizados fazem
// listen nesse canal e exibem a notificação localmente.

const text=(value,max=1000)=>String(value??'').trim().slice(0,max);

export function whatsappRuntime(env={}){
  return {
    configured:false,
    externalDelivery:false,
    mode:'realtime-listener',
    channel:'Firebase Realtime Database',
    note:'Somente pseudo-notificações; nenhum endpoint externo é chamado.'
  };
}

export async function sendWhatsAppMessage(env={},input={}){
  const message=text(input.text,4000);
  return {
    sent:false,
    skipped:true,
    pseudo:true,
    queued:Boolean(message),
    channel:'firebase-realtime-listener',
    reason:'Pseudo-notificação criada; os dispositivos autorizados recebem pelo listener do Firebase Realtime Database.',
    runtime:whatsappRuntime(env)
  };
}

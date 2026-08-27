import {insertNotification} from './storage.js';
import {runVisualDigest} from './nvidia.js';

export class RecordDigestWorkflow {
  async run(event,env){
    const digest=await runVisualDigest(env,{kind:'record-photo',imageBase64:event?.imageBase64,imageUrl:event?.imageUrl,notes:event?.details});
    await insertNotification(env,{
      category:'workflow-record',
      severity:digest.risk,
      title:'Workflow de registro concluído',
      message:digest.summary,
      entityType:'records',
      entityId:event?.recordId||'',
      metadata:{digest}
    });
    return digest;
  }
}

export class PurchaseReceiptDigestWorkflow {
  async run(event,env){
    const digest=await runVisualDigest(env,{kind:'purchase-receipt',imageBase64:event?.imageBase64,imageUrl:event?.imageUrl,notes:event?.notes});
    await insertNotification(env,{
      category:'workflow-purchase',
      severity:digest.risk,
      title:'Workflow de recibo concluído',
      message:digest.summary,
      entityType:'purchase-receipts',
      entityId:event?.receiptId||'',
      metadata:{digest}
    });
    return digest;
  }
}

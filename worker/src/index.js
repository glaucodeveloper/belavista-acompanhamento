import {routeRequest, handleQueueBatch, handleScheduled} from './routes.js';
import {RecordDigestWorkflow, PurchaseReceiptDigestWorkflow} from './workflows.js';

export default {
  async fetch(request,env,ctx){
    return routeRequest(request,env,ctx);
  },
  async queue(batch,env,ctx){
    return handleQueueBatch(batch,env,ctx);
  },
  async scheduled(controller,env,ctx){
    return handleScheduled(controller,env,ctx);
  }
};

export {RecordDigestWorkflow, PurchaseReceiptDigestWorkflow};

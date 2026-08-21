const SDK_VERSION='12.16.0';
const FIREBASE_CONFIG={
  apiKey:'AIzaSyAtbLAkqya5XIDfSDHovvhCr9pReAr_XgQ',
  authDomain:'belavista-3f887.firebaseapp.com',
  databaseURL:'https://belavista-3f887-default-rtdb.firebaseio.com',
  projectId:'belavista-3f887',
  storageBucket:'belavista-3f887.firebasestorage.app',
  messagingSenderId:'76119600966',
  appId:'1:76119600966:web:b4cc29460cf78fec173f47',
  measurementId:'G-834JNQKQZF'
};

let runtimePromise;
const loadRuntime=()=>runtimePromise||(runtimePromise=(async()=>{
  const [appSdk,databaseSdk,authSdk]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-database.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`)
  ]);
  const app=appSdk.initializeApp(FIREBASE_CONFIG);
  const auth=authSdk.getAuth(app);
  if(!auth.currentUser)await authSdk.signInAnonymously(auth);
  import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-analytics.js`).then(sdk=>{try{sdk.getAnalytics(app);}catch(error){console.info('Firebase Analytics indisponível neste contexto.',error);}}).catch(()=>{});
  return {app,auth,db:databaseSdk.getDatabase(app),...databaseSdk};
})().catch(error=>{runtimePromise=null;throw error;}));

const text=(value,max=240)=>String(value??'').trim().slice(0,max);

export async function savePublicLead(input={}){
  const runtime=await loadRuntime();
  const leadRef=runtime.push(runtime.ref(runtime.db,'publicLeads'));
  const payload={
    name:text(input.name,120),
    whatsapp:text(input.whatsapp,40),
    email:text(input.email,160).toLowerCase(),
    objective:text(input.objective,60),
    sun:text(input.sun,30),
    altitude:text(input.altitude,40),
    terrain:text(input.terrain,40),
    budget:text(input.budget,60),
    notes:text(input.notes,500),
    source:'belavista-public-lead',
    createdAt:runtime.serverTimestamp(),
    updatedAt:runtime.serverTimestamp()
  };
  await runtime.set(leadRef,payload);
  return leadRef.key;
}

export async function subscribePublicLeads(onChange){
  const runtime=await loadRuntime();
  return runtime.onValue(runtime.ref(runtime.db,'publicLeads'),snapshot=>onChange(snapshot.val()||{}));
}

export const firebaseProjectId=FIREBASE_CONFIG.projectId;

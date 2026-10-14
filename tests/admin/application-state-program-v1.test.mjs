import test from 'node:test';
import assert from 'node:assert/strict';
import {ApplicationStateProgramV1, driveApplicationStateProgramV1, WindowElement} from '../../bootstrap/application-state-program-v1.mjs';

test('application window composes as the root element and exposes its browser surfaces',()=>{
  const document={title:'Belavista'};
  const location={search:'?view=materials'};
  const history={state:{}};
  const windowRef={document,location,history};
  const element=WindowElement({windowRef,props:{id:'test-window'},children:['app']}).next().value;

  assert.equal(element.type,'window-element');
  assert.equal(element.id,'test-window');
  assert.equal(element.element,windowRef);
  assert.equal(element.document,document);
  assert.equal(element.location,location);
  assert.equal(element.history,history);
  assert.deepEqual(element.children,['app']);
});

test('application state program yields ordered boot transitions through committed state',async()=>{
  const calls=[];
  const state={view:'materials'};
  const result=await driveApplicationStateProgramV1(
    ApplicationStateProgramV1.program({windowElement:WindowElement({windowRef:{document:{},location:{},history:{}}}),config:{mode:'worker'}}),
    {
      'resolve-window-element':({component})=>{calls.push('window');return component.next().value;},
      'await-authentication':({applicationWindow})=>{assert.equal(applicationWindow.type,'window-element');calls.push('auth');return true;},
      'sanitize-config':({config})=>{calls.push('config');return config;},
      'initialize-application-state':({applicationWindow})=>{assert.equal(applicationWindow.type,'window-element');calls.push('state');return state;},
      'mount-application':({state:current})=>{assert.equal(current,state);calls.push('mount');},
      'activate-application-services':({state:current})=>{assert.equal(current,state);calls.push('activate');}
    }
  );

  assert.deepEqual(calls,['window','auth','config','state','mount','activate']);
  assert.deepEqual(result,{status:'ready',state});
});

test('authentication gate stops the program before config or application state initialization',async()=>{
  const calls=[];
  const result=await driveApplicationStateProgramV1(
    ApplicationStateProgramV1.program({windowElement:WindowElement({windowRef:{document:{},location:{},history:{}}})}),
    {
      'resolve-window-element':({component})=>component.next().value,
      'await-authentication':()=>{calls.push('auth');return false;},
      'sanitize-config':()=>{calls.push('config');},
      'initialize-application-state':()=>{calls.push('state');}
    }
  );

  assert.deepEqual(calls,['auth']);
  assert.deepEqual(result,{status:'authentication-required'});
});

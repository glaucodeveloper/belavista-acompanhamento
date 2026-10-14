import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPONENT_APPLICATION_CONFIGURATION_V1,ComponentApplicationProgramV1,driveComponentApplicationProgramV1} from '../../components/application-program-v1.mjs';

test('component application program validates config and composes before publishing exports',async()=>{
  const calls=[];
  const host={document:{}};
  const components={ViewLayer:{},AiChat:{}};
  const result=await driveComponentApplicationProgramV1(ComponentApplicationProgramV1.program({host,compose:()=>{calls.push('compose');return components;}}),{
    'resolve-component-runtime':({host:runtime})=>{assert.equal(runtime,host);calls.push('resolve');return runtime;},
    'validate-component-configuration':({configuration})=>{assert.deepEqual(configuration,COMPONENT_APPLICATION_CONFIGURATION_V1);calls.push('configure');return configuration;},
    'compose-component-application':({compose})=>compose(),
    'publish-component-application':({runtime,components:exports})=>{assert.equal(runtime,host);assert.equal(exports,components);calls.push('publish');}
  });
  assert.deepEqual(calls,['resolve','configure','compose','publish']);
  assert.equal(result,components);
});

test('component configuration documents unique install groups and the folder index',()=>{
  assert.equal(COMPONENT_APPLICATION_CONFIGURATION_V1.root,'components/index.mjs');
  assert.equal(new Set(COMPONENT_APPLICATION_CONFIGURATION_V1.groups).size,COMPONENT_APPLICATION_CONFIGURATION_V1.groups.length);
  assert.ok(COMPONENT_APPLICATION_CONFIGURATION_V1.groups.includes('planning-and-stages'));
});

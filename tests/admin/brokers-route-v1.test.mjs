import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.env.BELAVISTA_ROOT||process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Corretores mantém rota dedicada, sem alias para Dashboard',()=>{
  const app=read('components/shared/application-navigation-routes-v1.mjs');
  assert.doesNotMatch(app,/brokers\s*:\s*['"]control['"]/);
  assert.match(app,/"messages", "brokers", "broker-detail", "sales-history", "brokers-board"/);
  assert.match(app,/['"]broker-detail['"]/);
  assert.match(app,/['"]sales-history['"]/);
});

test('listagem de corretores tem linhas e acesso à ficha dedicada',()=>{
  const components=read('components/index.mjs');
  const registration=read('components/commercial/commercial-history-registration-v1.mjs');
  const brokers=read('components/commercial/brokers-page.mjs');
  const brokerDetail=read('components/commercial/broker-detail-page-v1.mjs');
  assert.match(brokers,/broker-directory-page/);
  assert.match(brokers,/broker-profile-directory-card/);
  assert.match(brokers,/data-broker-open/);
  assert.match(components,/installCommercialDirectoryContractsRegistrationV1\(\{/);
  assert.match(registration,/ViewLayer\.prototype\["broker-detail"\] = createBrokerDetailPageV1/);
  assert.match(brokerDetail,/broker-detail-kpis/);
  assert.match(brokerDetail,/data-broker-history-all/);
  assert.match(brokerDetail,/data-history-open=/);
});

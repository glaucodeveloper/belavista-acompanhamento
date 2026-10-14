import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import { installContractsPageV1 } from '../../components/commercial/contracts-page-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const components = fs.readFileSync(path.join(root, 'components.js'), 'utf8');
const registration = fs.readFileSync(path.join(root, 'components/commercial/commercial-directory-contracts-registration-v1.mjs'), 'utf8');
const contracts = fs.readFileSync(path.join(root, 'components/commercial/contracts-page-v1.mjs'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('Contratos entra pela listagem padrão com recibos e valores', () => {
  assert.match(contracts, /CONTRACTS_TABLE_V1/);
  assert.match(contracts, /contracts-page-v2/);
  assert.match(contracts, /<h2>Recibos e valores<\/h2>/);
  assert.match(contracts, /data-contract-filter/);
  assert.match(contracts, /data-contract-export/);
  assert.match(components, /installCommercialDirectoryContractsRegistrationV1\(\{/);
  assert.match(registration, /installContractsPageV1\(ViewLayer,/);
});

test('Contratos oferece novo, editar e confirmar compra', () => {
  assert.match(contracts, /data-contract-new/);
  assert.match(contracts, /data-contract-edit/);
  assert.match(contracts, /data-contract-confirm/);
  assert.match(contracts, /contractStatusOverrides/);
  assert.match(contracts, /Compra confirmada/);
});

test('A entrada Propostas é compatível, mas o formulário não abre por padrão', () => {
  assert.match(contracts, /ViewLayer\.prototype\.proposals = function \(\) \{\s*return this\.contracts\(\);/);
  assert.match(contracts, /proposalFormOpen:\s*false,\s*contractEditing:\s*null/);
  assert.match(app, /components\.js/);
  assert.match(css, /\.contracts-table-wrap-v2 table/);
});

test('Contratos injeta serviços de aplicação e preserva listagem, filtros e formulário da proposta', () => {
  const state = {
    view: 'contracts',
    currentActor: { role: 'owner' },
    commissionEntries: [],
    contractFilters: { query: 'Q12', status: 'all' },
  };
  const profile = { id: 'broker-1', name: 'Corretor', role: 'Corretor', creci: '123' };
  const deal = {
    id: 'PROP-1', profile: profile.id, client: 'Cliente', lot: 'Q12-L54',
    value: 'R$ 100.000,00', commission: 'R$ 6.000,00', rate: '6%',
    status: 'Proposta', stage: 'Em análise', payment: 'Entrada e parcelas',
  };
  const appStore = {
    get: () => state,
    set: (patch) => Object.assign(state, patch),
  };
  class ViewLayer {
    constructor() { this.dataset = {}; }
    render() { this.dataset.view = state.view; return 'rendered'; }
    bind() {}
  }
  ViewLayer.prototype.commissionProposal = (item) => `proposal:${item.id}`;
  ViewLayer.prototype.commissionContract = (item) => `contract:${item.id}`;
  const dependencies = {
    appStore,
    normalizeOperationalRole: (role) => role,
    commissionProfiles: [profile],
    commissionDeals: [deal],
    esc: (value) => String(value ?? ''),
    ico: (name) => `<i>${name}</i>`,
    notify() {},
    commercialScopeV1: () => ({ actor: state.currentActor, profile, elevated: true, profiles: [profile], deals: [deal] }),
    brlToNumber: () => 100000,
    formatBRL: () => 'R$ 100.000,00',
    readProposalImageAsDataUrl: async () => 'data:image/png;base64,AA==',
    PROPOSAL_VISION_PROMPT: 'proposal extraction context',
    parseProposalVisionPayload: () => null,
    saveOperationalProposal: async () => {},
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    document: { createElement: () => ({}) },
    HTMLSelectElement: class HTMLSelectElement {},
    Option: class Option {},
    Event: class Event {},
    FormData: class FormData {},
    Blob: class Blob {},
    URL: { createObjectURL() {}, revokeObjectURL() {} },
    setTimeout: () => 1,
  };
  installContractsPageV1(ViewLayer, dependencies);
  const view = new ViewLayer();

  const listing = view.contracts();
  assert.match(listing, /contracts-page-v2/);
  assert.match(listing, /PROP-1/);
  assert.match(listing, /data-contract-confirm="PROP-1"/);
  assert.match(listing, /data-contract-filter="query"/);

  state.proposalFormOpen = true;
  const form = view.contracts();
  assert.match(form, /data-my-proposal-form/);
  assert.match(form, /data-proposal-attachments/);

  state.view = 'finance';
  state.currentActor = { role: 'broker' };
  view.render();
  assert.equal(state.view, 'map');
});

# Aliança Park System UI

Biblioteca de componentes visuais e sistêmicos do Aliança Park. O foco é interface de programa: operação, caixa, etapas, CRM, notificações, permissões e registros — não páginas promocionais.

## Abrir o catálogo

Com o servidor do projeto em execução, abra `/belavista-ui/`.

## Conteúdo

| Grupo | Entregas |
| --- | --- |
| Fundação | tokens Carbon escuros/claros, IBM Plex, espaçamento, foco e superfícies |
| Visuais | `belavista-button`, `belavista-status`, `belavista-metric`, `belavista-pager`, `belavista-cash-card`, `belavista-stage-card`, `belavista-notification`, `belavista-data-table`, `belavista-chat` |
| Sistema | `createBelavistaStore`, `createBelavistaEvent`, `allocateByPriority`, `can`, matriz de papéis e formatação |
| Governança | Dono, Administrador e Encarregado; capacidades explícitas e sem alteração automática de fatos |

## Uso

```js
import '@belavista/system-ui/styles';
import { allocateByPriority, createBelavistaStore } from '@belavista/system-ui';

const store = createBelavistaStore({ role: 'foreman' });
const allocation = allocateByPriority({
  cashCents: 4_800_000,
  reserveCents: 2_000_000,
  stages
});
```

```html
<belavista-cash-card
  balance-cents="4800000"
  reserve-cents="2000000"
  allocatable-cents="2800000"
  role="owner">
</belavista-cash-card>
```

## Contratos de eventos

- `belavista-action`: botão acionado;
- `belavista-page-change`: paginação alterada;
- `belavista-stage-page-change`: mudança de etapa;
- `belavista-row-select`: linha de tabela selecionada;
- `belavista-send` e `belavista-suggestion`: interação de atendimento;
- `belavista-notification-action`: ação a partir de uma notificação.

`allocateByPriority` é uma função pura: ela não registra lançamento, não envia notificação e não altera banco. A aplicação chamadora continua responsável por autorização, auditoria e persistência.

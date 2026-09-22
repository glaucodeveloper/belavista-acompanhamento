# Contrato do `/api/operational-loop` — transição integral por IA

O endpoint recebe **um estado anterior completo + um evento humano/externo** e devolve **um novo estado completo**. O Worker não possui handlers de domínio que recalculam agenda, provisão, cronograma ou decisão antes/depois da IA.

## Request

```json
{
  "mode": "strict-ai-state-transition",
  "persist": false,
  "previousState": { "...": "estado completo" },
  "event": {
    "id": "ev-030",
    "type": "field.diary.recorded",
    "at": "2026-09-01T08:00:00-03:00",
    "actor": { "id": "enc-jose", "role": "encarregado" },
    "payload": { "...": "fatos do evento" }
  },
  "inference": {
    "provider": "nvidia",
    "strict": true,
    "requireFullState": true,
    "requireMetaTrace": true,
    "noDeterministicFallback": true
  }
}
```

## Response mínima

```json
{
  "ok": true,
  "eventApplied": { "id": "ev-030", "type": "field.diary.recorded" },
  "inference": {
    "provider": "nvidia-api",
    "model": "...",
    "strict": true
  },
  "state": {
    "version": "...",
    "project": {}, "clock": {}, "localities": [], "personnel": [],
    "stages": [], "activities": [], "materials": [], "cash": {},
    "purchases": [], "evidence": [], "agenda": [], "notifications": [],
    "resourceRequests": [], "cashRequests": [], "diary": [],
    "blockers": [], "stageSectorState": [], "constraints": [], "commercial": {}
  },
  "analysis": {
    "possibleActivities": [], "schedule": [], "blocked": [],
    "metaTrace": [
      {
        "entityType": "stage",
        "entityId": "stage-drenagem",
        "fieldsUsed": ["executionDescription", "peculiarities", "requirements", "evidenceRequirements"],
        "consequence": "..."
      }
    ]
  },
  "effects": { "realtime": {} }
}
```

## Regra central

A IA é a função de transição:

`S(n+1) = NVIDIA(S(n), evento(n+1), metadescrições)`

O Worker valida schema/autorização, chama NVIDIA e opcionalmente persiste a resposta. Ele não implementa `switch(event.type)` para decidir cronograma, compras, agenda ou notificações.

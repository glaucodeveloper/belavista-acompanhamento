# Aliança Park · Tour funcional v3.0

Composição Hyperframes em português, com capturas atuais das superfícies do sistema e apontamentos numerados para orientar uma apresentação do produto.

## O que é mostrado

1. Captação: mapa 3D, disponibilidade e atendimento contextual.
2. Decisão financeira: mapa operacional, widgets por frente e próxima ação.
3. Automação: worker conectado, eventos observados e agenda gerada.
4. Execução: atividade localizada no mapa, produção e evidências.
5. Operação integrada: pessoal, financeiro, corretores e registros.
6. Governança: cronograma, dependências e confirmação responsável.

As capturas usadas pela composição foram feitas diretamente das telas atuais do sistema local em 15/09/2026 e ficam em `assets/screens/`. A composição não referencia os prints históricos `.jpg`; a renderização usa somente os arquivos atuais abaixo:

- `current-public-leads.png` — landing pública e conversa comercial.
- `current-admin-map.png` — mapa operacional com a cena 3D finalizada.
- `current-admin-stages.png` — central de decisão, linha do tempo e RAID.
- `current-admin-activities.png` — atividades da etapa.
- `current-admin-personnel.png` — encarregados e responsáveis.
- `current-admin-finance.png` — caixa e distribuição da obra.
- `current-admin-records.png` — registros operacionais.

O quadro principal do mapa usa `assets/maps/alianca-park-map-oblique-v2.png`, uma vista aérea oblíqua derivada da captura autenticada do mapa real, com a diagonal principal, os cruzamentos, os blocos e a área social preservados e acabamento realista para a cena do vídeo. A primeira tentativa genérica (`v1`) não é usada pela composição.

Os arquivos históricos permanecem no repositório sem alteração, mas não são carregados pela apresentação. A renderização usa somente recursos locais, sem dependência de dados remotos do sistema.

Os símbolos da abertura e do encerramento usam diretamente `assets/public/alianca-park-logo-mark-transparent-v551.png`, preservando a edição transparente fornecida para a marca.

## Desenvolvimento e entrega

Na raiz do repositório:

```powershell
$env:HYPERFRAMES_EXTRACT_CACHE_DIR = "F:\\belavista-acompanhamento\\tmp\\hyperframes-extract-cache"
& F:\\belavista-acompanhamento\\node_modules\\.bin\\hyperframes.cmd preview --background --port 3017
& F:\\belavista-acompanhamento\\node_modules\\.bin\\hyperframes.cmd check --snapshots
& F:\\belavista-acompanhamento\\node_modules\\.bin\\hyperframes.cmd render --quality high --output .\\renders\\alianca-park-tour-v3.mp4 --frames-cache-dir F:\\belavista-acompanhamento\\tmp\\hyperframes-extract-cache
```

O preview abre em `http://localhost:3017/#project/product-intro`. O MP4 final fica em `renders/alianca-park-tour-v3.mp4`.

application "Aliança Park" do
  targets :android
  frontend :webview

  loading_window do
    model = system_model

    main style: {
      "minHeight" => "100vh",
      "display" => "grid",
      "placeItems" => "center",
      "padding" => "24px",
      "background" => "#161616",
      "color" => "#f4f4f4",
      "fontFamily" => "IBM Plex Sans, system-ui, sans-serif"
    } do
      section style: {
        "width" => "min(460px, 100%)",
        "padding" => "24px",
        "background" => "#262626",
        "borderTop" => "3px solid #0f62fe"
      } do
        small "ALIANÇA PARK · ANDROID"
        h1 "Carregando aplicação"
        p "Ruby/WASM · #{model.progress_percent}%"
        progress max: 100, value: model.progress_percent, style: { "width" => "100%" }
      end
    end
  end
end

class Application < Frontend::Component
  CARBON_VERSION = "v2.44.0"
  CARBON_CDN = "https://1.www.s81c.com/common/carbon/web-components/version/#{CARBON_VERSION}"

  DEFAULT_API_BASE = "http://10.0.2.2:8787"
  API_BASE_KEY = "alianca.full.android.api_base.v1"
  API_TOKEN_KEY = "alianca.full.android.api_token.v1"
  OPERATOR_KEY = "alianca.full.android.operator.v1"

  NAV_ITEMS = [
    [:map, "Dashboard inicial"],
    [:control, "Central operacional"],
    [:materials, "Materiais"],
    [:documents, "Documentos"],
    [:stages, "Etapas e Cronograma"],
    [:personnel, "Encarregados"],
    [:records, "Registros"],
    [:leads, "Leads"],
    [:instagram_leads, "Instagram Leads"],
    [:contracts, "Contratos"],
    [:commissions, "Comissões"],
    [:brokers, "Corretores"],
    [:finance, "Financeiro"],
    [:reports, "Relatórios"],
    [:settings, "Configurações"]
  ].freeze

  STAGE_NAV = [
    [:agenda, "Agenda"],
    [:actions, "Ações IA"],
    [:activities, "Atividades"]
  ].freeze

  REPORT_FAMILIES = %w[
    Financeiro
    Construção
    Suprimentos
    Comercial
    Governança
  ].freeze

  def self.stored(key, fallback = "")
    raw = JS.global[:localStorage].call(:getItem, key.to_s.to_js).to_s
    raw.empty? ? fallback : raw
  rescue StandardError
    fallback
  end

  state(
    view: :map,
    menu_open: false,
    booted: false,
    loading: false,
    online: true,
    sync_status: "Inicializando...",
    api_base: stored(API_BASE_KEY, DEFAULT_API_BASE),
    api_token: stored(API_TOKEN_KEY, ""),
    operator: stored(OPERATOR_KEY, ""),
    report_family: "Financeiro",
    selected_stage_id: nil,

    summary: {},
    stages: [],
    materials: [],
    records: [],
    leads: [],
    documents: [],
    contracts: [],
    brokers: [],
    commissions: [],
    finance_entries: [],
    personnel: [],
    app_settings: [],

    record_activity: "",
    record_responsible: stored(OPERATOR_KEY, ""),
    record_details: "",
    record_status: "Pendente",

    document_title: "",
    document_category: "Documento operacional",
    document_code: "",
    document_issuer: "",

    assistant_message: "",
    assistant_result: nil,
    last_error: nil
  )

  def mobile
    JS.global[:RubyMobileFull]
  end

  def json(value)
    JSON.parse(value.to_s)
  rescue StandardError
    {}
  end

  def dom_value(id)
    node = JS.global[:document].call(:getElementById, id.to_s.to_js)
    node ? node[:value].to_s : ""
  rescue StandardError
    ""
  end

  def dom_checked?(id)
    node = JS.global[:document].call(:getElementById, id.to_s.to_js)
    node && node[:checked].to_s == "true"
  rescue StandardError
    false
  end

  def store(key, value)
    JS.global[:localStorage].call(:setItem, key.to_s.to_js, value.to_s.to_js)
  rescue StandardError
    nil
  end

  def api_url(path)
    "#{state.api_base.to_s.sub(%r{/+$}, '')}#{path}"
  end

  def request_json(path, method: "GET", body: nil, &block)
    state.loading = true

    options = {
      method: method,
      token: state.api_token.to_s,
      body: body
    }

    mobile.call(
      :jsonFetch,
      api_url(path).to_js,
      JSON.generate(options).to_js
    ).then do |raw|
      state.loading = false
      state.online = true
      state.last_error = nil
      payload = json(raw)
      block.call(payload) if block
      raw
    end.catch do |error|
      state.loading = false
      state.online = false
      state.last_error = error.to_s
      state.sync_status = "Sem conexão: #{error}"
      nil
    end
  end

  def boot_once
    return if state.booted

    state.booted = true

    JS.global.call(
      :setTimeout,
      proc { refresh_all },
      250
    )
  rescue StandardError => error
    state.last_error = error.message
  end

  def refresh_all
    state.sync_status = "Sincronizando aplicação completa..."

    request_json("/api/mobile/full/bootstrap") do |payload|
      state.summary = payload["summary"] || {}
      state.stages = payload["stages"] || []
      state.materials = payload["materials"] || []
      state.records = payload["records"] || []
      state.leads = payload["leads"] || []
      state.documents = payload["documents"] || []
      state.contracts = payload["contracts"] || []
      state.brokers = payload["brokers"] || []
      state.commissions = payload["commissions"] || []
      state.finance_entries = payload["finance_entries"] || []
      state.personnel = payload["personnel"] || []
      state.app_settings = payload["app_settings"] || []

      state.sync_status =
        "Sincronizado #{Time.now.strftime('%H:%M')}"

      if state.selected_stage_id.nil? && state.stages.any?
        state.selected_stage_id = state.stages.first["id"]
      end
    end
  end

  def save_connection
    base = dom_value("full-api-base").strip
    token = dom_value("full-api-token").strip
    operator = dom_value("full-operator").strip

    state.api_base =
      base.empty? ? DEFAULT_API_BASE : base

    state.api_token = token
    state.operator = operator
    state.record_responsible = operator unless operator.empty?

    store(API_BASE_KEY, state.api_base)
    store(API_TOKEN_KEY, state.api_token)
    store(OPERATOR_KEY, state.operator)

    state.sync_status = "Conexão salva."
    refresh_all
  end

  def navigate(view)
    state.view = view.to_sym
    state.menu_open = false
  end

  def carbon_assets
    components = %w[
      ui-shell
      button
      tile
      text-input
      textarea
      search
      select
      checkbox
      toggle
      number-input
      data-table
      tabs
      tag
      notification
      modal
      progress-indicator
      pagination
      file-uploader
      dropdown
      structured-list
    ]

    components.each do |name|
      script(
        type: "module",
        src: "#{CARBON_CDN}/#{name}.min.js"
      )
    end

    style <<~CSS
      :root { color-scheme: dark; }
      html,body {
        margin:0;
        min-height:100%;
        background:#161616;
        font-family:'IBM Plex Sans',system-ui,sans-serif;
      }
      * { box-sizing:border-box; }
      .ap-shell { min-height:100vh; background:#161616; color:#f4f4f4; }
      .ap-topbar {
        position:sticky; top:0; z-index:60; height:48px;
        display:flex; align-items:center; gap:12px;
        padding:0 12px; background:#161616; border-bottom:1px solid #393939;
      }
      .ap-topbar-title { flex:1; min-width:0; }
      .ap-topbar-title strong { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ap-topbar-title small { color:#a8a8a8; }
      .ap-backdrop {
        position:fixed; inset:48px 0 0 0; z-index:54;
        background:rgba(0,0,0,.55);
      }
      .ap-mobile-nav {
        position:fixed; top:48px; left:0; bottom:0; z-index:55;
        width:min(86vw,320px); overflow:auto; background:#161616;
        border-right:1px solid #393939;
      }
      .ap-mobile-nav[hidden] { display:none; }
      .ap-brand { padding:16px; border-bottom:1px solid #393939; }
      .ap-brand strong { display:block; font-size:18px; }
      .ap-brand small { color:#a8a8a8; }
      .ap-mode { padding:10px 16px; color:#a8a8a8; font-size:11px; text-transform:uppercase; }
      .ap-page { padding:20px 14px 96px; max-width:1200px; margin:0 auto; }
      .ap-page-head { display:grid; gap:12px; margin-bottom:18px; }
      .ap-kicker { color:#78a9ff; font-size:11px; letter-spacing:.08em; text-transform:uppercase; }
      .ap-page-head h1 { margin:4px 0; font-size:27px; font-weight:400; }
      .ap-page-head p { margin:0; color:#c6c6c6; line-height:1.5; }
      .ap-toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
      .ap-grid { display:grid; gap:12px; }
      .ap-grid-4,.ap-grid-3,.ap-grid-2 { grid-template-columns:1fr; }
      .ap-metric { min-height:110px; }
      .ap-metric small { display:block; color:#a8a8a8; text-transform:uppercase; }
      .ap-metric strong { display:block; margin-top:10px; font-size:28px; font-weight:400; }
      .ap-metric span { display:block; margin-top:6px; color:#c6c6c6; font-size:12px; }
      .ap-section { margin-top:18px; }
      .ap-table-wrap { overflow:auto; border:1px solid #393939; background:#262626; }
      .ap-table { width:100%; min-width:720px; border-collapse:collapse; font-size:12px; }
      .ap-table th,.ap-table td { padding:11px 12px; border-bottom:1px solid #393939; text-align:left; vertical-align:top; }
      .ap-table th { background:#161616; color:#c6c6c6; position:sticky; top:0; }
      .ap-stack { display:grid; gap:12px; }
      .ap-row-actions { display:flex; gap:8px; flex-wrap:wrap; }
      .ap-form { display:grid; gap:12px; }
      .ap-stage-card { min-height:180px; }
      .ap-stage-card header { display:flex; justify-content:space-between; gap:10px; }
      .ap-stage-card progress { width:100%; margin:14px 0 8px; }
      .ap-lead-card { display:grid; gap:8px; }
      .ap-lead-meta { display:grid; gap:6px; color:#c6c6c6; font-size:12px; }
      .ap-empty { padding:28px; color:#a8a8a8; text-align:center; }
      .ap-statusbar {
        position:fixed; left:0; right:0; bottom:0; z-index:50;
        min-height:42px; padding:9px 12px;
        background:#161616; border-top:1px solid #393939;
        color:#a8a8a8; font-size:11px;
      }
      .ap-connection-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; }
      .ap-online { background:#42be65; }
      .ap-offline { background:#fa4d56; }
      @media(min-width:760px) {
        .ap-grid-2 { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .ap-grid-3 { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .ap-grid-4 { grid-template-columns:repeat(2,minmax(0,1fr)); }
      }
    CSS
  end

  def cds(name, content = "", **attrs, &block)
    tag("cds-#{name}", content, **attrs, &block)
  end

  def carbon_button(label, kind: "primary", **attrs, &callback)
    attrs[:kind] = kind
    attrs[:onclick] = callback if callback
    cds("button", label, **attrs)
  end

  def tile(content = "", **attrs, &block)
    cds("tile", content, **attrs, &block)
  end

  def status_tag(label, type: "gray")
    cds("tag", label.to_s, type: type)
  end

  def page_header(kicker, title, subtitle, actions = "")
    header class: "ap-page-head" do
      div do
        span kicker, class: "ap-kicker"
        h1 title
        p subtitle
      end
      div actions, class: "ap-toolbar"
    end
  end

  def metric(label, value, meta = nil)
    tile class: "ap-metric" do
      small label
      strong value.to_s
      span meta.to_s unless meta.nil?
    end
  end

  def format_brl(cents)
    value = cents.to_i / 100.0
    "R$ #{format('%.2f', value).gsub('.', ',')}"
  end

  def active_nav?(view)
    state.view.to_sym == view.to_sym
  end

  def side_link(view, label)
    tag(
      "cds-side-nav-link",
      label,
      href: "javascript:void(0)",
      active: active_nav?(view),
      onclick: proc { navigate(view) }
    )
  end

  def carbon_sidebar
    items = []

    NAV_ITEMS.each do |view, label|
      if view == :stages
        subitems = STAGE_NAV.map do |sub_view, sub_label|
          tag(
            "cds-side-nav-menu-item",
            sub_label,
            href: "javascript:void(0)",
            active: active_nav?(sub_view),
            onclick: proc { navigate(sub_view) }
          )
        end.join

        items << tag(
          "cds-side-nav-menu",
          side_link(view, label) + subitems,
          title: label
        )
      elsif view == :reports
        subitems = REPORT_FAMILIES.map do |family|
          tag(
            "cds-side-nav-menu-item",
            family,
            href: "javascript:void(0)",
            onclick: proc {
              state.report_family = family
              navigate(:reports)
            }
          )
        end.join

        items << tag(
          "cds-side-nav-menu",
          side_link(view, label) + subitems,
          title: label
        )
      else
        items << side_link(view, label)
      end
    end

    tag(
      "cds-side-nav",
      div(class: "ap-brand") do
        strong "Aliança Park"
        small "LOTEAMENTO · RUBY/WASM ANDROID"
      end +
      div("MODO DA SUPERFÍCIE · Aplicação completa", class: "ap-mode") +
      tag("cds-side-nav-items", items.join) +
      div(class: "ap-brand") do
        strong(state.operator.to_s.empty? ? "Operador" : state.operator.to_s)
        small(state.online ? "● Integração ativa" : "● Offline")
      end,
      expanded: true,
      "aria-label": "Navegação principal"
    )
  end

  def selected_stage
    id = state.selected_stage_id.to_s
    state.stages.find { |item| item["id"].to_s == id } || state.stages.first
  end

  def stage_by_id(id)
    state.stages.find { |item| item["id"].to_s == id.to_s }
  end

  def create_resource(resource, payload, &block)
    request_json(
      "/api/mobile/full/#{resource}",
      method: "POST",
      body: payload
    ) do |result|
      block.call(result) if block
      refresh_all
    end
  end

  def update_resource(resource, id, payload, &block)
    request_json(
      "/api/mobile/full/#{resource}/#{id}",
      method: "PATCH",
      body: payload
    ) do |result|
      block.call(result) if block
      refresh_all
    end
  end

  def page_map
    s = state.summary || {}

    metrics = div class: "ap-grid ap-grid-4" do
      metric("Completude geral", "#{s['completion'].to_i}%", "média das etapas") +
      metric("Frentes ativas", s["active_stages"].to_i, "#{state.stages.length} etapas") +
      metric("Leads", state.leads.length, "CRM + Instagram Direct") +
      metric("Registros", state.records.length, "histórico operacional")
    end

    cards = state.stages.first(9).map do |stage|
      tile class: "ap-stage-card" do
        header do
          strong stage["name"].to_s
          status_tag(
            stage["status"].to_s,
            type: stage["status"] == "Em andamento" ? "blue" : "gray"
          )
        end
        p stage["owner"].to_s
        progress max: 100, value: stage["progress"].to_f
        small "#{stage['progress'].to_i}% · #{stage['week']}"
        div class: "ap-row-actions" do
          carbon_button(
            "Abrir etapa",
            kind: "ghost",
            onclick: proc {
              state.selected_stage_id = stage["id"]
              navigate(:stages)
            }
          )
        end
      end
    end.join

    section class: "ap-page" do
      page_header(
        "DASHBOARD INICIAL · ALIANÇA PARK",
        "Panorama operacional",
        "Port Android integral da aplicação Ruby: mesmas áreas, mesmas entidades e mesma API de domínio."
      )
      metrics
      h2 "Linha do tempo de execução", class: "ap-section"
      div(cards, class: "ap-grid ap-grid-3")
    end
  end

  def page_control
    finance = state.finance_entries.first(10)
    materials = state.materials.first(20)

    section class: "ap-page" do
      page_header(
        "CENTRAL ADMINISTRATIVA",
        "Finanças, materiais, etapas e comissões",
        "Visão consolidada da operação completa no Android."
      )

      div class: "ap-stack" do
        tile do
          h2 "01 · Fluxo financeiro"
          table class: "ap-table" do
            thead do
              tr do
                th "Data"
                th "Tipo"
                th "Valor"
                th "Descrição"
              end
            end
            tbody do
              finance.map do |row|
                tr do
                  td row["entry_date"].to_s
                  td row["entry_type"].to_s
                  td format_brl(row["amount_cents"])
                  td row["description"].to_s
                end
              end.join
            end
          end
        end

        tile do
          h2 "02 · Materiais por atividade"
          div class: "ap-table-wrap" do
            table class: "ap-table" do
              thead do
                tr do
                  th "Etapa"
                  th "Material"
                  th "Quantidade"
                  th "Unidade"
                  th "Status"
                end
              end
              tbody do
                materials.map do |m|
                  tr do
                    td m["stage_name"].to_s
                    td m["name"].to_s
                    td m["quantity"].to_s
                    td m["unit"].to_s
                    td m["status"].to_s
                  end
                end.join
              end
            end
          end
        end
      end
    end
  end

  def page_materials
    rows = state.materials

    section class: "ap-page" do
      page_header(
        "SUPRIMENTOS",
        "Materiais",
        "Catálogo geral e alocação por etapa."
      )

      div class: "ap-table-wrap" do
        table class: "ap-table" do
          thead do
            tr do
              th "Etapa"
              th "Material / equipamento"
              th "Quantidade"
              th "Unidade"
              th "Situação"
              th "Escopo"
            end
          end
          tbody do
            rows.map do |m|
              tr do
                td m["stage_name"].to_s
                td m["name"].to_s
                td m["quantity"].to_s
                td m["unit"].to_s
                td m["status"].to_s
                td m["scope"].to_s
              end
            end.join
          end
        end
      end
    end
  end

  def page_documents
    rows = state.documents

    actions =
      carbon_button(
        "Novo documento",
        onclick: proc {
          create_resource(
            "documents",
            {
              title: "Novo documento",
              category: "Documento operacional"
            }
          )
        }
      )

    content =
      if rows.empty?
        div "Nenhum documento persistido ainda.", class: "ap-empty"
      else
        div class: "ap-table-wrap" do
          table class: "ap-table" do
            thead do
              tr do
                th "Título"
                th "Categoria"
                th "Código"
                th "Emissor"
                th "Arquivo"
              end
            end
            tbody do
              rows.map do |d|
                tr do
                  td d["title"].to_s
                  td d["category"].to_s
                  td d["code"].to_s
                  td d["issuer"].to_s
                  td d["file_name"].to_s
                end
              end.join
            end
          end
        end
      end

    section class: "ap-page" do
      page_header(
        "DOCUMENTOS DO LOTEAMENTO",
        "Documentos",
        "Projetos, plantas, memoriais, licenças e anexos.",
        actions
      )
      content
    end
  end

  def page_stages
    cards = state.stages.map do |stage|
      tile class: "ap-stage-card" do
        header do
          div do
            span "PRIORIDADE #{stage['priority']}", class: "ap-kicker"
            h2 stage["name"].to_s
          end
          status_tag(
            stage["status"].to_s,
            type: stage["status"] == "Em andamento" ? "blue" : "gray"
          )
        end

        p stage["owner"].to_s
        progress max: 100, value: stage["progress"].to_f
        small "#{stage['progress'].to_i}%"

        div class: "ap-row-actions" do
          carbon_button(
            "Agenda",
            kind: "ghost",
            onclick: proc {
              state.selected_stage_id = stage["id"]
              navigate(:agenda)
            }
          )
          carbon_button(
            "Atividades",
            kind: "ghost",
            onclick: proc {
              state.selected_stage_id = stage["id"]
              navigate(:activities)
            }
          )
          carbon_button(
            "Ações IA",
            kind: "ghost",
            onclick: proc {
              state.selected_stage_id = stage["id"]
              navigate(:actions)
            }
          )
        end
      end
    end.join

    section class: "ap-page" do
      page_header(
        "OBRA · HIERARQUIA OPERACIONAL",
        "Etapas da implantação",
        "Frentes, dependências, produção e evidências."
      )
      div cards, class: "ap-grid ap-grid-3"
    end
  end

  def page_agenda
    stage = selected_stage || {}

    section class: "ap-page" do
      page_header(
        "ETAPA · #{stage['name']}",
        "Agenda",
        "Compromissos, responsáveis, compras e alertas relacionados à etapa.",
        carbon_button(
          "Voltar às etapas",
          kind: "ghost",
          onclick: proc { navigate(:stages) }
        )
      )

      tile do
        h2 "Agenda operacional"
        p "A agenda é derivada das dependências, materiais, produção e registros da etapa #{stage['name']}."
      end
    end
  end

  def page_activities
    stage = selected_stage || {}
    production = stage["production"].is_a?(Hash) ? stage["production"] : {}

    section class: "ap-page" do
      page_header(
        "ETAPA · #{stage['name']}",
        "Atividades",
        "Organizador operacional da etapa.",
        carbon_button(
          "Voltar às etapas",
          kind: "ghost",
          onclick: proc { navigate(:stages) }
        )
      )

      tile do
        h2 "Produção"
        p "Meta: #{production['quantity']} #{production['unit']} · ritmo #{production['rate']} #{production['rateUnit']}"
        p "PERT, RACI, RAID e relações operacionais permanecem vinculados à mesma etapa do backend Ruby."
      end
    end
  end

  def page_actions
    stage = selected_stage || {}

    section class: "ap-page" do
      page_header(
        "ETAPA · #{stage['name']}",
        "Ações IA",
        "Impacto, prontidão e próxima ação sobre o estado operacional.",
        carbon_button(
          "Voltar às etapas",
          kind: "ghost",
          onclick: proc { navigate(:stages) }
        )
      )

      tile class: "ap-form" do
        cds(
          "textarea",
          label: "Situação atual",
          value: state.assistant_message,
          oninput: proc { |value| state.assistant_message = value.to_s }
        )
        carbon_button(
          "Analisar próxima ação",
          onclick: proc { run_assistant }
        )

        if state.assistant_result
          result = state.assistant_result
          h3 result["summary"].to_s
          p result["next_action"].to_s
        end
      end
    end
  end

  def run_assistant
    message = state.assistant_message.to_s.strip
    return if message.empty?

    request_json(
      "/api/mobile/full/assist",
      method: "POST",
      body: {
        message: message,
        stage: (selected_stage || {})["name"],
        operator: state.operator
      }
    ) do |result|
      state.assistant_result = result
    end
  end

  def page_personnel
    cards = state.personnel.map do |person|
      tile do
        span person["role"].to_s.upcase, class: "ap-kicker"
        h2 person["name"].to_s
        p person["stage_name"].to_s
        status_tag person["status"].to_s, type: "green"
      end
    end.join

    section class: "ap-page" do
      page_header(
        "OPERAÇÃO · PESSOAL E PRODUÇÃO",
        "Pessoal e formação de equipes",
        "Equipe, capacidade, vínculo na etapa e previsão operacional."
      )
      div(cards, class: "ap-grid ap-grid-3")
    end
  end

  def page_records
    form = tile class: "ap-form" do
      h2 "Adicionar registro"

      cds(
        "text-input",
        label: "Atividade",
        value: state.record_activity,
        oninput: proc { |value| state.record_activity = value.to_s }
      )

      cds(
        "text-input",
        label: "Responsável",
        value: state.record_responsible,
        oninput: proc { |value| state.record_responsible = value.to_s }
      )

      cds(
        "textarea",
        label: "Detalhes",
        value: state.record_details,
        oninput: proc { |value| state.record_details = value.to_s }
      )

      carbon_button(
        "Confirmar registro",
        onclick: proc { create_record }
      )
    end

    list =
      if state.records.empty?
        div "Nenhum registro.", class: "ap-empty"
      else
        div class: "ap-table-wrap" do
          table class: "ap-table" do
            thead do
              tr do
                th "ID"
                th "Data"
                th "Atividade"
                th "Responsável"
                th "Detalhes"
                th "Status"
              end
            end
            tbody do
              state.records.map do |r|
                tr do
                  td r["external_id"].to_s
                  td r["record_date"].to_s
                  td r["activity"].to_s
                  td r["responsible"].to_s
                  td r["details"].to_s
                  td r["status"].to_s
                end
              end.join
            end
          end
        end
      end

    section class: "ap-page" do
      page_header(
        "REGISTROS OPERACIONAIS",
        "Registros",
        "Obra → atividade → evidência → responsável → confirmação."
      )

      div class: "ap-grid ap-grid-2" do
        list
        form
      end
    end
  end

  def create_record
    activity = state.record_activity.to_s.strip
    responsible = state.record_responsible.to_s.strip
    details = state.record_details.to_s.strip

    if activity.empty? || responsible.empty?
      state.sync_status = "Preencha atividade e responsável."
      return
    end

    create_resource(
      "records",
      {
        external_id: "MOB-#{Time.now.to_i}",
        work_name: "Aliança Park",
        activity: activity,
        record_date: Date.today.to_s,
        record_time: Time.now.strftime("%H:%M"),
        responsible: responsible,
        details: details,
        status: state.record_status
      }
    ) do |_result|
      state.record_activity = ""
      state.record_details = ""
    end
  end

  def page_leads
    cards = state.leads.map do |lead|
      tile class: "ap-lead-card" do
        header do
          h2(
            lead["name"].to_s.empty? ?
              "Lead sem nome" :
              lead["name"].to_s
          )
          status_tag(
            lead["status"].to_s,
            type:
              lead["source"] == "Instagram Direct" ?
                "purple" :
                "blue"
          )
        end

        small lead["source"].to_s

        div class: "ap-lead-meta" do
          span "Lote: #{lead['lot'].to_s.empty? ? 'A definir' : lead['lot']}"
          span "Objetivo: #{lead['objective'].to_s.empty? ? 'A confirmar' : lead['objective']}"
          span "WhatsApp: #{lead['phone'].to_s.empty? ? '—' : lead['phone']}"
          span "Faixa: #{lead['budget'].to_s.empty? ? '—' : lead['budget']}"
        end

        p lead["notes"].to_s
      end
    end.join

    actions =
      carbon_button(
        "Instagram Leads",
        kind: "secondary",
        onclick: proc { navigate(:instagram_leads) }
      )

    section class: "ap-page" do
      page_header(
        "GESTÃO COMERCIAL",
        "Leads",
        "Captação pública, intenção de compra e contatos do Instagram Direct.",
        actions
      )
      div(cards, class: "ap-grid ap-grid-3")
    end
  end

  def instagram_setting(key, fallback = "")
    row =
      state.app_settings.find do |item|
        item["key"].to_s == "instagram.leads.#{key}"
      end

    row ? row["value"].to_s : fallback
  end

  def update_setting(key, value)
    request_json(
      "/api/mobile/full/settings/#{key}",
      method: "PATCH",
      body: { value: value.to_s }
    ) do |_result|
      refresh_all
    end
  end

  def page_instagram_leads
    leads =
      state.leads.select do |lead|
        lead["source"] == "Instagram Direct"
      end

    qualified =
      leads.count { |lead| lead["status"] == "Qualificado" }

    visits =
      leads.count { |lead| lead["status"] == "Visita a confirmar" }

    metrics = div class: "ap-grid ap-grid-4" do
      metric("Conversas", leads.length, "persistidas como leads") +
      metric("Qualificados", qualified, "dados mínimos completos") +
      metric("Visita", visits, "data/horário capturados") +
      metric("Mensagens", state.summary["instagram_messages"].to_i, "entrada + saída")
    end

    config = tile class: "ap-form" do
      h2 "Automação"

      cds(
        "toggle",
        label_text: "Executar automaticamente",
        checked: instagram_setting("enabled", "true") == "true",
        onchange: proc {
          current = instagram_setting("enabled", "true") == "true"
          update_setting("instagram.leads.enabled", (!current).to_s)
        }
      )

      cds(
        "toggle",
        label_text: "Enviar automaticamente",
        checked: instagram_setting("auto_send", "true") == "true",
        onchange: proc {
          current = instagram_setting("auto_send", "true") == "true"
          update_setting("instagram.leads.auto_send", (!current).to_s)
        }
      )

      cds(
        "number-input",
        label: "Intervalo (segundos)",
        min: 15,
        max: 3600,
        value: instagram_setting("interval_seconds", "60"),
        onchange: proc { |value| update_setting("instagram.leads.interval_seconds", value.to_s) }
      )

      cds(
        "number-input",
        label: "Máximo por ciclo",
        min: 1,
        max: 50,
        value: instagram_setting("max_per_cycle", "25"),
        onchange: proc { |value| update_setting("instagram.leads.max_per_cycle", value.to_s) }
      )

      div class: "ap-row-actions" do
        carbon_button(
          "Abrir Instagram Direct",
          kind: "secondary",
          onclick: proc {
            mobile.call(
              :openExternal,
              "https://www.instagram.com/direct/inbox/".to_js
            )
          }
        )
        carbon_button(
          "Abrir Leads do sistema",
          kind: "ghost",
          onclick: proc { navigate(:leads) }
        )
      end
    end

    cards = leads.map do |lead|
      tile class: "ap-lead-card" do
        h2(
          lead["name"].to_s.empty? ?
            "@#{lead['instagram_username']}" :
            lead["name"].to_s
        )
        status_tag lead["status"].to_s, type: "purple"
        p "@#{lead['instagram_username']}"
        div class: "ap-lead-meta" do
          span "WhatsApp: #{lead['phone'].to_s.empty? ? '—' : lead['phone']}"
          span "Lote: #{lead['lot'].to_s.empty? ? '—' : lead['lot']}"
          span "Objetivo: #{lead['objective'].to_s.empty? ? '—' : lead['objective']}"
          span "Faixa: #{lead['budget'].to_s.empty? ? '—' : lead['budget']}"
        end

        carbon_button(
          "Qualificar com IA",
          kind: "ghost",
          onclick: proc {
            request_json(
              "/api/mobile/full/instagram/leads/#{lead['id']}/qualify",
              method: "POST",
              body: {}
            ) { |_result| refresh_all }
          }
        )
      end
    end.join

    section class: "ap-page" do
      page_header(
        "COMERCIAL · INSTAGRAM DIRECT",
        "Instagram Leads",
        "Página navegável da SideNav Carbon no port Android completo."
      )
      metrics
      div config, class: "ap-section"
      h2 "Leads criados pelas conversas", class: "ap-section"
      if cards.empty?
        div "Nenhuma conversa sincronizada ainda.", class: "ap-empty"
      else
        div cards, class: "ap-grid ap-grid-3"
      end
    end
  end

  def page_contracts
    rows = state.contracts

    content =
      if rows.empty?
        div "Nenhum contrato persistido ainda.", class: "ap-empty"
      else
        div class: "ap-table-wrap" do
          table class: "ap-table" do
            thead do
              tr do
                th "Cliente"
                th "Lote"
                th "Valor"
                th "Corretor"
                th "Situação"
              end
            end
            tbody do
              rows.map do |c|
                tr do
                  td c["client_name"].to_s
                  td c["lot"].to_s
                  td format_brl(c["value_cents"])
                  td c["broker_name"].to_s
                  td c["status"].to_s
                end
              end.join
            end
          end
        end
      end

    section class: "ap-page" do
      page_header(
        "VENDA DE LOTE",
        "Contratos",
        "Recibos, valores, clientes, lotes e confirmação de compra."
      )
      content
    end
  end

  def page_commissions
    rows = state.commissions
    broker_by_id = state.brokers.to_h { |b| [b["id"].to_s, b] }
    contract_by_id = state.contracts.to_h { |c| [c["id"].to_s, c] }

    content =
      if rows.empty?
        div "Nenhuma comissão persistida ainda.", class: "ap-empty"
      else
        div class: "ap-table-wrap" do
          table class: "ap-table" do
            thead do
              tr do
                th "Corretor"
                th "Contrato"
                th "Venda"
                th "Comissão"
                th "Status"
              end
            end
            tbody do
              rows.map do |c|
                broker = broker_by_id[c["broker_id"].to_s] || {}
                contract = contract_by_id[c["contract_id"].to_s] || {}

                tr do
                  td broker["name"].to_s
                  td contract["external_id"].to_s
                  td format_brl(c["sale_value_cents"])
                  td format_brl(c["commission_cents"])
                  td c["status"].to_s
                end
              end.join
            end
          end
        end
      end

    section class: "ap-page" do
      page_header(
        "GESTÃO COMERCIAL",
        "Comissões",
        "Comissões por ordem de registro e carteiras de corretores."
      )
      content
    end
  end

  def page_brokers
    cards = state.brokers.map do |broker|
      tile do
        h2 broker["name"].to_s
        p broker["status"].to_s
        small [broker["phone"], broker["email"]].compact.join(" · ")
      end
    end.join

    section class: "ap-page" do
      page_header(
        "CORRETORES",
        "Corretores",
        "Situação comercial, carteira e contatos."
      )

      if cards.empty?
        div "Nenhum corretor persistido ainda.", class: "ap-empty"
      else
        div cards, class: "ap-grid ap-grid-3"
      end
    end
  end

  def page_finance
    rows = state.finance_entries

    balance =
      rows.sum do |r|
        type = r["entry_type"].to_s.downcase
        sign = type.include?("sa") || type.include?("exit") ? -1 : 1
        sign * r["amount_cents"].to_i
      end

    outflow =
      rows.select do |r|
        type = r["entry_type"].to_s.downcase
        type.include?("sa") || type.include?("exit")
      end.sum { |r| r["amount_cents"].to_i }

    section class: "ap-page" do
      page_header(
        "FINANCEIRO",
        "Financeiro",
        "Balanço e fluxo de caixa da mesma base Ruby."
      )

      div class: "ap-grid ap-grid-3" do
        metric("Caixa mestre", format_brl(balance), "saldo calculado") +
        metric("Lançamentos", rows.length, "persistidos no backend") +
        metric("Saídas", format_brl(outflow), "acumulado")
      end

      div class: "ap-table-wrap ap-section" do
        table class: "ap-table" do
          thead do
            tr do
              th "Data"
              th "Tipo"
              th "Valor"
              th "Descrição"
            end
          end
          tbody do
            rows.map do |r|
              tr do
                td r["entry_date"].to_s
                td r["entry_type"].to_s
                td format_brl(r["amount_cents"])
                td r["description"].to_s
              end
            end.join
          end
        end
      end
    end
  end

  def page_reports
    family = state.report_family.to_s

    content =
      case family
      when "Comercial"
        instagram_count =
          state.leads.count { |lead| lead["source"] == "Instagram Direct" }

        tile do
          h2 "Relatório comercial"
          p "#{state.leads.length} lead(s), #{instagram_count} vindo(s) do Instagram Direct."
        end
      when "Financeiro"
        tile do
          h2 "Relatório financeiro"
          p "#{state.finance_entries.length} lançamento(s) persistidos."
        end
      else
        average =
          if state.stages.empty?
            0
          else
            state.stages.sum { |stage| stage["progress"].to_f } / state.stages.length
          end

        tile do
          h2 family
          p "#{state.stages.length} etapas; avanço médio #{average.round(1)}%."
        end
      end

    section class: "ap-page" do
      page_header(
        "RELATÓRIOS",
        family,
        "Família de relatório selecionada pela SideNav Carbon."
      )
      content
    end
  end

  def page_settings
    section class: "ap-page" do
      page_header(
        "CONFIGURAÇÃO",
        "Configurações",
        "Conexão do Android com a mesma aplicação Ruby e integrações."
      )

      div class: "ap-stack" do
        tile class: "ap-form" do
          h2 "Backend Ruby"
          cds(
            "text-input",
            id: "full-api-base",
            label: "Endpoint",
            value: state.api_base
          )
          cds(
            "password-input",
            id: "full-api-token",
            label: "Token",
            value: state.api_token
          )
          cds(
            "text-input",
            id: "full-operator",
            label: "Operador",
            value: state.operator
          )
          carbon_button(
            "Salvar conexão",
            onclick: proc { save_connection }
          )
          carbon_button(
            "Sincronizar tudo",
            kind: "secondary",
            onclick: proc { refresh_all }
          )
        end

        tile do
          h2 "Ruby/WASM"
          p "Este APK contém o port integral das páginas do aplicativo. ActiveRecord/JDBC permanece no backend Ruby porque JDBC não é executável no WebAssembly do Android."
          status_tag "Port integral", type: "green"
        end

        tile do
          h2 "NVIDIA"
          p "A chave permanece no backend Ruby. O Android chama apenas a API da aplicação."
          status_tag "Segredo fora do frontend", type: "blue"
        end
      end
    end
  end

  def render_current_page
    case state.view.to_sym
    when :map then page_map
    when :control then page_control
    when :materials then page_materials
    when :documents then page_documents
    when :stages then page_stages
    when :agenda then page_agenda
    when :actions then page_actions
    when :activities then page_activities
    when :personnel then page_personnel
    when :records then page_records
    when :leads then page_leads
    when :instagram_leads then page_instagram_leads
    when :contracts then page_contracts
    when :commissions then page_commissions
    when :brokers then page_brokers
    when :finance then page_finance
    when :reports then page_reports
    when :settings then page_settings
    else page_map
    end
  end

  render do
    carbon_assets

    main class: "ap-shell" do
      header class: "ap-topbar" do
        carbon_button(
          "☰",
          kind: "ghost",
          onclick: proc { state.menu_open = !state.menu_open }
        )

        div class: "ap-topbar-title" do
          strong "Aliança Park"
          small "Ruby/WASM Android · aplicação completa"
        end

        carbon_button(
          "↻",
          kind: "ghost",
          onclick: proc { refresh_all }
        )
      end

      if state.menu_open
        div(
          "",
          class: "ap-backdrop",
          onclick: proc { state.menu_open = false }
        )
      end

      div(
        carbon_sidebar,
        class: "ap-mobile-nav",
        hidden: !state.menu_open
      )

      render_current_page

      div class: "ap-statusbar" do
        span(
          "",
          class:
            "ap-connection-dot #{state.online ? 'ap-online' : 'ap-offline'}"
        )
        text state.sync_status
      end
    end

    boot_once
  end
end

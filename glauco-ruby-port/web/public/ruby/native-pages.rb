# frozen_string_literal: true

# Native Glauco Ruby views of the original Aliança Park catalogue. These do not
# embed /admin; catalogue data is exported directly from the JS source files.
class Application
  def original_data
    @original_data ||= JSON.parse(JS.global[:BelavistaSnapshotJson].to_s)
  end

  def original_title
    NAV_ITEMS.to_h[state.legacy_view] || "Aliança Park"
  end

  def money(value)
    number = value.to_f
    whole, cents = format("%.2f", number).split(".")
    "R$ #{whole.reverse.gsub(/(\d{3})(?=\d)/, '\\1.').reverse},#{cents}"
  end

  def catalog_metric_card(label, value, hint = nil)
    article class: "ap-card ap-metric" do
      small label
      strong value.to_s
      p hint.to_s unless hint.nil?
    end
  end

  def section_header(eyebrow, title, subtitle = nil)
    header class: "ap-section-head" do
      small eyebrow
      h2 title
      p subtitle if subtitle
    end
  end

  def render_original_page
    div class: "ap-page" do
      header class: "ap-topbar" do
        div do
          small "ALIANÇA PARK · #{original_data.dig('project', 'city')}"
          h1 original_title
        end
        span "#{original_data.dig('project', 'phase')} · catálogo original", class: "ap-pill"
      end
      div class: "ap-content" do
        case state.legacy_view
        when "map" then render_dashboard
        when "control" then render_control
        when "stages" then render_stages
        when "records" then render_records
        when "brokers-board" then render_lots
        when "brokers" then render_commissions
        when "finance" then render_finance
        when "contracts" then render_contracts
        when "settings" then render_settings
        else render_pending_view
        end
      end
      render_lot_dialog if state.selected_lot != ""
    end
  end

  def render_dashboard
    section_header "ACOMPANHAMENTO", original_data.dig("project", "name"),
      "Visão inicial reconstruída a partir das fontes da aplicação original."
    div class: "ap-metrics" do
      catalog_metric_card "Avanço geral", "#{original_data.dig('project', 'completeness')}%", "Fase 01"
      catalog_metric_card "Colaboradores", original_data.dig("metrics", "collaborators")
      catalog_metric_card "Compras críticas", original_data.dig("metrics", "criticalPurchases")
      catalog_metric_card "Lotes com interesse", original_data.dig("metrics", "lotsWithInterest")
    end
    figure class: "ap-map-preview" do
      img src: "./assets/alianca-park-aerial-realistic-preview-v2.jpg",
        alt: "Vista aérea original do loteamento Aliança Park"
      figcaption "Vista aérea original · o modelo 3D interativo permanece em migração."
    end
    section_header "OBRA", "Frentes de execução"
    div class: "ap-grid" do
      original_data["activities"].each do |activity|
        article class: "ap-card" do
          small activity["week"]
          h3 activity["name"]
          p "#{activity['owner']} · #{activity['status']}"
          progress max: 100, value: activity["progress"]
          small "#{activity['progress']}%"
        end
      end
    end
  end

  def render_control
    section_header "CENTRAL OPERACIONAL", "Prioridades e suprimentos",
      "Frentes, pedidos e insumos do modelo original."
    div class: "ap-metrics" do
      catalog_metric_card "Atrasos", original_data.dig("metrics", "delayed")
      catalog_metric_card "Pedidos abertos", original_data.dig("metrics", "openPurchases"), original_data.dig("metrics", "openValue")
      catalog_metric_card "Estoque", original_data.dig("metrics", "inventoryValue")
    end
    section_header "COMPRAS", "Pedidos em acompanhamento"
    original_data["purchases"].each do |purchase|
      article class: "ap-line" do
        strong purchase["id"]
        span purchase["desc"]
        small "#{purchase['supplier']} · #{purchase['stage']}"
        span purchase["value"]
        span purchase["status"], class: "ap-pill"
      end
    end
  end

  def render_stages
    section_header "AGENDA DE ATIVIDADE", "Etapas e cronograma",
      "Selecione uma etapa para conferir dependências, atividades e materiais."
    div class: "ap-toolbar" do
      original_data["stages"].each do |stage|
        button stage["name"], class: state.selected_stage == stage["key"] ? "ap-selected" : "",
          onclick: proc { state.selected_stage = stage["key"] }
      end
    end
    stage = original_data["stages"].find { |item| item["key"] == state.selected_stage } || original_data["stages"].first
    div class: "ap-stage-layout" do
      aside class: "ap-card ap-materials" do
        small "MATERIAIS DA ETAPA"
        h3 stage["name"]
        (original_data.dig("stageMaterials", stage["name"]) || []).each do |material|
          details do
            summary material["name"]
            p material["scope"]
            small "#{material['quantity'] || 'A dimensionar'} #{material['unit']} · #{material['status']}"
          end
        end
      end
      section class: "ap-stage-main" do
        article class: "ap-card" do
          small "ENCAIXE NO CRONOGRAMA"
          h3 stage["name"]
          p "Depende de: #{stage['dependsOn'].empty? ? 'liberação inicial' : stage['dependsOn'].join(', ')}"
          p "Meta: #{stage.dig('production', 'quantity')} #{stage.dig('production', 'unit')} · #{stage.dig('production', 'rate')} #{stage.dig('production', 'rateUnit')}"
        end
        section_header "ATIVIDADES", "Lista de execução"
        original_data["activityCatalog"].each do |activity|
          next unless activity["nature"].downcase.include?(stage["name"].downcase.split.first) ||
            activity["name"].downcase.include?(stage["name"].downcase.split.first)
          article class: "ap-line" do
            strong activity["name"]
            small activity["nature"]
            span "Comprovantes: #{activity['execution'].grep(/Anexo|Foto|Nota|Laudo|Comprovante|Medição|Documento/i).join(', ')}"
          end
        end
      end
      aside class: "ap-card ap-activity-form" do
        small "NOVA ATIVIDADE"
        h3 "Encaixe inteligente"
        p "Etapa: #{stage['name']}"
        label "Título"
        input type: "text", placeholder: "Nome da atividade"
        label "Responsável"
        input type: "text", placeholder: "Equipe ou profissional"
        label "Previsão"
        input type: "date"
        small "Cadastro operacional ainda requer conexão à API original."
      end
    end
  end

  def render_records
    section_header "REGISTROS", "Diário e comprovantes"
    original_data["records"].each do |record|
      article class: "ap-card" do
        h3 "#{record['atividade']} · #{record['id']}"
        p "#{record['detalhes']} · #{record['responsavel']}"
        small "#{record['data']} · #{record['status']}"
      end
    end
  end

  def filtered_lots
    filter = state.lot_filter.to_s.strip.downcase
    return original_data["lots"] if filter.empty?
    original_data["lots"].select { |lot| lot["label"].downcase.include?(filter) }
  end

  def render_lots
    section_header "LOTEAMENTO", "Lotes e controle de repasse",
      "298 valores e áreas derivados da planilha de preços da aplicação original."
    div class: "ap-toolbar" do
      input id: "ap-lot-filter", type: "search", placeholder: "Buscar quadra ou lote, ex.: QA-1",
        value: state.lot_filter
      button "Filtrar", onclick: proc { state.lot_filter = dom_value("ap-lot-filter") }
      button "Limpar", onclick: proc { state.lot_filter = "" }
      span "#{filtered_lots.length} lotes", class: "ap-pill"
    end
    div class: "ap-table" do
      div class: "ap-table-head" do
        span "Lote"
        span "Quadra"
        span "Área"
        span "Preço de tabela"
      end
      filtered_lots.each do |lot|
        button class: "ap-table-row", onclick: proc { state.selected_lot = lot["label"] } do
          strong lot["label"]
          span lot["quadra"]
          span "#{lot['area']} m²"
          span money(lot["price"])
        end
      end
    end
  end

  def render_lot_dialog
    lot = original_data["lots"].find { |item| item["label"] == state.selected_lot }
    return unless lot
    div class: "ap-modal-backdrop" do
      section class: "ap-modal" do
        button "Fechar ×", class: "ap-modal-close", onclick: proc { state.selected_lot = "" }
        small "LOTE · #{lot['quadra']}"
        h2 lot["label"]
        catalog_metric_card "Preço de tabela", money(lot["price"]), "Área #{lot['area']} m²"
        p "Status, pagamento, vendedor e repasse exigem a API original para gravação autoritativa."
      end
    end
  end

  def render_commissions
    section_header "COMERCIAL", "Comissões"
    catalog_metric_card "Base de cálculo", "10%", "Parâmetro inicial do fluxo original; edição depende da API."
  end

  def render_finance
    section_header "FINANCEIRO", "Fluxo de caixa"
    original_data["cashFlowSeed"].each do |entry|
      article class: "ap-line" do
        strong entry["id"]
        span entry["date"]
        span entry["description"]
        small "#{entry['category']} · #{entry['stage']}"
        span money(entry["amountCents"].to_f / 100)
        span entry["kind"], class: "ap-pill"
      end
    end
  end

  def render_contracts
    section_header "CONTRATOS", "Contratos e vendas"
    p "A visualização ao vivo depende da conexão com o backend da aplicação original."
  end

  def render_settings
    section_header "CONFIGURAÇÕES", "Parâmetros operacionais"
    p "Parâmetros editáveis serão ligados à persistência original; este port não grava dados fictícios."
  end

  def render_pending_view
    section_header "ALIANÇA PARK", original_title
    p "Tela em migração para a DSL Ruby."
  end

  def save_instagram_prompt
    instructions = dom_value("ap-attendant-prompt").strip
    endpoint = dom_value("ap-model-endpoint").strip
    model = dom_value("ap-model-name").strip
    if instructions.empty? || model.empty? || !endpoint.match?(/\Ahttps?:\/\//)
      state.instagram_leads_status = "Informe prompt, modelo e endpoint HTTP(S) válidos."
      return
    end
    storage_put(INSTAGRAM_LEADS_INSTRUCTIONS_KEY, instructions)
    storage_put(MODEL_ENDPOINT_KEY, endpoint)
    storage_put(MODEL_NAME_KEY, model)
    state.instagram_leads_status = "Prompt e modelo salvos para os próximos ciclos do atendente."
  end

  def render_instagram_prompt_page
    section class: "ap-page" do
      div class: "ap-content ap-prompt" do
        section_header "INSTAGRAM · ATENDIMENTO", "Prompt do atendente",
          "Instruções aplicadas ao monitor que lê as conversas no Browser JEV."
        article class: "ap-card" do
          label "Instruções comerciais"
          textarea id: "ap-attendant-prompt", rows: 12 do
            text instagram_leads_instructions
          end
          label "Endpoint do modelo NVIDIA"
          input id: "ap-model-endpoint", type: "url", value: instagram_model_endpoint
          label "Nome do modelo"
          input id: "ap-model-name", type: "text", value: instagram_model_name
          p "As conversas serão enviadas ao endpoint configurado. Mantenha o proxy local confiável; o envio automático é controlado separadamente em Instagram Leads."
          button "Salvar prompt", onclick: proc { save_instagram_prompt }
          p state.instagram_leads_status
        end
      end
    end
  end
end

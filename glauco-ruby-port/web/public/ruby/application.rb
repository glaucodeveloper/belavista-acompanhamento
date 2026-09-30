application "Aliança Park Desktop" do
  targets :desktop, :android
  frontend :webview

  loading_window do
    model = system_model

    main id: "alianca-shell", style: {
      "minHeight" => "100vh",
      "display" => "grid",
      "placeItems" => "center",
      "background" => "#08101d",
      "color" => "#f4f7fb",
      "fontFamily" => "Inter, system-ui, sans-serif"
    } do
      section style: {
        "width" => "430px",
        "padding" => "28px",
        "borderRadius" => "18px",
        "background" => "#111b2b",
        "border" => "1px solid #25344c"
      } do
        h1 "Aliança Park"
        p "Inicializando desktop Glauco Ruby · #{model.progress_percent}%"

        progress max: 100,
          value: model.progress_percent,
          style: {
            "width" => "100%"
          }
      end
    end
  end
end

class Application < Frontend::Component
  LEGACY_BASE_URL =
    "http://127.0.0.1:8080/admin?glauco_shell=1"

  INSTAGRAM_URL =
    "https://www.instagram.com/direct/inbox/"

  MODEL_ENDPOINT_KEY =
    "glauco.instagram.model.endpoint.v1"

  MODEL_NAME_KEY =
    "glauco.instagram.model.name.v1"

  INSTAGRAM_LEADS_ENABLED_KEY =
    "glauco.instagram.leads.enabled.v3"

  INSTAGRAM_LEADS_AUTO_SEND_KEY =
    "glauco.instagram.leads.auto_send.v3"

  INSTAGRAM_LEADS_INTERVAL_KEY =
    "glauco.instagram.leads.interval_seconds.v3"

  INSTAGRAM_LEADS_MAX_KEY =
    "glauco.instagram.leads.max_per_cycle.v3"

  INSTAGRAM_LEADS_INSTRUCTIONS_KEY =
    "glauco.instagram.leads.instructions.v3"

  INSTAGRAM_LEADS_REPORTS_KEY =
    "glauco.instagram.leads.reports.v3"

  DEFAULT_LEADS_INSTRUCTIONS = (
    "Atenda como assistente comercial do Aliança Park. " \
    "Leia o histórico recente e responda principalmente às mensagens ainda pendentes. " \
    "Faça no máximo três perguntas por resposta. " \
    "Pergunte somente o que estiver faltando para qualificar o lead: nome completo, " \
    "WhatsApp, lote/quadra ou preferência, objetivo da compra, faixa de valor e " \
    "data/horário pretendidos para visita. Não invente disponibilidade, preço, " \
    "desconto, prazo ou confirmação de agenda. Não peça CPF, documentos, senha " \
    "ou pagamento pelo Instagram Direct."
  ).freeze

  NAV_ITEMS = [
    ["map", "Dashboard inicial"],
    ["control", "Central operacional"],
    ["materials", "Materiais"],
    ["documents", "Documentos"],
    ["stages", "Etapas e Cronograma"],
    ["personnel", "Encarregados"],
    ["records", "Registros"],
    ["leads", "Leads"],
    ["instagram_leads", "Instagram Leads"],
    ["contracts", "Contratos"],
    ["brokers", "Comissões"],
    ["brokers-board", "Corretores"],
    ["finance", "Financeiro"],
    ["reports", "Relatórios"],
    ["settings", "Configurações"]
  ].freeze

  state(
    surface: :legacy,
    legacy_view: "map",
    instagram_leads_status:
      "Monitor do Instagram aguardando inicialização."
  )

  def storage_get(key)
    value = JS.global[:localStorage].call(
      :getItem,
      key.to_s.to_js
    ).to_s
    ["null", "undefined"].include?(value) ? "" : value
  rescue StandardError
    ""
  end

  def storage_put(key, value)
    JS.global[:localStorage].call(
      :setItem,
      key.to_s.to_js,
      value.to_s.to_js
    )
  rescue StandardError
    nil
  end

  def dom_value(id)
    JS.global[:document].call(
      :getElementById,
      id.to_s.to_js
    )[:value].to_s
  rescue StandardError
    ""
  end

  def dom_checked?(id)
    node = JS.global[:document].call(
      :getElementById,
      id.to_s.to_js
    )

    node &&
      node[:checked].to_s == "true"
  rescue StandardError
    false
  end

  def set_dom_text(id, value)
    node = JS.global[:document].call(
      :getElementById,
      id.to_s.to_js
    )

    node[:textContent] =
      value.to_s.to_js
  rescue StandardError
    nil
  end

  def escape_html(value)
    value.to_s
      .gsub("&", "&amp;")
      .gsub("<", "&lt;")
      .gsub(">", "&gt;")
      .gsub('"', "&quot;")
      .gsub("'", "&#39;")
  end

  def legacy_url
    JS.global[:RubyConnection].call(:url, state.legacy_view.to_s.to_js).to_s
  end

  def open_navigation(view)
    view = view.to_s

    if view == "instagram_leads"
      state.surface = :instagram_leads
      refresh_instagram_leads_page
      return
    end

    state.legacy_view = view
    state.surface = :legacy
  end

  def open_instagram_direct
    state.surface = :instagram_direct
  end

  def back_to_instagram_leads
    state.surface = :instagram_leads
    refresh_instagram_leads_page
  end

  def active_navigation?(view)
    if view.to_s == "instagram_leads"
      state.surface == :instagram_leads ||
        state.surface == :instagram_direct
    else
      state.surface == :legacy &&
        state.legacy_view == view.to_s
    end
  end

  def nav_button(view, label)
    active = active_navigation?(view)

    button label,
      onclick: proc {
        open_navigation(view)
      },
      style: {
        "display" => "block",
        "width" => "100%",
        "padding" => "10px 12px",
        "marginBottom" => "5px",
        "textAlign" => "left",
        "borderRadius" => "9px",
        "border" =>
          active ?
            "1px solid #557aa9" :
            "1px solid transparent",
        "background" =>
          active ?
            "#17263b" :
            "transparent",
        "color" => "#e8eef7",
        "cursor" => "pointer"
      }
  end

  def instagram_leads_enabled?
    raw =
      storage_get(
        INSTAGRAM_LEADS_ENABLED_KEY
      )

    raw.empty? ? false : raw == "true"
  end

  def instagram_leads_auto_send?
    raw =
      storage_get(
        INSTAGRAM_LEADS_AUTO_SEND_KEY
      )

    raw.empty? ? false : raw == "true"
  end

  def instagram_leads_interval_seconds
    raw =
      storage_get(
        INSTAGRAM_LEADS_INTERVAL_KEY
      )

    value =
      raw.empty? ? 60 : raw.to_i

    [[value, 15].max, 3600].min
  end

  def instagram_leads_max_per_cycle
    raw =
      storage_get(
        INSTAGRAM_LEADS_MAX_KEY
      )

    value =
      raw.empty? ? 25 : raw.to_i

    [[value, 1].max, 50].min
  end

  def instagram_leads_instructions
    raw =
      storage_get(
        INSTAGRAM_LEADS_INSTRUCTIONS_KEY
      )

    raw.empty? ?
      DEFAULT_LEADS_INSTRUCTIONS :
      raw
  end

  def instagram_lead_reports
    raw =
      storage_get(
        INSTAGRAM_LEADS_REPORTS_KEY
      )

    return [] if raw.empty?

    parsed = JSON.parse(raw)

    parsed.is_a?(Array) ?
      parsed :
      []
  rescue StandardError
    []
  end

  def save_instagram_lead_reports(reports)
    current =
      instagram_lead_reports

    incoming =
      Array(reports)

    combined =
      (incoming + current)
        .first(250)

    storage_put(
      INSTAGRAM_LEADS_REPORTS_KEY,
      JSON.generate(combined)
    )

    combined
  end

  def ensure_instagram_completion_backend
    # The legacy Aliança Park server loads F:\belavista-acompanhamento\.env
    # and exposes an OpenAI-compatible proxy without exposing NVIDIA_API_KEY.
    storage_put(
      MODEL_ENDPOINT_KEY,
      "http://127.0.0.1:8080/v1/chat/completions"
    )

    storage_put(
      MODEL_NAME_KEY,
      "alianca-park-nvidia"
    )
  end

  def instagram_leads_policy
    {
      instructions:
        instagram_leads_instructions
    }
  end

  def save_instagram_leads_configuration
    enabled =
      dom_checked?(
        "instagram-leads-enabled"
      )

    auto_send =
      dom_checked?(
        "instagram-leads-auto-send"
      )

    interval =
      dom_value(
        "instagram-leads-interval"
      ).to_i

    max =
      dom_value(
        "instagram-leads-max"
      ).to_i

    instructions =
      dom_value(
        "instagram-leads-instructions"
      ).strip

    interval =
      [[interval, 15].max, 3600].min

    max =
      [[max, 1].max, 50].min

    instructions =
      DEFAULT_LEADS_INSTRUCTIONS if
        instructions.empty?

    storage_put(
      INSTAGRAM_LEADS_ENABLED_KEY,
      enabled ? "true" : "false"
    )

    storage_put(
      INSTAGRAM_LEADS_AUTO_SEND_KEY,
      auto_send ? "true" : "false"
    )

    storage_put(
      INSTAGRAM_LEADS_INTERVAL_KEY,
      interval.to_s
    )

    storage_put(
      INSTAGRAM_LEADS_MAX_KEY,
      max.to_s
    )

    storage_put(
      INSTAGRAM_LEADS_INSTRUCTIONS_KEY,
      instructions
    )

    state.instagram_leads_status =
      enabled ?
        "Configuração salva. Monitor automático ativo." :
        "Configuração salva. Monitor automático desativado."

    set_dom_text(
      "instagram-leads-status",
      state.instagram_leads_status
    )

    restart_instagram_leads_monitor
  end

  def run_instagram_leads_cycle(source: "manual")
    if platform.target.to_s == "android"
      state.instagram_leads_status = "Monitor de Direct disponível no desktop. No Android, use Leads do programa para acompanhar e qualificar."
      return
    end
    return if @instagram_leads_running

    ensure_instagram_completion_backend

    @instagram_leads_running = true

    state.instagram_leads_status =
      "#{source}: lendo Directs em relevo..."

    set_dom_text(
      "instagram-leads-status",
      state.instagram_leads_status
    )

    browser_jev(
      "instagram-browser"
    ).instagram_leads_autopilot(
      policy: instagram_leads_policy,
      auto_send:
        instagram_leads_auto_send?,
      max_conversations:
        instagram_leads_max_per_cycle,
      on_error: proc { |error|
        @instagram_leads_running = false

        state.instagram_leads_status =
          "#{source}: erro: #{error}"

        set_dom_text(
          "instagram-leads-status",
          state.instagram_leads_status
        )

        schedule_next_instagram_leads_cycle
      }
    ) do |result|
      @instagram_leads_running = false

      if result["authRequired"]
        state.instagram_leads_status =
          "Instagram aguardando login manual. " \
          "A sessão permanece carregada e o monitor tentará novamente."
      else
        save_instagram_lead_reports(
          result["reports"]
        )

        refresh_instagram_leads_page

        state.instagram_leads_status =
          "#{source}: " \
          "#{result["processedCount"].to_i} processada(s), " \
          "#{result["repliedCount"].to_i} enviada(s), " \
          "#{result["draftCount"].to_i} rascunho(s), " \
          "#{result["remainingUnread"].to_i} ainda em relevo."
      end

      set_dom_text(
        "instagram-leads-status",
        state.instagram_leads_status
      )

      schedule_next_instagram_leads_cycle
    end
  rescue StandardError => error
    @instagram_leads_running = false

    state.instagram_leads_status =
      "#{source}: erro ao iniciar: #{error.message}"

    set_dom_text(
      "instagram-leads-status",
      state.instagram_leads_status
    )

    schedule_next_instagram_leads_cycle
  end

  def schedule_next_instagram_leads_cycle
    return unless instagram_leads_enabled?

    if @instagram_leads_timer
      JS.global.call(
        :clearTimeout,
        @instagram_leads_timer
      )
    end

    callback = proc do
      @instagram_leads_timer = nil

      run_instagram_leads_cycle(
        source: "monitor"
      )
    end

    @instagram_leads_timer =
      JS.global.call(
        :setTimeout,
        callback,
        instagram_leads_interval_seconds * 1_000
      )
  rescue StandardError
    nil
  end

  def stop_instagram_leads_monitor
    if @instagram_leads_timer
      JS.global.call(
        :clearTimeout,
        @instagram_leads_timer
      )

      @instagram_leads_timer = nil
    end

    @instagram_leads_monitor_started =
      false
  rescue StandardError
    nil
  end

  def restart_instagram_leads_monitor
    stop_instagram_leads_monitor
    start_instagram_leads_monitor
  end

  def start_instagram_leads_monitor
    return if @instagram_leads_monitor_started
    return unless instagram_leads_enabled?

    ensure_instagram_completion_backend

    @instagram_leads_monitor_started =
      true

    callback = proc do
      run_instagram_leads_cycle(
        source: "on start"
      )
    end

    @instagram_leads_timer =
      JS.global.call(
        :setTimeout,
        callback,
        8_000
      )
  rescue StandardError => error
    state.instagram_leads_status =
      "Falha ao iniciar monitor: #{error.message}"
  end

  def refresh_instagram_leads_page
    reports =
      instagram_lead_reports

    qualified =
      reports.count do |report|
        report.dig(
          "qualification",
          "readyForLead"
        )
      end

    visits =
      reports.count do |report|
        report.dig(
          "qualification",
          "readyForVisit"
        )
      end

    sent =
      reports.count do |report|
        report["status"] == "sent"
      end

    set_dom_text(
      "instagram-leads-total",
      reports.length
    )

    set_dom_text(
      "instagram-leads-qualified",
      qualified
    )

    set_dom_text(
      "instagram-leads-visits",
      visits
    )

    set_dom_text(
      "instagram-leads-sent",
      sent
    )

    list =
      JS.global[:document].call(
        :getElementById,
        "instagram-leads-list".to_js
      )

    return unless list

    html =
      reports.first(60).map do |report|
        draft =
          report["leadDraft"] || {}

        qualification =
          report["qualification"] || {}

        name =
          draft["name"].to_s.empty? ?
            report["conversation"].to_s :
            draft["name"].to_s

        preference =
          draft["lotLabel"].to_s.empty? ?
            draft["lotId"].to_s :
            draft["lotLabel"].to_s

        visit =
          [
            draft["visitDate"],
            draft["visitTime"]
          ]
            .compact
            .reject {
              |value|
              value.to_s.empty?
            }
            .join(" ")

        missing =
          Array(
            qualification["missing"]
          ).join(", ")

        <<~HTML
          <article style="padding:14px;border:1px solid #26344a;border-radius:12px;background:#111a29;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;gap:12px">
              <strong>#{escape_html(name)}</strong>
              <small>#{escape_html(qualification["stage"] || "qualificacao")}</small>
            </div>
            <div style="margin-top:8px;font-size:12px;line-height:1.6;opacity:.88">
              WhatsApp: #{escape_html(draft["whatsapp"].to_s.empty? ? "—" : draft["whatsapp"])}<br>
              Lote/preferência: #{escape_html(preference.empty? ? "—" : preference)}<br>
              Objetivo: #{escape_html(draft["objective"].to_s.empty? ? "—" : draft["objective"])}<br>
              Faixa de valor: #{escape_html(draft["budget"].to_s.empty? ? "—" : draft["budget"])}<br>
              Visita: #{escape_html(visit.empty? ? "—" : visit)}<br>
              Próxima ação: #{escape_html(report["nextAction"] || "qualificar")}<br>
              Faltando: #{escape_html(missing.empty? ? "nenhum campo do estágio atual" : missing)}
            </div>
            <p style="font-size:12px;line-height:1.55;margin:10px 0 0;white-space:pre-wrap">#{escape_html(report["reply"] || "")}</p>
          </article>
        HTML
      end.join

    list[:innerHTML] =
      html.to_js
  rescue StandardError
    nil
  end

  def metric_card(label, value, id)
    article style: {
      "padding" => "16px",
      "borderRadius" => "12px",
      "background" => "#111a29",
      "border" => "1px solid #26344a"
    } do
      small label,
        style: {
          "opacity" => "0.7"
        }

      h2 value.to_s,
        id: id,
        style: {
          "margin" => "8px 0 0"
        }
    end
  end

  def render_instagram_leads_page
    reports =
      instagram_lead_reports

    qualified =
      reports.count {
        |report|
        report.dig(
          "qualification",
          "readyForLead"
        )
      }

    visits =
      reports.count {
        |report|
        report.dig(
          "qualification",
          "readyForVisit"
        )
      }

    sent =
      reports.count {
        |report|
        report["status"] == "sent"
      }

    section style: {
      "height" => "100%",
      "overflowY" => "auto",
      "padding" => "26px",
      "boxSizing" => "border-box",
      "background" => "#0b1320"
    } do
      div style: {
        "maxWidth" => "1060px",
        "margin" => "0 auto"
      } do
        header style: {
          "display" => "flex",
          "alignItems" => "center",
          "justifyContent" => "space-between",
          "gap" => "16px",
          "marginBottom" => "10px"
        } do
          div do
            small "COMERCIAL · INSTAGRAM DIRECT",
              style: {
                "opacity" => "0.62"
              }

            h1 "Instagram Leads",
              style: {
                "margin" => "4px 0"
              }

            p(
              "O Direct real permanece carregado em segundo plano. " \
              "O monitor lê as conversas em relevo, qualifica o interesse " \
              "e responde automaticamente conforme a configuração."
            )
          end

          button "Abrir Instagram Direct",
            onclick: proc {
              open_instagram_direct
            }
        end

        div style: {
          "display" => "grid",
          "gridTemplateColumns" =>
            "repeat(4, minmax(0, 1fr))",
          "gap" => "10px",
          "margin" => "22px 0"
        } do
          metric_card(
            "Histórico",
            reports.length,
            "instagram-leads-total"
          )

          metric_card(
            "Lead pronto",
            qualified,
            "instagram-leads-qualified"
          )

          metric_card(
            "Visita pronta",
            visits,
            "instagram-leads-visits"
          )

          metric_card(
            "Enviadas",
            sent,
            "instagram-leads-sent"
          )
        end

        section style: {
          "padding" => "20px",
          "borderRadius" => "14px",
          "background" => "#111a29",
          "border" => "1px solid #26344a",
          "marginBottom" => "20px"
        } do
          h2 "Automação"

          label style: {
            "display" => "flex",
            "alignItems" => "center",
            "gap" => "8px",
            "marginBottom" => "12px"
          } do
            input id: "instagram-leads-enabled",
              type: "checkbox",
              checked:
                instagram_leads_enabled?

            span(
              "Executar automaticamente em segundo plano desde o on start"
            )
          end

          label style: {
            "display" => "flex",
            "alignItems" => "center",
            "gap" => "8px",
            "marginBottom" => "18px"
          } do
            input id: "instagram-leads-auto-send",
              type: "checkbox",
              checked:
                instagram_leads_auto_send?

            span "Enviar automaticamente a resposta gerada"
          end

          div style: {
            "display" => "grid",
            "gridTemplateColumns" =>
              "180px 180px",
            "gap" => "12px",
            "marginBottom" => "18px"
          } do
            div do
              label "Intervalo (segundos)"

              input id: "instagram-leads-interval",
                type: "number",
                min: 15,
                max: 3600,
                value:
                  instagram_leads_interval_seconds,
                style: {
                  "width" => "100%",
                  "boxSizing" => "border-box",
                  "padding" => "10px",
                  "marginTop" => "7px"
                }
            end

            div do
              label "Máximo por ciclo"

              input id: "instagram-leads-max",
                type: "number",
                min: 1,
                max: 50,
                value:
                  instagram_leads_max_per_cycle,
                style: {
                  "width" => "100%",
                  "boxSizing" => "border-box",
                  "padding" => "10px",
                  "marginTop" => "7px"
                }
            end
          end

          label "Orientação comercial adicional"

          textarea id: "instagram-leads-instructions",
            rows: 7,
            style: {
              "width" => "100%",
              "boxSizing" => "border-box",
              "padding" => "12px",
              "marginTop" => "8px",
              "marginBottom" => "16px",
              "borderRadius" => "10px"
            } do
              text instagram_leads_instructions
            end

          div style: {
            "display" => "flex",
            "gap" => "8px",
            "flexWrap" => "wrap"
          } do
            button "Salvar e aplicar",
              onclick: proc {
                save_instagram_leads_configuration
              }

            button "Executar agora",
              onclick: proc {
                run_instagram_leads_cycle(
                  source: "manual"
                )
              }
          end

          p state.instagram_leads_status,
            id: "instagram-leads-status",
            style: {
              "marginTop" => "14px",
              "fontSize" => "12px",
              "lineHeight" => "1.5",
              "opacity" => "0.8"
            }
        end

        h2 "Leads processados"

        div id: "instagram-leads-list" do
          reports.first(30).each do |report|
            draft =
              report["leadDraft"] || {}

            qualification =
              report["qualification"] || {}

            article style: {
              "padding" => "14px",
              "border" => "1px solid #26344a",
              "borderRadius" => "12px",
              "background" => "#111a29",
              "marginBottom" => "10px"
            } do
              strong(
                draft["name"].to_s.empty? ?
                  report["conversation"].to_s :
                  draft["name"].to_s
              )

              p(
                "#{qualification["stage"] || "qualificacao"} · " \
                "#{report["nextAction"] || "qualificar"}",
                style: {
                  "fontSize" => "12px",
                  "opacity" => "0.72"
                }
              )
            end
          end
        end
      end
    end
  end

  def render_instagram_direct_page
    section style: {
      "height" => "100%",
      "display" => "flex",
      "flexDirection" => "column",
      "background" => "#0b1320"
    } do
      header style: {
        "display" => "flex",
        "alignItems" => "center",
        "gap" => "10px",
        "padding" => "10px 12px",
        "borderBottom" => "1px solid #26344a",
        "background" => "#0d1726"
      } do
        button "← Instagram Leads",
          onclick: proc {
            back_to_instagram_leads
          }

        strong "Instagram Direct"

        small(
          "Sessão persistente · a automação usa esta mesma página",
          style: {
            "opacity" => "0.66"
          }
        )
      end
    end
  end

  render do
    main style: {
      "height" => "100vh",
      "display" => "grid",
      "gridTemplateColumns" =>
        "236px minmax(0, 1fr)",
      "overflow" => "hidden",
      "fontFamily" =>
        "Inter, system-ui, sans-serif",
      "background" => "#08101d",
      "color" => "#e8eef7"
    } do
      aside id: "alianca-nav", style: {
        "padding" => "16px 12px",
        "background" => "#0b1422",
        "borderRight" => "1px solid #243249",
        "overflowY" => "auto"
      } do
        div style: {
          "padding" => "6px 8px 18px"
        } do
          strong "Aliança Park",
            style: {
              "display" => "block",
              "fontSize" => "17px"
            }

          small "LOTEAMENTO · #{platform.target.to_s.upcase}",
            style: {
              "opacity" => "0.58"
            }
        end

        label "Servidor do programa", for: "alianca-server"
        input id: "alianca-server", type: "url", value: JS.global[:RubyConnection].call(:base).to_s,
          style: {"width" => "100%", "boxSizing" => "border-box", "margin" => "8px 0", "padding" => "8px"}
        button "Conectar", onclick: proc { JS.global[:RubyConnection].call(:save, dom_value("alianca-server").to_js); state.surface = :legacy },
          style: {"padding" => "8px", "marginBottom" => "16px"}
        NAV_ITEMS.each do |view, label|
          nav_button(view, label)
        end
      end

      section style: {
        "position" => "relative",
        "minWidth" => "0",
        "minHeight" => "0",
        "overflow" => "hidden"
      } do
        # Entire current Aliança Park program. It is mounted once and remains
        # alive while Instagram Leads is in front of it.
        div id: "alianca-program-layer",
          style: {
            "position" => "absolute",
            "inset" => "0",
            "visibility" =>
              state.surface == :legacy ?
                "visible" :
                "hidden",
            "pointerEvents" =>
              state.surface == :legacy ?
                "auto" :
                "none",
            "zIndex" =>
              state.surface == :legacy ?
                "30" :
                "5"
          } do
            webview_content(
              id: "alianca-program",
              url: legacy_url,
              title: "Aliança Park",
              style: {
                "position" => "absolute",
                "inset" => "0",
                "width" => "100%",
                "height" => "100%"
              }
            )
          end

        # Native Instagram Direct WebView. It is created at startup even when
        # invisible so login/session/DOM remain alive for the background agent.
        div id: "instagram-direct-layer",
          style: {
            "position" => "absolute",
            "inset" => "0",
            "visibility" =>
              state.surface == :instagram_direct ?
                "visible" :
                "hidden",
            "pointerEvents" =>
              state.surface == :instagram_direct ?
                "auto" :
                "none",
            "zIndex" =>
              state.surface == :instagram_direct ?
                "40" :
                "4"
          } do
            render_instagram_direct_page

            div style: {
              "position" => "absolute",
              "left" => "0",
              "right" => "0",
              "top" => "48px",
              "bottom" => "0"
            } do
              webview_content(
                id: "instagram-browser",
                url: INSTAGRAM_URL,
                title: "Instagram Direct",
                style: {
                  "position" => "absolute",
                  "inset" => "0",
                  "width" => "100%",
                  "height" => "100%"
                }
              )
            end
          end

        div id: "instagram-leads-layer",
          style: {
            "position" => "absolute",
            "inset" => "0",
            "visibility" =>
              state.surface == :instagram_leads ?
                "visible" :
                "hidden",
            "pointerEvents" =>
              state.surface == :instagram_leads ?
                "auto" :
                "none",
            "zIndex" =>
              state.surface == :instagram_leads ?
                "35" :
                "3"
          } do
            render_instagram_leads_page
          end
      end
    end

    start_instagram_leads_monitor
  end
end

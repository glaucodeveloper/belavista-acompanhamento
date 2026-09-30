require "webrick"
require "json"
require "date"
require_relative "../database"
require_relative "nvidia"
require_relative "instagram_leads"

module AliancaPark
  module Services
    class FullMobileApi
      DEFAULT_BIND = "0.0.0.0"
      DEFAULT_PORT = 8787

      RESOURCE_MAP = {
        "stages" => ProjectStage,
        "materials" => Material,
        "records" => WorkRecord,
        "leads" => Lead,
        "lead_messages" => LeadMessage,
        "documents" => Document,
        "contracts" => Contract,
        "brokers" => Broker,
        "commissions" => Commission,
        "finance_entries" => FinanceEntry,
        "personnel" => Person,
        "app_settings" => AppSetting
      }.freeze

      RESOURCE_FIELDS = {
        "stages" => %w[key name priority status progress owner week depends_on_json production_json materials_json],
        "materials" => %w[code name stage_name quantity unit status scope],
        "records" => %w[external_id work_name activity record_date record_time responsible details status evidence_json],
        "leads" => %w[source external_id instagram_username name phone email lot objective budget status notes last_contact_at],
        "lead_messages" => %w[lead_id direction channel author body external_id],
        "documents" => %w[external_id title category code issuer document_date description file_name file_type source_url],
        "contracts" => %w[external_id client_name lot value_cents status broker_name notes],
        "brokers" => %w[external_id name phone email status],
        "commissions" => %w[broker_id contract_id sale_value_cents commission_cents status],
        "finance_entries" => %w[external_id entry_date entry_type link_type link_id amount_cents description],
        "personnel" => %w[external_id name role stage_name status skills_json],
        "app_settings" => %w[key value]
      }.freeze

      class Unauthorized < StandardError; end

      class << self
        attr_reader :server, :thread

        def start!(
          bind: ENV.fetch("ALIANCAPARK_MOBILE_BIND", DEFAULT_BIND),
          port: ENV.fetch("ALIANCAPARK_MOBILE_PORT", DEFAULT_PORT).to_i
        )
          return server if server

          @server = WEBrick::HTTPServer.new(
            BindAddress: bind,
            Port: port,
            AccessLog: [],
            Logger: WEBrick::Log.new($stderr, WEBrick::Log::WARN)
          )

          @server.mount_proc("/api/mobile/full") do |request, response|
            handle(request, response)
          end

          @thread = Thread.new { @server.start }
          @thread.abort_on_exception = true
          at_exit { stop! }

          warn "[alianca-full-mobile-api] http://#{bind}:#{port}/api/mobile/full"
          server
        end

        def stop!
          @server&.shutdown
          @thread&.join(2)
        rescue StandardError
          nil
        ensure
          @server = nil
          @thread = nil
        end

        private

        def handle(request, response)
          cors!(response)

          if request.request_method == "OPTIONS"
            response.status = 204
            response.body = ""
            return
          end

          authorize!(request)

          path = request.path.sub(%r{\A/api/mobile/full}, "")

          if request.request_method == "GET" && path == "/health"
            return json!(
              response,
              200,
              ok: true,
              service: "alianca-park-full-mobile",
              time: Time.now.iso8601
            )
          end

          if request.request_method == "GET" && path == "/bootstrap"
            return json!(response, 200, bootstrap_payload)
          end

          if request.request_method == "POST" && path == "/assist"
            return json!(response, 200, assist(parse_json(request)))
          end

          if request.request_method == "PATCH" &&
             (match = path.match(%r{\A/settings/(.+)\z}))
            key = WEBrick::HTTPUtils.unescape(match[1])
            row = AppSetting.put(key, parse_json(request)["value"].to_s)
            return json!(response, 200, setting_hash(row))
          end

          if request.request_method == "POST" &&
             (match = path.match(%r{\A/instagram/leads/(\d+)/qualify\z}))
            lead = Lead.find(match[1].to_i)
            result = InstagramLeads.new.qualify_and_reply!(lead)
            return json!(
              response,
              200,
              lead: model_hash(lead.reload),
              result: result
            )
          end

          if request.request_method == "GET" &&
             (match = path.match(%r{\A/leads/(\d+)/messages\z}))
            rows = LeadMessage.where(lead_id: match[1].to_i).order(:id)
            return json!(
              response,
              200,
              messages: rows.map { |row| model_hash(row) }
            )
          end

          if request.request_method == "POST" &&
             (match = path.match(%r{\A/leads/(\d+)/messages\z}))
            payload = parse_json(request)
            message = LeadMessage.create!(
              lead_id: match[1].to_i,
              direction: payload["direction"].to_s.empty? ? "outbound" : payload["direction"],
              channel: payload["channel"].to_s.empty? ? "system" : payload["channel"],
              author: payload["author"],
              body: payload["body"].to_s,
              external_id: payload["external_id"]
            )
            return json!(response, 201, message: model_hash(message))
          end

          if (match = path.match(%r{\A/([a-z_]+)(?:/(\d+))?\z}))
            resource = match[1]
            id = match[2]&.to_i
            model = RESOURCE_MAP[resource]
            return json!(response, 404, error: "Recurso não encontrado.") unless model

            case request.request_method
            when "GET"
              if id
                row = model.find(id)
                return json!(response, 200, resource => model_hash(row))
              end

              rows = default_scope(resource, model)
              return json!(
                response,
                200,
                resource => rows.map { |row| model_hash(row) }
              )
            when "POST"
              payload = filter_payload(resource, parse_json(request))
              row = model.create!(payload)
              return json!(response, 201, resource.singularize => model_hash(row))
            when "PATCH"
              return json!(response, 400, error: "ID obrigatório.") unless id
              row = model.find(id)
              row.update!(filter_payload(resource, parse_json(request)))
              return json!(response, 200, resource.singularize => model_hash(row))
            when "DELETE"
              return json!(response, 400, error: "ID obrigatório.") unless id
              row = model.find(id)
              row.destroy!
              return json!(response, 200, ok: true, id: id)
            end
          end

          json!(response, 404, error: "Rota móvel completa não encontrada.")
        rescue Unauthorized => error
          json!(response, 401, error: error.message)
        rescue ActiveRecord::RecordNotFound
          json!(response, 404, error: "Registro não encontrado.")
        rescue JSON::ParserError
          json!(response, 400, error: "JSON inválido.")
        rescue StandardError => error
          warn "[alianca-full-mobile-api] #{error.class}: #{error.message}"
          json!(response, 500, error: error.message)
        end

        def authorize!(request)
          expected = ENV.fetch("ALIANCAPARK_MOBILE_TOKEN", "").to_s.strip
          return if expected.empty?

          actual = request["authorization"].to_s.sub(/\ABearer\s+/i, "").strip
          raise Unauthorized, "Token móvel inválido." unless secure_equal?(actual, expected)
        end

        def secure_equal?(left, right)
          return false unless left.bytesize == right.bytesize

          result = 0
          left.bytes.zip(right.bytes) { |a, b| result |= a ^ b }
          result.zero?
        end

        def cors!(response)
          response["Access-Control-Allow-Origin"] = "*"
          response["Access-Control-Allow-Headers"] = "content-type, authorization"
          response["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
          response["Cache-Control"] = "no-store"
        end

        def json!(response, status, payload)
          response.status = status
          response["Content-Type"] = "application/json; charset=utf-8"
          response.body = JSON.generate(payload)
        end

        def parse_json(request)
          body = request.body.to_s
          body.empty? ? {} : JSON.parse(body)
        end

        def filter_payload(resource, payload)
          allowed = RESOURCE_FIELDS.fetch(resource, [])
          payload.each_with_object({}) do |(key, value), out|
            out[key] = value if allowed.include?(key.to_s)
          end
        end

        def default_scope(resource, model)
          case resource
          when "stages"
            model.order(priority: :desc, id: :asc)
          when "materials"
            model.order(stage_name: :asc, name: :asc)
          when "records", "documents", "contracts", "commissions", "finance_entries"
            model.order(id: :desc)
          when "leads"
            model.order(updated_at: :desc)
          when "brokers", "personnel"
            model.order(name: :asc)
          when "lead_messages"
            model.order(:id)
          when "app_settings"
            model.order(:key)
          else
            model.all
          end
        end

        def model_hash(row)
          attributes = row.attributes.transform_values do |value|
            case value
            when Date, Time, DateTime
              value.iso8601
            else
              value
            end
          end

          if row.is_a?(ProjectStage)
            attributes["depends_on"] =
              parse_json_value(row.depends_on_json, [])
            attributes["production"] =
              parse_json_value(row.production_json, {})
            attributes["materials"] =
              parse_json_value(row.materials_json, [])
          end

          attributes
        end

        def setting_hash(row)
          {
            id: row.id,
            key: row.key,
            value: row.value
          }
        end

        def parse_json_value(raw, fallback)
          value = JSON.parse(raw.to_s)
          value.nil? ? fallback : value
        rescue StandardError
          fallback
        end

        def bootstrap_payload
          stages = default_scope("stages", ProjectStage).map { |row| model_hash(row) }
          materials = default_scope("materials", Material).map { |row| model_hash(row) }
          records = default_scope("records", WorkRecord).limit(200).map { |row| model_hash(row) }
          leads = default_scope("leads", Lead).limit(250).map { |row| model_hash(row) }
          documents = default_scope("documents", Document).limit(200).map { |row| model_hash(row) }
          contracts = default_scope("contracts", Contract).limit(200).map { |row| model_hash(row) }
          brokers = default_scope("brokers", Broker).limit(200).map { |row| model_hash(row) }
          commissions = default_scope("commissions", Commission).limit(200).map { |row| model_hash(row) }
          finance = default_scope("finance_entries", FinanceEntry).limit(500).map { |row| model_hash(row) }
          personnel = default_scope("personnel", Person).limit(200).map { |row| model_hash(row) }
          settings = default_scope("app_settings", AppSetting).map { |row| setting_hash(row) }

          completion =
            if stages.empty?
              0
            else
              (
                stages.sum { |stage| stage["progress"].to_f } /
                stages.length
              ).round
            end

          {
            summary: {
              completion: completion,
              active_stages: stages.count { |stage| stage["status"] == "Em andamento" },
              records: records.length,
              leads: leads.length,
              instagram_messages:
                LeadMessage.where(channel: "instagram-direct").count,
              materials: materials.length,
              people: personnel.length,
              documents: documents.length,
              contracts: contracts.length
            },
            stages: stages,
            materials: materials,
            records: records,
            leads: leads,
            documents: documents,
            contracts: contracts,
            brokers: brokers,
            commissions: commissions,
            finance_entries: finance,
            personnel: personnel,
            app_settings: settings,
            generated_at: Time.now.iso8601
          }
        end

        def assist(payload)
          message = payload["message"].to_s.strip
          raise "Informe a situação da frente." if message.empty?

          stage = payload["stage"].to_s
          operator = payload["operator"].to_s

          prompt = <<~PROMPT
            Você auxilia a operação do loteamento Aliança Park.
            Analise a situação fornecida e retorne SOMENTE JSON válido:
            {
              "summary":"resumo factual curto",
              "next_action":"próxima ação objetiva",
              "risk":"risco ou vazio"
            }

            ETAPA: #{stage}
            OPERADOR: #{operator}
            SITUAÇÃO: #{message}

            Não invente medições, confirmações ou fatos ausentes.
          PROMPT

          raw = Nvidia.new.complete(
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 500,
            temperature: 0.2
          )

          parse_model_json(raw)
        end

        def parse_model_json(raw)
          text =
            raw.to_s
              .strip
              .sub(/\A```(?:json)?\s*/i, "")
              .sub(/\s*```\z/, "")

          JSON.parse(text)
        rescue JSON::ParserError
          first = text.index("{")
          last = text.rindex("}")
          raise "A IA não retornou JSON válido." unless first && last && last > first

          JSON.parse(text[first..last])
        end
      end
    end
  end
end

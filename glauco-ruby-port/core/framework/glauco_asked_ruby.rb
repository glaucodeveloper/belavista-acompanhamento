Encoding.default_external = Encoding::UTF_8
Encoding.default_internal = Encoding::UTF_8

PROJECT_ROOT = File.expand_path("../..", __dir__) unless defined?(PROJECT_ROOT)
JARLIBS_DIR = File.join(PROJECT_ROOT, "jarlibs") unless defined?(JARLIBS_DIR)
PUBLIC_DIR = File.join(PROJECT_ROOT, "public") unless defined?(PUBLIC_DIR)
FRAMEWORK_WEB_DIR = File.join(__dir__, "web") unless defined?(FRAMEWORK_WEB_DIR)
NODE_MODULES_DIR = File.join(FRAMEWORK_WEB_DIR, "node_modules") unless defined?(NODE_MODULES_DIR)

require 'fileutils'
require 'json'
require 'net/http'
require 'open3'
require 'pathname'
require 'ruby_llm'
require 'shellwords'
require 'time'
require 'timeout'
require 'uri'
require 'zlib'

module Glauco
  module Backend
    autoload :SQL, File.join(__dir__, "glauco", "framework", "sql") unless const_defined?(:SQL, false)
  end
end

module GlaucoEnv
  TRUTHY = %w[1 true yes y on sim s].freeze

  def self.truthy?(value)
    TRUTHY.include?(value.to_s.strip.downcase)
  end

  def self.load_dotenv!(paths = nil)
    paths ||= [
      File.join(PROJECT_ROOT, ".env"),
      File.join(Dir.pwd, ".env")
    ].uniq

    paths.each do |path|
      next unless File.file?(path)

      File.readlines(path, chomp: true).each do |line|
        raw = line.to_s.strip
        next if raw.empty? || raw.start_with?("#")

        key, value = raw.split("=", 2)
        next if key.to_s.strip.empty? || value.nil?

        key = key.strip
        value = value.strip
        value = value[1...-1] if (value.start_with?("\"") && value.end_with?("\"")) ||
                                  (value.start_with?("'") && value.end_with?("'"))

        ENV[key] = value unless ENV.key?(key)
      end
    end
  end
end

GlaucoEnv.load_dotenv!
require_relative "ruby/application"
# >>> GLAUCO FRONTEND TARGET LOADER >>>
# O framework continua monolítico neste arquivo. Somente o backend visual e
# suas dependências são carregados a partir de módulos externos.
module Frontend
  module Target
    module_function

    def name
      raw = ENV.fetch(
        "GLAUCO_FRONTEND",
        ENV.fetch("GLAUCO_TARGET", "webview")
      )

      case raw.to_s.strip.downcase
      when "webview", "native", "wry"
        :webview
      when "swt", "desktop", "jruby"
        :swt
      when "web", "webimage", "wasm"
        :webimage
      else
        raise ArgumentError,
          "Frontend desconhecido: #{raw.inspect}. Use webview, swt ou webimage."
      end
    end

    def webview?
      name == :webview
    end

    def swt?
      name == :swt
    end

    def webimage?
      name == :webimage
    end

    def load!
      case name
      when :webview
        # Native backend is defined in this core and talks to the Wry host.
        # Crucially, MRI never requires Java for this target.
        true
      when :swt
        require "java"
        require_relative "glauco/frontend/swt"
        Frontend::Swt.load!(jarlibs_dir: JARLIBS_DIR)
      when :webimage
        require_relative "glauco/frontend/webimage"
        Frontend::WebImage.load!(
          framework_dir: __dir__,
          public_dir: PUBLIC_DIR
        )
      end
    end
  end

  class << self
    def target
      Target.name
    end

    def webview?
      Target.webview?
    end

    def swt?
      Target.swt?
    end

    def webimage?
      Target.webimage?
    end
  end
end

Frontend::Target.load!
# <<< GLAUCO FRONTEND TARGET LOADER <<<


module Glauco
  module RLM
    Event = Struct.new(:type, :payload, :time, keyword_init: true) do
      def to_h
        {
          "type" => type.to_s,
          "payload" => payload,
          "time" => time
        }
      end
    end

    class Session
      include Enumerable

      attr_reader :path, :events, :state

      def initialize(path: nil, events: nil, state: nil)
        @path = path && File.expand_path(path)
        @events = []
        @state = state || {}
        load! if @path && File.exist?(@path)
        Array(events).each { |event| append_event(event) } if events
      end

      def each(&block)
        events.each(&block)
      end

      def user(content, **metadata)
        message(:user, content, **metadata)
      end

      def assistant(content, **metadata)
        message(:assistant, content, **metadata)
      end

      def system(content, **metadata)
        message(:system, content, **metadata)
      end

      def message(role, content, **metadata)
        event(:message, { "role" => role.to_s, "content" => content.to_s }.merge(stringify_keys(metadata)))
      end

      def event(type, payload = {})
        append_event(Event.new(type: type.to_s, payload: stringify_keys(payload), time: Time.now.utc.iso8601))
      end

      def last_user_message
        events.reverse.find { |event| event.payload["role"] == "user" }
      end

      def last_user_content
        last_user_message && last_user_message.payload["content"].to_s
      end

      def messages
        events.select { |event| event.type == "message" }.map(&:payload)
      end

      def prompt
        lines = messages.map do |message|
          role = message["role"].to_s.capitalize
          "#{role}: #{message["content"]}"
        end

        return last_user_content.to_s if lines.empty?

        <<~PROMPT.strip
          Continue this session and handle the latest user request.

          #{lines.join("\n")}
        PROMPT
      end

      def to_a
        events.map(&:to_h)
      end

      private

      def load!
        File.readlines(@path, chomp: true, encoding: "UTF-8").each do |line|
          next if line.strip.empty?

          append_event(JSON.parse(line), persist: false)
        end
      end

      def append_event(event, persist: true)
        normalized = normalize_event(event)
        @events << normalized
        persist_event(normalized) if persist
        normalized
      end

      def persist_event(event)
        return unless @path

        FileUtils.mkdir_p(File.dirname(@path))
        File.open(@path, "a:UTF-8") { |file| file.puts(JSON.generate(event.to_h)) }
      end

      def normalize_event(event)
        case event
        when Event
          event
        when Hash
          hash = stringify_keys(event)
          Event.new(
            type: hash["type"] || "event",
            payload: stringify_keys(hash["payload"] || {}),
            time: hash["time"] || Time.now.utc.iso8601
          )
        else
          Event.new(type: "event", payload: { "value" => event.to_s }, time: Time.now.utc.iso8601)
        end
      end

      def stringify_keys(hash)
        hash.each_with_object({}) { |(key, value), memo| memo[key.to_s] = value }
      end
    end

    class Env
      attr_accessor :agent, :session, :input, :output, :data, :error

      def initialize(agent:, session:, input: nil, data: nil)
        @agent = agent
        @session = session
        @input = input || (session.respond_to?(:prompt) ? session.prompt : session.to_s)
        @data = data || (session.respond_to?(:state) ? session.state : {})
        @output = nil
        @error = nil
      end

      def [](key)
        data[key.to_sym]
      end

      def []=(key, value)
        data[key.to_sym] = value
      end
    end

    class Middleware
      def initialize(app = nil, **options, &block)
        @app = app
        @options = options
        @block = block
      end

      def call(env)
        @block.call(env) if @block
        @app ? @app.call(env) : env
      end
    end

    class Pipeline
      def initialize(agent, app: nil)
        @agent = agent
        @middlewares = []
        @terminal_app = app || AgentApp.new(agent)
      end

      def use(middleware = nil, *args, **options, &block)
        middleware ||= Middleware
        @middlewares << [middleware, args, options, block]
        self
      end

      def call(session_or_input, **data)
        session = normalize_session(session_or_input)
        session.state.merge!(data) if session.respond_to?(:state)
        env = Env.new(agent: @agent, session: session)
        build_stack.call(env)
        env
      end

      private

      def normalize_session(value)
        return value if value.respond_to?(:user) && value.respond_to?(:events)

        Session.new.tap { |session| session.user(value.to_s) }
      end

      def build_stack
        @middlewares.reverse.inject(@terminal_app) do |app, (middleware, args, options, block)|
          middleware.new(app, *args, **options, &block)
        end
      end
    end

    class AgentApp
      def initialize(agent)
        @agent = agent
      end

      def call(env)
        env.session.event(:agent_start, "input" => env.input)
        env.output = @agent.run(env.input)
        env.session.assistant(env.output)
        env.session.event(:agent_finish, "output" => env.output)
        env
      rescue => e
        env.error = e
        env.session.event(:agent_error, "class" => e.class.name, "message" => e.message)
        raise
      end
    end

    class StructuredCall < Middleware
      def initialize(app = nil, schema:, name: "structured_call", instructions: nil, **options)
        super(app, **options)
        @schema = schema
        @name = name
        @instructions = instructions
      end

      def call(env)
        env[:structured_schema] = @schema
        env.input = structured_prompt(env.input)
        env.session.event(:structured_call, "name" => @name, "schema" => @schema)
        super(env)
      end

      private

      def structured_prompt(input)
        schema_text = @schema.is_a?(String) ? @schema : JSON.pretty_generate(@schema)
        extra = @instructions.to_s.strip

        <<~PROMPT.strip
          #{input}

          Structured module: #{@name}
          #{extra}

          Return executable Ruby only. Set answer to a Ruby value matching this schema:
          #{schema_text}
        PROMPT
      end
    end

    class LLMCall < Middleware
      def initialize(app = nil, name:, instructions:, schema: nil, key: nil, include_previous: true, **options)
        super(app, **options)
        @name = name.to_s
        @instructions = instructions.to_s
        @schema = schema
        @key = (key || @name).to_sym
        @include_previous = include_previous
      end

      def call(env)
        env.session.event(:llm_step_start, "name" => @name, "key" => @key.to_s)
        result = env.agent.run(step_prompt(env))
        env[@key] = result
        env.session.event(:llm_step_finish, "name" => @name, "key" => @key.to_s, "output" => result)

        if @app
          @app.call(env)
        else
          env.output = result
          env
        end
      rescue => e
        env.error = e
        env.session.event(:llm_step_error, "name" => @name, "class" => e.class.name, "message" => e.message)
        raise
      end

      private

      def step_prompt(env)
        schema_text = @schema ? JSON.pretty_generate(@schema) : "Any Ruby value that best fits the step."
        previous = previous_data(env)

        <<~PROMPT.strip
          You are running one structured document-processing module.

          Module name:
          #{@name}

          Module instructions:
          #{@instructions}

          Source document or current task:
          #{env.input}

          Previous structured module outputs:
          #{previous}

          Output contract:
          Return executable Ruby only. Set answer to a Ruby value matching this schema:
          #{schema_text}
        PROMPT
      end

      def previous_data(env)
        return "None" unless @include_previous

        data = env.data.reject { |key, _| key == @key }
        return "None" if data.empty?

        JSON.pretty_generate(data.transform_keys(&:to_s))
      rescue StandardError
        data.inspect
      end
    end

    class Module
      class << self
        def inherited(child)
          child.output_schema(output_schema)
          child.key(key)
          child.agent(agent)
          super
        end

        def output_schema(value = :__glauco_not_set)
          @output_schema = value unless value == :__glauco_not_set
          @output_schema
        end

        def schema(value = :__glauco_not_set)
          output_schema(value)
        end

        def key(value = :__glauco_not_set)
          @key = value.to_sym unless value == :__glauco_not_set || value.nil?
          @key || default_key
        end

        def agent(value = :__glauco_not_set)
          @agent = value unless value == :__glauco_not_set
          @agent
        end

        def default_key
          name.to_s.split("::").last
            .gsub(/([a-z\d])([A-Z])/, '\1_\2')
            .tr("-", "_")
            .downcase
            .to_sym
        end
      end

      attr_reader :agent, :key, :name

      def initialize(agent_or_options = :__glauco_not_set, name: nil, schema: nil, key: nil, agent: :__glauco_not_set)
        options = agent_or_options.is_a?(Hash) ? agent_or_options : {}
        chosen_agent =
          if agent != :__glauco_not_set
            agent
          elsif options.key?(:agent)
            options[:agent]
          elsif agent_or_options != :__glauco_not_set
            agent_or_options
          else
            self.class.agent
          end

        @agent = chosen_agent
        @name = (name || self.class.name.to_s.split("::").last).to_s
        @schema = schema.nil? ? self.class.output_schema : schema
        @key = (key || self.class.key).to_sym
      end

      def bind(agent)
        self.class.new(
          agent: agent,
          name: @name,
          schema: @schema,
          key: @key
        )
      end

      def call(env_or_session, agent: nil, **data)
        env = normalize_env(env_or_session, agent: agent, data: data)
        @current_env = env
        env.session.event(:module_start, "name" => @name, "key" => @key.to_s)
        result = execute(env)
        env[@key] = result unless result.nil?
        env.session.event(:module_finish, "name" => @name, "key" => @key.to_s, "output" => result)
        result
      rescue => e
        env.error = e
        env.session.event(:module_error, "name" => @name, "class" => e.class.name, "message" => e.message)
        raise
      ensure
        @current_env = nil
      end

      def execute(env)
        agent.run(env.input)
      end

      private

      def agent
        resolved = @agent || @current_env&.agent
        raise "Glauco::RLM::Module #{@name} precisa de um agent. Passe agent: ou use dentro de agent.program." unless resolved

        resolved
      end

      def output_schema
        @schema
      end

      def normalize_env(value, agent: nil, data: {})
        return value if value.is_a?(Env)

        session =
          if value.respond_to?(:user) && value.respond_to?(:events)
            value
          else
            Session.new.tap { |session| session.user(value.to_s) }
          end

        session.state.merge!(data) if session.respond_to?(:state)
        Env.new(agent: agent || @agent, session: session)
      end

      def value_at(value, *keys)
        keys.each do |key|
          return value[key] if value.respond_to?(:key?) && value.key?(key)
          return value[key.to_s] if value.respond_to?(:key?) && value.key?(key.to_s)
          return value[key.to_sym] if value.respond_to?(:key?) && value.key?(key.to_sym)
        end

        nil
      end

      def set(env, key, value)
        env[key] = value
      end

      def get(env, key)
        env[key]
      end
    end

    class Program
      class << self
        def use(module_or_definition = nil, *args, **options, &block)
          modules << [module_or_definition, args, options, block]
          self
        end

        def modules
          @modules ||= []
        end
      end

      def initialize(agent, name: "rlm_program")
        @agent = agent
        @name = name
        @steps = []
        @modules = self.class.modules.dup
      end

      def use(module_or_definition = nil, *args, **options, &block)
        @modules << [module_or_definition, args, options, block]
        self
      end

      def step(name, instructions:, schema: nil, key: nil, include_previous: true)
        @steps << {
          name: name,
          instructions: instructions,
          schema: schema,
          key: key,
          include_previous: include_previous
        }
        self
      end

      def final(instructions:, schema:, key: :result)
        step(:final, instructions: instructions, schema: schema, key: key)
      end

      def call(session_or_document)
        session = normalize_session(session_or_document)
        session.state[:program] = @name if session.respond_to?(:state)
        env = Env.new(agent: @agent, session: session)
        execution_plan = build_execution_plan

        session.event(:program_start, "name" => @name, "modules" => execution_plan.map { |mod| mod.key.to_s })
        execution_plan.each { |mod| mod.call(env) }
        env.output = final_output(env)
        session.assistant(format_output(env.output))
        session.event(:program_finish, "name" => @name, "output" => env.output)
        env.output
      end

      private

      def normalize_session(value)
        return value if value.respond_to?(:user) && value.respond_to?(:events)

        Session.new.tap { |session| session.user(value.to_s) }
      end

      def format_output(output)
        output.is_a?(String) ? output : JSON.pretty_generate(output)
      rescue StandardError
        output.inspect
      end

      def build_execution_plan
        modules = @modules.map { |definition| build_module(definition) }
        steps = @steps.map { |definition| Module.new(@agent, **module_options_from_step(definition)) }
        modules + steps
      end

      def build_module(definition)
        module_or_definition, args, options, block = definition

        if block
          return Class.new(Module, &block).new(@agent, *args, **options)
        end

        case module_or_definition
        when Class
          module_or_definition.new(@agent, *args, **options)
        when Module
          module_or_definition.bind(@agent)
        when Hash
          Module.new(@agent, **module_or_definition.merge(options))
        else
          Module.new(@agent, *args, **options)
        end
      end

      def module_options_from_step(definition)
        {
          name: definition[:name],
          schema: definition[:schema],
          key: definition[:key] || definition[:name]
        }
      end

      def final_output(env)
        plan = build_execution_plan
        key = plan.last&.key
        return env.output unless key

        env.data.key?(key) ? env.data[key] : env.output
      end
    end

    class TerminalResult
      def call(env)
        env.output = env.data
        env
      end
    end

    def self.print_events(session, io: $stdout)
      session.events.each do |event|
        io.puts("#{event.time} #{event.type} #{JSON.generate(event.payload)}")
      end
    end
  end
end

Session = Glauco::RLM::Session unless defined?(Session)

def print_events(session)
  Glauco::RLM.print_events(session)
end unless defined?(print_events)

class GlaucoBasicPlasticAgent
  raw_ollama_host = ENV.fetch("OLLAMA_HOST", "http://127.0.0.1:11434").sub(%r{/*$}, "")
  DEFAULT_OPENAI_COMPAT_ENDPOINT = raw_ollama_host.sub(%r{/v1$}, "") + "/v1"
  DEFAULT_MODEL_NAME = ENV.fetch("OLLAMA_MODEL", "gemma4:e4b")
  DEFAULT_LLAMA_SERVER_HOST = ENV.fetch("GLAUCO_LLAMASERVER_HOST", "127.0.0.1")
  DEFAULT_LLAMA_SERVER_PORT = ENV.fetch("GLAUCO_LLAMASERVER_PORT", "1234").to_i
  DEFAULT_LLAMA_SERVER_ENDPOINT = ENV.fetch("GLAUCO_LLAMASERVER_ENDPOINT", "http://#{DEFAULT_LLAMA_SERVER_HOST}:#{DEFAULT_LLAMA_SERVER_PORT}/v1")
  DEFAULT_LLAMA_SERVER_MODEL_KEY = ENV.fetch("GLAUCO_LLAMASERVER_MODEL_KEY", "https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF")
  FRAMEWORK_MODELS_DIR = File.join(__dir__, "models")
  FRAMEWORK_LLAMA_SERVER_MODEL_PATH = ENV.fetch("GLAUCO_LLAMASERVER_LOCAL_MODEL_PATH", File.join(FRAMEWORK_MODELS_DIR, "gemma-4-e4b-it.gguf"))
  LMS_BIN_DIR = File.join(Dir.home, ".lmstudio", "bin")
  LLAMA_SERVER_BIN = ENV.fetch("GLAUCO_LLAMASERVER_BIN", "llama-server")
  LLAMA_SERVER_LOG = ENV.fetch("GLAUCO_LLAMASERVER_LOG_PATH", File.join(Dir.home, ".lmstudio", "logs", "glauco-llama-server.log"))

  SYSTEM = <<~SYS
    #You are an RLM agent.

    ##STRICT RULES:
    - DO NOT produce a thought channel
    - DO NOT write "Thinking Process"
    - The first characters of your response must be ```repl
    - ALWAYS use ```repl``` blocks
    - NEVER answer directly outside ```repl```
    - NEVER wrap code in `puts`, `print`, `p`, strings, or explanations
    - NEVER output code as text that still needs to be copied and run
    - NEVER use Python-style triple quoted strings (`"""`)
    - For text literals, use Ruby `%q{...}` strings
    - ONLY use Ruby
    - You MUST set variables you use
    - You can use multiple steps, but the FINAL step must set the variable `answer`
    - Keep each ```repl``` block short enough to close the code fence
    - Do not use long heredocs for final answers
    - Keep final answers concise unless the user explicitly asks for a long document

    ##Execution model:
    - You have access to:
      1) Variables â†’ persistent state
      2) Runtime methods â†’ callable functions

    - Call runtime methods like normal Ruby functions:
      open_url("https://...")

    - Variables are already defined, do not redeclare unless needed


    ##TERMINATION PROTOCOL (CRITICAL):
    - When you have the final result, you MUST:
      1) Assign it to a variable named `answer`
      2) Output a single, closed ```repl``` block that sets `answer`
      3) Do NOTHING after that
  SYS
  # ---------------------------
  # TEST SUITE
  # ---------------------------
  module TestSuite

    TestCase = Struct.new(
      :name, :input, :initial_vars, :expect, :verify_with_llm,
      keyword_init: true
    )

    class Runner
      DEFAULT_TEST_MODEL = ENV.fetch("OLLAMA_MODEL", DEFAULT_MODEL_NAME)

      attr_reader :cases, :results

      def initialize(agent:, model: DEFAULT_TEST_MODEL, cases: [])
        @agent = agent
        @endpoint = agent.endpoint
        @model = model
        @cases = cases
        @results = []

        puts "initilized"
      end

      def add(tc)
        @cases << tc
      end

      def run!
        puts "run!"

        configure_rubyllm!

        @cases.each do |tc|
          puts "\n=== #{tc.name} ==="

          @agent.reset!
          @agent.vars.delete("answer")

          tc.initial_vars&.each do |k,v|
            @agent.vars[k.to_s] = v
          end

          puts "[INPUT] #{tc.input}"

          output = @agent.run(tc.input)

          passed =
            if tc.verify_with_llm
              verify_with_llm(tc, output)
            else
              compare(tc.expect, output)
            end

          puts "[OUTPUT] #{output}"
          puts "[PASS?] #{passed}"

          @results << {
            name: tc.name,
            passed: passed,
            output: output
          }
        end

        summary
      end

      private

      # ---------------------------
      # CONFIG GLOBAL CONTROLADO
      # ---------------------------
      def configure_rubyllm!
        RubyLLM.configure do |c|
          c.openai_api_base = @endpoint
          c.openai_api_key  = "local"
          c.openai_use_system_role = true
        end
      end

      # ---------------------------
      # COMPARAÃ‡ÃƒO
      # ---------------------------
      def compare(expect, out)
        return expect.call(out) if expect.respond_to?(:call)
        expect.to_s.strip == out.to_s.strip
      end

      # ---------------------------
      # VERIFIER (STATELESS CHAT)
      # ---------------------------
      def verify_with_llm(tc, output)
        configure_rubyllm!
        chat = RubyLLM.chat(
          model: @model,
          provider: :openai,
          assume_model_exists: true
        )

        res = chat.ask(<<~PROMPT)
          You are a strict evaluator.

          Task:
          #{tc.input}

          Expected:
          #{tc.expect}

          Output:
          #{output}

          Return ONLY:
          PASS or FAIL
        PROMPT

        res.content.to_s.strip == "PASS"
      end

      # ---------------------------
      # SUMMARY
      # ---------------------------
      def summary
        total = @results.size
        ok = @results.count { |r| r[:passed] }

        puts "\nSUMMARY: #{ok}/#{total}"
      end
    end

    def self.case(**args)
      TestCase.new(**args)
    end
  end
  attr_reader :vars, :history, :endpoint

  DEFAULT_ENDPOINT = DEFAULT_OPENAI_COMPAT_ENDPOINT
  DEFAULT_MODEL    = DEFAULT_MODEL_NAME

  def initialize(
    endpoint: DEFAULT_ENDPOINT,
    model: DEFAULT_MODEL,
    llm_provider: ENV.fetch("GLAUCO_LLM_PROVIDER", nil),
    llama_server_model_key: ENV.fetch("GLAUCO_LLAMASERVER_MODEL_KEY", DEFAULT_LLAMA_SERVER_MODEL_KEY),
    llama_server_identifier: ENV.fetch("GLAUCO_LLAMASERVER_IDENTIFIER", nil),
    llama_server_model_path: ENV.fetch("GLAUCO_LLAMASERVER_MODEL_PATH", nil),
    llama_server_gpu: ENV.fetch("GLAUCO_LLAMASERVER_GPU", "auto"),
    llama_server_context_length: ENV.fetch("GLAUCO_LLAMASERVER_CONTEXT_LENGTH", nil),
    llama_server_ttl: ENV.fetch("GLAUCO_LLAMASERVER_TTL", nil),
    llama_server_threads: ENV.fetch("GLAUCO_LLAMASERVER_THREADS", nil),
    llama_server_threads_batch: ENV.fetch("GLAUCO_LLAMASERVER_THREADS_BATCH", nil),
    llama_server_batch_size: ENV.fetch("GLAUCO_LLAMASERVER_BATCH_SIZE", nil),
    llama_server_ubatch_size: ENV.fetch("GLAUCO_LLAMASERVER_UBATCH_SIZE", nil),
    llama_server_parallel: ENV.fetch("GLAUCO_LLAMASERVER_PARALLEL", nil),
    llama_server_kv_unified: ENV.fetch("GLAUCO_LLAMASERVER_KV_UNIFIED", nil),
    llama_server_cont_batching: ENV.fetch("GLAUCO_LLAMASERVER_CONT_BATCHING", nil),
    llama_server_fit: ENV.fetch("GLAUCO_LLAMASERVER_FIT", nil),
    llama_server_reasoning: ENV.fetch("GLAUCO_LLAMASERVER_REASONING", nil),
    llama_server_reasoning_format: ENV.fetch("GLAUCO_LLAMASERVER_REASONING_FORMAT", nil),
    llama_server_log_target: ENV.fetch("GLAUCO_LLAMASERVER_LOG_TARGET", "file"),
    llama_server_log_path: ENV.fetch("GLAUCO_LLAMASERVER_LOG_PATH", LLAMA_SERVER_LOG),
    llama_server_disable_log: ENV.fetch("GLAUCO_LLAMASERVER_DISABLE_LOG", "0"),
    llama_server_extra_args: ENV.fetch("GLAUCO_LLAMASERVER_EXTRA_ARGS", nil)
  )
    puts "[Glauco] ðŸš€ Inicializando Glauco Framework (RLM core)..."

    @model = model
    @endpoint = endpoint
    @llm_provider = normalize_llm_provider(llm_provider, endpoint)
    @llama_server_model_key = presence(llama_server_model_key) || DEFAULT_LLAMA_SERVER_MODEL_KEY
    @llama_server_identifier = presence(llama_server_identifier) || @llama_server_model_key
    @llama_server_model_path = presence(llama_server_model_path) || FRAMEWORK_LLAMA_SERVER_MODEL_PATH
    @llama_server_gpu = normalize_llama_server_gpu(llama_server_gpu)
    @llama_server_context_length = integer_or_nil(llama_server_context_length)
    @llama_server_ttl = integer_or_nil(llama_server_ttl)
    @llama_server_threads = integer_or_nil(llama_server_threads)
    @llama_server_threads_batch = integer_or_nil(llama_server_threads_batch)
    @llama_server_batch_size = integer_or_nil(llama_server_batch_size)
    @llama_server_ubatch_size = integer_or_nil(llama_server_ubatch_size)
    @llama_server_parallel = integer_or_nil(llama_server_parallel)
    @llama_server_kv_unified = boolean_or_nil(llama_server_kv_unified)
    @llama_server_cont_batching = boolean_or_nil(llama_server_cont_batching)
    @llama_server_fit = on_off_or_nil(llama_server_fit)
    @llama_server_reasoning = on_off_auto_or_nil(llama_server_reasoning)
    @llama_server_reasoning_format = presence(llama_server_reasoning_format)
    @llama_server_log_path = presence(llama_server_log_path) || LLAMA_SERVER_LOG
    @llama_server_log_target = normalize_llama_server_log_target(llama_server_log_target)
    @llama_server_disable_log = !!boolean_or_nil(llama_server_disable_log)
    @llama_server_extra_args = parse_llama_server_extra_args(llama_server_extra_args)
    @initial_vars = {}
    @vars = {}
    @history = []
    @runtime = nil
    @runtime_methods = []
    @last_code = nil
    @config_path = nil
    @domain_specific_knowledge = nil
    @pipeline = nil

    initialize_llm_backend!
  end

  def build_agent(initial_vars: {}, runtime: nil)
    reconfigure_agent!(
      initial_vars: initial_vars,
      runtime: runtime
    )
  end

  def use(middleware = nil, *args, **options, &block)
    pipeline.use(middleware, *args, **options, &block)
    self
  end

  def pipeline
    @pipeline ||= Glauco::RLM::Pipeline.new(self)
  end

  def program(name: "rlm_program")
    Glauco::RLM::Program.new(self, name: name)
  end

  def call(session_or_input, **data)
    if session_or_input.respond_to?(:user) && session_or_input.respond_to?(:events)
      pipeline.call(session_or_input, **data).output
    else
      run(session_or_input.to_s)
    end
  end

  def attach_runtime(runtime)
    @runtime =
      if runtime.is_a?(Module)
        Object.new.extend(runtime)
      else
        runtime
      end

    @runtime_methods =
      if @runtime
        @runtime.public_methods(false).map(&:to_s)
      else
        []
      end

    runtime
  end

  # ===========================================================
  # execuÃ§Ã£o
  # ===========================================================
  def interpretar(input_text)
    raise "LLM nÃ£o inicializado. Chame build_agent primeiro." if @runtime.nil? && @initial_vars.empty?

    run(input_text)
  end

  def run(input, max_iter: ENV.fetch("GLAUCO_RLM_MAX_ITER", "2").to_i)
    vars.delete("answer")
    @last_code = nil
    no_repl_count = 0

    max_iter.times do
      if vars.key?("answer")
        puts "[AGENT] ðŸ›‘ answer already exists, stopping loop"
        return vars["answer"]
      end
      puts "[AGENT] step..."

      chat = build_chat
      res = chat.ask(build_prompt(input, repair_repl: no_repl_count.positive?))

      text = clean_utf8(res.content)
      puts "\n[LLM]\n#{text}"

      codes = extract_repl(text)
      if codes.empty?
        no_repl_count += 1
        puts "[NO REPL FOUND] retrying with strict repl format" if no_repl_count < max_iter
        history << msg(:assistant, text)
        next
      end

      codes.each do |code|
        puts "\n[REPL]\n#{code}"

        if code == @last_code
          puts "[AGENT] âš ï¸ repeated code, stopping"
          return vars["answer"] if vars.key?("answer")
          return "Repeated code without final answer"
        end

        @last_code = code

        out, _ = execute(code)
        out = clean_utf8(out)

        puts "[RESULT] #{out}"

        if vars.key?("answer")
          puts "[AGENT] âœ… final answer detected, stopping"
          return vars["answer"]
        end
      end

      history << msg(:assistant, text)
    end

    "No final answer"
  end

  def build_chat
    RubyLLM.configure do |c|
      c.openai_api_base = @endpoint
      c.openai_api_key  = "local"
      c.openai_use_system_role = true
    end

    chat = RubyLLM.chat(
      model: @model,
      provider: :openai,
      assume_model_exists: true
    )
    chat.with_temperature(ENV.fetch("GLAUCO_RLM_TEMPERATURE", "0.1").to_f)
    chat.with_params(max_tokens: ENV.fetch("GLAUCO_RLM_MAX_TOKENS", "2048").to_i)
    chat
  end

  # ===========================================================
  # extras
  # ===========================================================
  def reset!
    @vars = @initial_vars.dup
    @history.clear

    puts @vars, @history
  end

  def test_runner(cases: [])
    TestSuite::Runner.new(
      agent: self,
      model: @model,
      cases: cases
    )
  end

  def bootstrap_agent!(system_config_instructions:, domain_specific_knowledge: nil, runtime: nil, capability_schema: nil, extra_vars: {})
    puts "[LLM] ðŸš€ bootstrap_agent! (framework bootstrap)"

    @config_path = File.expand_path(system_config_instructions)
    @domain_specific_knowledge = domain_specific_knowledge && File.expand_path(domain_specific_knowledge)

    initial_vars = load_bootstrap_vars(
      config_path: @config_path,
      knowledge_path: @domain_specific_knowledge,
      capability_schema: capability_schema,
      extra_vars: extra_vars
    )

    build_agent(initial_vars: initial_vars, runtime: runtime)
  end

  def bind_runtime_capabilities!(runtime, capability_schema: nil)
    attach_runtime(runtime)

    if capability_schema
      vars["capability_schema"] =
        capability_schema.is_a?(String) ? capability_schema : JSON.pretty_generate(capability_schema)
    end

    runtime
  end

  def execute(code)
    ctx = @runtime
    raise "runtime not configured" unless ctx

    vars.each do |k, v|
      ctx.instance_variable_set("@#{k}", v)
    end

    result = ctx.instance_eval(normalize_repl_syntax(code))
    vars["answer"] = result unless result.nil?

    [result, vars.keys]
  rescue SyntaxError => e
    puts "[EXEC ERROR] #{e.class} - #{e.message}"
    puts e.backtrace.first(10)
    ["ERROR: #{e.class} - #{e.message}", []]
  rescue => e
    puts "[EXEC ERROR] #{e.class} - #{e.message}"
    puts e.backtrace.first(10)
    ["ERROR: #{e.class} - #{e.message}", []]
  end

  def build_prompt(input, repair_repl: false)
    vars_block =
      if vars.empty?
        "None"
      else
        vars.keys.join(", ")
      end

    context_block = prompt_context_vars

    runtime_block =
      if @runtime_methods.empty?
        "None"
      else
        @runtime_methods.join(", ")
      end

    final_answer_instruction =
      if @runtime_methods.include?("final_answer")
        <<~INSTRUCTION
          Final answer helper:
          - To finish, prefer this exact shape:
            answer = final_answer(%q{final text})
          - Keep the final text concise enough that the closing ``` fence is emitted.
          - Do not use `"""`, heredoc, markdown documents, or multi-page text in code.
        INSTRUCTION
      else
        <<~INSTRUCTION
          Final answer:
          - To finish, make the final expression evaluate to the final text and assign it to `answer`.
          - Keep the final text concise enough that the closing ``` fence is emitted.
          - Use Ruby `%q{...}` for text, never `"""`.
        INSTRUCTION
      end

    user_prompt =
      if repair_repl
        <<~PROMPT
          FORMAT REPAIR REQUIRED.
          Your previous response had no executable ```repl``` block, usually because it was truncated or the closing ``` fence was missing.
          Return exactly one ```repl``` block now.
          The block must set answer and must close the ``` fence.
          Keep the answer under 900 characters.
          Use Ruby %q{...}; never use """ or heredoc.
          Do not explain.

          Task: #{input}
          Next step:
        PROMPT
      else
        "Task: #{input}\nNext step:"
      end

    [
      msg(:system, SYSTEM),
      msg(:system, <<~CTX),
        Runtime methods (functions you can call directly in Ruby):
        #{runtime_block}

        Variables (persistent state, read/write):
        #{vars_block}

        #{final_answer_instruction}

        Loaded context variable values:
        #{context_block}
      CTX
      *history,
      msg(:user, user_prompt)
    ]
  end

  def prompt_context_vars
    return "None" if vars.empty?

    priority = %w[system_config capability_schema domain_knowledge skills browser_execution_tool]
    keys = (priority & vars.keys) + (vars.keys - priority - ["answer"])

    keys.map { |key| format_prompt_var(key, vars[key]) }.join("\n\n")
  end

  def format_prompt_var(key, value)
    text = value.is_a?(String) ? value : JSON.pretty_generate(value)
    max = ENV.fetch("GLAUCO_RLM_CONTEXT_VAR_LIMIT", "24000").to_i
    text = "#{text[0, max]}\n...[truncated #{text.length - max} chars]" if max.positive? && text.length > max

    <<~VAR.strip
      #{key}:
      #{text}
    VAR
  rescue StandardError
    "#{key}: #{value.inspect}"
  end

  def tool_call?(res)
    res.respond_to?(:tool_calls) && res.tool_calls && !res.tool_calls.empty?
  end

  def handle_tool_calls(res)
    res.tool_calls.each do |call|
      name = call["name"]
      args = call["arguments"] || {}

      tool = @tools.find { |t| t.name == name }

      if tool.nil?
        puts "[TOOL] not found: #{name}"
        next
      end

      puts "[TOOL] calling #{name} with #{args}"

      result = tool.execute(**args.transform_keys(&:to_sym))

      puts "[TOOL RESULT] #{result}"

      history << {
        role: "tool",
        name: name,
        content: result.to_s
      }
    end
  rescue => e
    puts "[TOOL ERROR] #{e.message}"
  end

  private

  def initialize_llm_backend!
    return unless @llm_provider == "llama-server"

    initialize_llama_server!
  end

  def initialize_llama_server!
    ensure_llama_server_binary!
    ensure_llama_server_model_downloaded!
    restart_llama_server! if llama_server_running? && !llama_server_matches_target?
    ensure_llama_server_http!
    wait_for_llama_server_models!

    @endpoint = DEFAULT_LLAMA_SERVER_ENDPOINT
    @model = @llama_server_identifier if presence(@llama_server_identifier)
  end

  def ensure_lms_installed!
    return if File.executable?(File.join(LMS_BIN_DIR, "lms")) || command_available?("lms")

    raise "LM Studio CLI nÃ£o encontrado. Instale pelo script oficial: curl -fsSL https://lmstudio.ai/install.sh | bash"
  end

  def ensure_llama_server_binary!
    return if executable_available?(LLAMA_SERVER_BIN)

    raise "llama-server nÃ£o encontrado. Defina GLAUCO_LLAMASERVER_BIN ou instale llama.cpp com o binÃ¡rio llama-server."
  end

  def ensure_llama_server_model_downloaded!
    sync_framework_model_from_download! if framework_model_outdated?
    return if resolved_llama_server_model_path

    model_key = presence(@llama_server_model_key)
    raise "Defina GLAUCO_LLAMASERVER_MODEL_KEY para baixar um modelo GGUF via LM Studio." unless model_key

    ensure_lms_installed!
    download_llama_server_model!(model_key)
    sync_framework_model_from_download!
    return if resolved_llama_server_model_path

    raise "O modelo #{model_key} nÃ£o foi localizado depois do download via LM Studio."
  end

  def ensure_llama_server_http!
    return if llama_server_running?

    model_path = resolved_llama_server_model_path
    raise "Nenhum caminho de modelo GGUF disponÃ­vel para o llama-server." unless model_path

    FileUtils.mkdir_p(File.dirname(@llama_server_log_path)) if @llama_server_log_target == :file
    log_target = llama_server_log_target_io

    args = [
      LLAMA_SERVER_BIN,
      "--model", model_path,
      "--host", DEFAULT_LLAMA_SERVER_HOST,
      "--port", DEFAULT_LLAMA_SERVER_PORT.to_s,
      "--alias", @llama_server_identifier.to_s
    ]
    args += ["--ctx-size", @llama_server_context_length.to_s] if @llama_server_context_length
    args += ["--gpu-layers", llama_server_gpu_layers] if @llama_server_gpu
    args += ["--timeout", @llama_server_ttl.to_s] if @llama_server_ttl
    args += ["--threads", @llama_server_threads.to_s] if @llama_server_threads
    args += ["--threads-batch", @llama_server_threads_batch.to_s] if @llama_server_threads_batch
    args += ["--batch-size", @llama_server_batch_size.to_s] if @llama_server_batch_size
    args += ["--ubatch-size", @llama_server_ubatch_size.to_s] if @llama_server_ubatch_size
    args += ["--parallel", @llama_server_parallel.to_s] if @llama_server_parallel
    args += ["--fit", @llama_server_fit] if @llama_server_fit
    args += ["--reasoning", @llama_server_reasoning] if @llama_server_reasoning
    args += ["--reasoning-format", @llama_server_reasoning_format] if @llama_server_reasoning_format
    args << (@llama_server_kv_unified ? "--kv-unified" : "--no-kv-unified") unless @llama_server_kv_unified.nil?
    args << (@llama_server_cont_batching ? "--cont-batching" : "--no-cont-batching") unless @llama_server_cont_batching.nil?
    args << "--log-disable" if @llama_server_disable_log
    args += @llama_server_extra_args if @llama_server_extra_args.any?

    pid = spawn(
      args.first,
      *args.drop(1),
      in: null_device,
      out: log_target,
      err: log_target,
      pgroup: true
    )
    Process.detach(pid)

    wait_until!("llama-server nÃ£o iniciou em #{DEFAULT_LLAMA_SERVER_ENDPOINT}", timeout: 30) do
      llama_server_running?
    end
  end

  def wait_for_llama_server_models!
    wait_until!("llama-server subiu, mas o endpoint /v1/models nÃ£o ficou pronto.", timeout: 30) do
      uri = URI("#{DEFAULT_LLAMA_SERVER_ENDPOINT}/models")
      response = Net::HTTP.get_response(uri)
      response.is_a?(Net::HTTPSuccess)
    rescue StandardError
      false
    end
  end

  def llama_server_running?
    uri = URI("#{DEFAULT_LLAMA_SERVER_ENDPOINT}/models")
    response = Net::HTTP.get_response(uri)
    response.is_a?(Net::HTTPSuccess)
  rescue StandardError
    false
  end

  def llama_server_matches_target?
    uri = URI("#{DEFAULT_LLAMA_SERVER_ENDPOINT}/models")
    response = Net::HTTP.get_response(uri)
    return false unless response.is_a?(Net::HTTPSuccess)

    payload = JSON.parse(response.body)
    models = Array(payload["data"]) + Array(payload["models"])
    identifiers = models.flat_map do |entry|
      [entry["id"], entry["model"], entry["name"], *Array(entry["aliases"])].compact
    end

    identifiers.map!(&:to_s)
    identifiers.include?(@llama_server_identifier.to_s)
  rescue StandardError
    false
  end

  def restart_llama_server!
    if Gem.win_platform?
      system("taskkill", "/F", "/IM", File.basename(LLAMA_SERVER_BIN), out: File::NULL, err: File::NULL)
    else
      system("pkill", "-f", "#{LLAMA_SERVER_BIN} --model")
    end
    wait_until!("llama-server antigo nÃ£o encerrou.", timeout: 10) do
      !llama_server_running?
    end
  rescue StandardError
    nil
  end

  def resolved_llama_server_model_path
    return @llama_server_model_path if @llama_server_model_path && File.exist?(@llama_server_model_path)

    nil
  end

  def locate_downloaded_llama_server_model_path
    models_root = discover_lmstudio_models_root
    return nil unless models_root && Dir.exist?(models_root)

    search_terms = llama_server_search_terms
    candidates = Dir.glob(File.join(models_root, "**", "*.gguf"))
      .reject { |path| File.basename(path).downcase.include?("mmproj") }
      .select do |path|
        haystack = path.downcase
        search_terms.any? { |term| haystack.include?(term) }
      end

    candidates.min_by { |path| File.size(path) }
  end

  def run_lms!(*args)
    run_lms(*args, allow_failure: false)
  end

  def run_lms(*args, allow_failure:)
    stdout, stderr, status = Open3.capture3(lms_env, "lms", *args)
    return stdout if status.success?
    return stdout if allow_failure

    command = (["lms"] + args).shelljoin
    details = [stdout, stderr].reject(&:empty?).join("\n").strip
    raise "Falha ao executar #{command}: #{details}"
  end

  def lms_env
    {
      "PATH" => [LMS_BIN_DIR, ENV["PATH"]].compact.join(":")
    }
  end

  def command_available?(name)
    path = [LMS_BIN_DIR, ENV["PATH"]].compact.join(File::PATH_SEPARATOR)
    if Gem.win_platform?
      ENV.fetch("PATH", "").split(File::PATH_SEPARATOR).any? do |dir|
        File.executable?(File.join(dir, name)) || File.executable?(File.join(dir, "#{name}.exe"))
      end || File.executable?(File.join(LMS_BIN_DIR, name)) || File.executable?(File.join(LMS_BIN_DIR, "#{name}.exe"))
    else
      system({ "PATH" => path }, "sh", "-lc", "command -v #{Shellwords.escape(name)} >/dev/null 2>&1")
    end
  end

  def executable_available?(name)
    return true if name && File.executable?(name)
    return true if name && Gem.win_platform? && File.executable?("#{name}.exe")

    command_available?(name)
  end

  def null_device
    Gem.win_platform? ? "NUL" : "/dev/null"
  end

  def wait_until!(message, timeout:)
    Timeout.timeout(timeout) do
      loop do
        return true if yield
        sleep 1
      end
    end
  rescue Timeout::Error
    raise message
  end

  def normalize_llm_provider(provider, endpoint)
    chosen = presence(provider)
    return chosen if chosen
    return "llama-server" if endpoint.to_s.start_with?(DEFAULT_LLAMA_SERVER_ENDPOINT)

    nil
  end

  def download_llama_server_model!(model_key)
    run_lms("get", model_key, "--gguf", "-y", allow_failure: false)
  rescue StandardError => first_error
    fallback_url = huggingface_url_for(model_key)
    raise first_error unless fallback_url

    run_lms!("get", fallback_url, "--gguf", "-y")
  end

  def huggingface_url_for(model_key)
    key = model_key.to_s.strip
    return nil if key.empty?
    return nil if key.match?(%r{\Ahttps?://}i)
    return nil unless key.include?("/")

    "https://huggingface.co/#{key}"
  end

  def discover_lmstudio_models_root
    explicit = ENV["LMSTUDIO_MODELS_DIR"].to_s.strip
    return explicit unless explicit.empty?

    default_root = File.join(Dir.home, ".lmstudio", "models")
    return default_root if Dir.exist?(default_root)

    candidates = Dir.glob(File.join(Dir.home, ".lmstudio", "**", "model-cache"))
    return candidates.first if candidates.any?

    settings_path = File.join(Dir.home, ".lmstudio", "settings.json")
    return nil unless File.exist?(settings_path)

    settings = JSON.parse(File.read(settings_path, encoding: "UTF-8"))
    presence(settings["downloadedModelsPath"]) || presence(settings["modelsPath"])
  rescue JSON::ParserError
    nil
  end

  def framework_model_outdated?
    return false unless @llama_server_model_path && File.exist?(@llama_server_model_path)

    downloaded = locate_downloaded_llama_server_model_path
    return false unless downloaded && File.exist?(downloaded)

    File.size(@llama_server_model_path) != File.size(downloaded)
  end

  def sync_framework_model_from_download!
    source_model_path = locate_downloaded_llama_server_model_path
    return unless source_model_path && File.exist?(source_model_path)

    FileUtils.mkdir_p(File.dirname(@llama_server_model_path))
    FileUtils.cp(source_model_path, @llama_server_model_path)
  end

  def llama_server_search_terms
    key = @llama_server_model_key.to_s.strip
    return [] if key.empty?

    stripped = key.sub(%r{\Ahttps?://huggingface\.co/}i, "").sub(%r{\Ahttps?://}, "")
    candidates = [
      key,
      stripped,
      File.basename(stripped),
      stripped.split("/").last
    ]

    candidates
      .map { |value| value.to_s.downcase.strip }
      .reject(&:empty?)
      .uniq
  end

  def llama_server_gpu_layers
    return "999" if @llama_server_gpu == "max"
    return "0" if @llama_server_gpu == "off"
    return "999" if @llama_server_gpu == "-1"
    return @llama_server_gpu if @llama_server_gpu.match?(/\A\d+\z/) && @llama_server_gpu.to_i >= 1

    ratio = @llama_server_gpu.to_f
    return "0" if ratio <= 0

    [[(ratio * 100).round, 1].max, 999].min.to_s
  end


  def normalize_llama_server_log_target(value)
    normalized = value.to_s.strip.downcase
    return :file if normalized.empty? || normalized == "file"
    return :null if %w[0 false no off none null silent quiet].include?(normalized)
    return :stdout if %w[stdout console terminal].include?(normalized)
    return :stderr if normalized == "stderr"

    @llama_server_log_path = value.to_s
    :file
  end

  def llama_server_log_target_io
    case @llama_server_log_target
    when :stdout
      $stdout
    when :stderr
      $stderr
    when :file
      @llama_server_log_path
    else
      null_device
    end
  end

  def parse_llama_server_extra_args(value)
    return [] if value.nil? || value.to_s.strip.empty?

    Shellwords.split(value.to_s)
  rescue ArgumentError
    value.to_s.split(/\s+/)
  end

  def normalize_llama_server_gpu(value)
    requested = presence(value)
    return nil unless requested

    normalized = requested.downcase
    return nil if normalized == "auto" && !gpu_llama_server_binary?
    return "max" if %w[auto max all -1].include?(normalized)
    return "off" if %w[off cpu none false 0].include?(normalized)

    requested
  end

  def gpu_llama_server_binary?
    LLAMA_SERVER_BIN.to_s.downcase.match?(/cuda|vulkan|rocm|metal/)
  end

  def presence(value)
    string = value.to_s.strip
    return nil if string.empty?

    string
  end

  def integer_or_nil(value)
    return nil if value.nil? || value.to_s.strip.empty?

    value.to_i
  end

  def boolean_or_nil(value)
    return nil if value.nil? || value.to_s.strip.empty?

    %w[1 true yes on enabled].include?(value.to_s.strip.downcase)
  end

  def on_off_or_nil(value)
    normalized = value.to_s.strip.downcase
    return nil if normalized.empty?
    return "off" if %w[0 false no off disabled].include?(normalized)

    "on"
  end

  def on_off_auto_or_nil(value)
    normalized = value.to_s.strip.downcase
    return nil if normalized.empty?
    return "auto" if normalized == "auto"

    on_off_or_nil(normalized)
  end

  def reconfigure_agent!(initial_vars:, runtime:)
    normalized_vars = initial_vars.transform_keys(&:to_s)

    attach_runtime(runtime)

    @initial_vars = normalized_vars
    @vars = @initial_vars.dup
    @history = []
    @last_code = nil

    self
  end

  def msg(role, content)
    { role: role, content: clean_utf8(content) }
  end

  def extract_repl(text)
    text.scan(/```([a-zA-Z0-9_-]*)\s*\n(.*?)```/m)
      .filter_map do |language, code|
        language = language.to_s.strip.downcase
        normalized = normalize_generated_code(code)
        next if normalized.empty?

        if language.empty? || %w[repl ruby rb].include?(language)
          normalized
        end
      end
      .reject(&:empty?)
  end

  def clean_utf8(s)
    s.to_s.dup.force_encoding("UTF-8")
      .encode("UTF-8", invalid: :replace, undef: :replace, replace: "")
  end

  def normalize_generated_code(code)
    normalized = code.to_s.strip
    normalized = normalized.sub(/\Aanswer\s*:\s*/, "answer = ")

    if normalized.match?(/\A(?:puts|print|p)\s+/)
      extracted = unwrap_stringified_code(normalized)
      normalized = extracted if extracted
    end

    normalized = normalize_tool_chain_prefixes(normalized)
    normalized = assign_answer_to_bare_tool_call(normalized)
    normalized = keep_first_answer_tool_call(normalized)

    normalized
  end

  def normalize_repl_syntax(code)
    code.to_s.gsub(/^([A-Za-z_][A-Za-z0-9_]*)\)\s*$/) { "#{$1}\n)" }
  end

  def normalize_tool_chain_prefixes(code)
    code.to_s.gsub(/^\s*\.(browser_open|execute_browser_js|browser_command|browser_shell)\b/, '\1')
  end

  def assign_answer_to_bare_tool_call(code)
    stripped = code.to_s.strip
    return code if stripped.match?(/\Aanswer\s*=/)
    return "answer = #{stripped}" if stripped.match?(/\A(?:browser_open|execute_browser_js|browser_command|browser_shell)\s*\(/)

    code
  end

  def keep_first_answer_tool_call(code)
    lines = code.to_s.lines
    tool_answer_indexes = lines.each_index.select do |index|
      lines[index].match?(/\A\s*answer\s*=\s*(browser_open|execute_browser_js|browser_command|browser_shell)\b/)
    end

    return code if tool_answer_indexes.empty?
    first = tool_answer_indexes.first
    first_statement = collect_statement_from(lines, first)

    later_tool = lines[(first_statement[:end_index] + 1)..].to_a.any? do |line|
      line.match?(/\A\s*(?:answer\s*=\s*)?(browser_open|execute_browser_js|browser_command|browser_shell)\b/)
    end

    return first_statement[:source] if tool_answer_indexes.length > 1 || later_tool

    code
  end

  def collect_statement_from(lines, first)
    terminator = heredoc_terminator(lines[first])
    return { source: lines[first].to_s, end_index: first } unless terminator

    collected = []
    end_index = first
    lines[first..].each_with_index do |line, offset|
      collected << line
      end_index = first + offset
      break if line.strip == terminator
    end
    { source: collected.join, end_index: end_index }
  end

  def heredoc_terminator(line)
    match = line.to_s.match(/<<[-~]?['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/)
    match && match[1]
  end

  def unwrap_stringified_code(code)
    match = code.match(/\A(?:puts|print|p)\s+(.+)\z/m)
    return nil unless match

    literal = match[1].strip
    return nil unless literal.start_with?('"', "'")

    begin
      unwrapped = eval(literal)
    rescue StandardError
      return nil
    end

    unwrapped.to_s.strip
  end

  def load_bootstrap_vars(config_path:, knowledge_path:, capability_schema:, extra_vars:)
    initial_vars = {}

    unless File.exist?(config_path)
      raise "system_config_instructions nÃ£o encontrado: #{config_path}"
    end

    initial_vars["system_config"] = File.read(config_path, encoding: "UTF-8")

    if knowledge_path && File.exist?(knowledge_path)
      initial_vars["domain_knowledge"] = File.read(knowledge_path, encoding: "UTF-8")
    end

    if capability_schema
      initial_vars["capability_schema"] =
        capability_schema.is_a?(String) ? capability_schema : JSON.pretty_generate(capability_schema)
    end

    extra_vars.each do |key, value|
      initial_vars[key.to_s] = value
    end

    initial_vars
  end
end

# ===========================================================
# Glauco.constructor — system constructor for RLM agents
# ===========================================================
module Glauco
  class << self
    def constructors
      @constructors ||= {}
    end

    def productions
      @productions ||= {}
    end

    def constructor(name = nil, &block)
      if block
        raise ArgumentError, "Glauco.constructor precisa de nome" if name.nil?

        definition = Glauco::RLM::Constructor.new(name)
        definition.instance_eval(&block)
        constructors[definition.name] = definition
        definition
      else
        key = name.to_sym
        constructors.fetch(key) do
          raise KeyError, "Glauco.constructor nao registrado: #{key.inspect}"
        end
      end
    end

    def register_production(name, object = nil, &block)
      key = name.to_sym
      productions[key] = object || block || key
    end

    # Minimal registry helper. Pode ser substituido depois pela DSL completa
    # Glauco.production, mas ja permite mount :nome no constructor.
    def production(name = nil, object = nil, &block)
      if object || block
        register_production(name, object, &block)
      else
        key = name.to_sym
        productions.fetch(key) do
          raise KeyError, "Glauco.production nao registrada: #{key.inspect}"
        end
      end
    end
  end
end

module Glauco
  module RLM
    class Constructor
      attr_reader :name, :description_text, :mounts, :install_block, :main_block

      def initialize(name)
        @name = name.to_sym
        @description_text = nil
        @mounts = {}
        @install_block = nil
        @main_block = nil
      end

      def description(text = nil, &block)
        @description_text = block ? block.call.to_s : text.to_s
        self
      end

      def mount(name, object = nil)
        key = name.to_sym
        @mounts[key] = object || key
        self
      end

      def install(&block)
        raise ArgumentError, "install precisa receber bloco" unless block

        @install_block = block
        self
      end

      def main(agent: nil, args: {}, **extra_args, &block)
        if block
          @main_block = block
          return self
        end

        raise ArgumentError, "constructor.main precisa de agent:" unless agent

        merged_args = (args || {}).merge(extra_args)
        system = SystemContext.new(
          constructor: self,
          agent: agent,
          args: merged_args
        )

        system.install!

        if @main_block
          if @main_block.arity == 1
            @main_block.call(system)
          else
            system.instance_eval(&@main_block)
          end
        else
          system
        end
      end

      def mounted_production_names
        @mounts.keys
      end
    end

    class SystemContext
      attr_reader :constructor, :agent, :args, :productions, :runtime

      def initialize(constructor:, agent:, args: {})
        @constructor = constructor
        @agent = agent
        @args = stringify_and_symbolize_args(args || {})
        @productions = resolve_productions(constructor.mounts)
        @runtime = InstalledRuntime.new(
          agent: agent,
          system: self,
          base_runtime: extract_agent_runtime(agent)
        )
        @installed = false
        @emitted = nil
      end

      def install!
        return self if @installed

        install_core_vars!

        installer = Installer.new(self)
        if constructor.install_block
          installer.instance_eval(&constructor.install_block)
        end

        agent.attach_runtime(@runtime)
        @installed = true
        self
      end

      def production(name)
        key = name.to_sym
        productions.fetch(key) do
          raise KeyError, "Production nao montada no constructor #{constructor.name}: #{key.inspect}"
        end
      end

      def run(name, **input)
        production(name).run(**input)
      end

      def emit(value)
        @emitted = value
        agent.set(:current_result, value) if agent.respond_to?(:set)
        value
      end

      def emitted
        @emitted
      end

      def input
        self
      end

      def read_text
        args[:raw_text] || args["raw_text"] || args[:input] || args["input"] || ""
      end

      def mounted_productions
        productions
      end

      def set_var(key, value)
        key = key.to_s

        agent.vars[key] = value if agent.respond_to?(:vars)

        initial_vars = agent.instance_variable_get(:@initial_vars)
        initial_vars ||= {}
        initial_vars[key] = value
        agent.instance_variable_set(:@initial_vars, initial_vars)

        value
      end

      def set_condition(key, value)
        conditions = agent.vars["rlm_conditions"] ||= {}
        conditions[key.to_sym] = value
        conditions[key.to_s] = value
        value
      end

      private

      def install_core_vars!
        set_var(:glauco_constructor, constructor.name)
        set_var(:glauco_constructor_description, constructor.description_text)
        set_var(:glauco_mounted_productions, productions.keys.map(&:to_s))
        set_var(:rlm_conditions, agent.vars["rlm_conditions"] || {})
      end

      def resolve_productions(mounts)
        mounts.each_with_object({}) do |(name, target), memo|
          memo[name.to_sym] = ProductionHandle.new(
            name: name,
            target: resolve_production_target(target),
            system: self
          )
        end
      end

      def resolve_production_target(target)
        if target.is_a?(Symbol) && Glauco.productions.key?(target)
          Glauco.productions[target]
        else
          target
        end
      end

      def extract_agent_runtime(agent)
        return agent.rlm_runtime if agent.respond_to?(:rlm_runtime)

        agent.instance_variable_get(:@runtime)
      rescue
        nil
      end

      def stringify_and_symbolize_args(hash)
        hash.each_with_object({}) do |(key, value), memo|
          memo[key] = value
          memo[key.to_sym] = value if key.respond_to?(:to_sym)
          memo[key.to_s] = value
        end
      end
    end

    class Installer
      attr_reader :system, :agent, :runtime

      def initialize(system)
        @system = system
        @agent = system.agent
        @runtime = system.runtime
      end

      def var(key, value = nil, &block)
        value = instance_eval(&block) if block
        system.set_var(key, value)
      end

      def condition(key, value = true, &block)
        value = instance_eval(&block) if block
        system.set_condition(key, value)
      end

      def fn(name, &block)
        raise ArgumentError, "fn #{name.inspect} precisa receber bloco" unless block

        runtime.define_function(name, &block)
      end

      def production(name)
        system.production(name)
      end

      def productions
        system.productions
      end

      def mounted_productions
        system.mounted_productions
      end

      def args
        system.args
      end
    end

    class InstalledRuntime
      BUILTIN_METHODS = %i[
        agent
        system
        get
        set
        var
        condition
        production
        productions
        mounted_productions
        run_production
        emit
        call_fn
      ].freeze

      attr_reader :agent, :system, :base_runtime, :functions

      def initialize(agent:, system:, base_runtime: nil)
        @agent = agent
        @system = system
        @base_runtime = base_runtime
        @functions = {}
      end

      def define_function(name, &block)
        key = name.to_sym
        @functions[key] = block

        define_singleton_method(key) do |*args, **kwargs, &inner_block|
          if kwargs.empty?
            instance_exec(*args, &block)
          elsif args.empty?
            instance_exec(**kwargs, &block)
          else
            instance_exec(*args, **kwargs, &block)
          end
        end

        key
      end

      def get(key)
        agent.get(key)
      end

      def set(key, value)
        agent.set(key, value)
      end

      def var(key, value = :__glauco_not_set)
        if value == :__glauco_not_set
          get(key)
        else
          set(key, value)
        end
      end

      def condition(key, default = nil)
        conditions = agent.vars["rlm_conditions"] || {}
        conditions.fetch(key.to_sym) { conditions.fetch(key.to_s, default) }
      end

      def production(name)
        system.production(name)
      end

      def productions
        system.productions
      end

      def mounted_productions
        system.mounted_productions
      end

      def run_production(name, **input)
        production(name).run(**input)
      end

      def emit(value)
        system.emit(value)
      end

      def call_fn(name, *args, **kwargs)
        public_send(name.to_sym, *args, **kwargs)
      end

      def public_methods(include_super = true)
        return super(include_super) if include_super

        base_methods =
          if base_runtime
            base_runtime.public_methods(false)
          else
            []
          end

        (BUILTIN_METHODS + functions.keys + base_methods).map(&:to_sym).uniq
      end

      def respond_to_missing?(name, include_private = false)
        functions.key?(name.to_sym) ||
          (base_runtime && base_runtime.respond_to?(name, include_private)) ||
          super
      end

      def method_missing(name, *args, **kwargs, &block)
        if functions.key?(name.to_sym)
          return public_send(name.to_sym, *args, **kwargs, &block)
        end

        if base_runtime && base_runtime.respond_to?(name)
          return base_runtime.public_send(name, *args, **kwargs, &block)
        end

        super
      end
    end

    class ProductionHandle
      attr_reader :name, :target, :system

      def initialize(name:, target:, system:)
        @name = name.to_sym
        @target = target
        @system = system
      end

      def run(**input)
        resolved = bind_target(target)

        if resolved.respond_to?(:run)
          call_with_fallback(resolved.method(:run), input)
        elsif resolved.respond_to?(:call)
          call_with_fallback(resolved.method(:call), input)
        elsif resolved.respond_to?(:to_proc)
          resolved.to_proc.call(input, system)
        else
          raise TypeError, "Production #{name.inspect} nao possui run/call: #{resolved.inspect}"
        end
      end

      private

      def bind_target(value)
        if value.respond_to?(:bind_system)
          value.bind_system(system)
        elsif value.respond_to?(:bind)
          begin
            value.bind(system.agent)
          rescue ArgumentError
            value
          end
        else
          value
        end
      end

      def call_with_fallback(callable, input)
        callable.call(**input, context: system)
      rescue ArgumentError
        begin
          callable.call(**input)
        rescue ArgumentError
          callable.call(input)
        end
      end
    end
  end
end

module Glauco
  module Backend
  end
end

java_import 'java.lang.System' if Frontend.swt?

module GlaucoBrowserProfile
  APP_NAME = "GlaucoAskedRuby"

  def self.configure!(
    profile_name: "default",
    root_dir: File.join(Dir.home, ".glauco", "profiles")
  )
    profile_dir = File.expand_path(
      File.join(root_dir, profile_name, "webview2")
    )

    FileUtils.mkdir_p(profile_dir)

    Display.setAppName(APP_NAME)

    System.setProperty(
      "org.eclipse.swt.browser.DefaultType",
      "edge"
    )

    System.setProperty(
      "org.eclipse.swt.browser.EdgeDataDir",
      profile_dir
    )

    profile_dir
  end
end

class GlaucoAgentBrowserEnv < GlaucoBasicPlasticAgent
  FRAME_LIMITATION_NOTE = "Frames internos via SWT Browser dependem da engine embutida e de same-origin. O schema abaixo prepara introspeccao e avaliacao em frame quando acessivel."

  def self.capability(name, description, params: [])
    {
      name: name,
      description: description,
      params: params
    }
  end

  def self.capability_schema_definition
    {
      shell: {
        description: "Capacidades do shell SWT para navegacao, DOM e exploracao de frames.",
        frame_support: {
          status: "experimental",
          notes: FRAME_LIMITATION_NOTE,
          fallback_paths: [
            "Migrar a camada de shell para Julia + WebViews quando embutir frames for requisito de primeira linha.",
            "Explorar Tauri + Leptos para manter avaliacao de JavaScript e rotas desktop com melhor controle de webview."
          ]
        },
        capabilities: [
          capability("open_url", "Abre uma URL no browser principal.", params: %w[url]),
          capability("current_url", "Retorna a URL atual do browser principal."),
          capability("eval_js", "Executa JavaScript no documento principal.", params: %w[js]),
          capability("read_html", "Le o HTML renderizado da janela atual."),
          capability("list_frames", "Inspeciona frames acessiveis da janela atual."),
          capability("eval_js_in_frame", "Executa JavaScript em um frame acessivel por indice ou nome.", params: %w[frame_ref js]),
          capability("frame_support_report", "Resume limites atuais de frames internos no SWT Browser.")
        ]
      }
    }
  end

  attr_reader :shell, :browser, :display, :overlay_shell, :overlay_browser
  attr_accessor :state, :visible

  def initialize(visible: false)
    super()

    @visible = visible
    capability_schema = self.class.capability_schema_definition

    @state = {
      current_url: nil,
      last_action: nil,
      context: {},
      capability_schema: capability_schema,
      overlay: {
        visible: false,
        requested_visible: false,
        url: nil,
        alpha: 255,
        bounds: nil
      }
    }

    start_ui_thread if @visible

    puts "[GlaucoAgentBrowserEnv] BEFORE bootstrap_agent!"

    bootstrap_agent!(
      system_config_instructions: File.expand_path("system_config_instructions.md", __dir__),
      domain_specific_knowledge: File.expand_path("dinamicas diretrizes - prompt.md", __dir__),
      runtime: self,
      capability_schema: capability_schema
    )

    puts "[GlaucoAgentBrowserEnv] AFTER bootstrap_agent!"
  end

  # ===========================================================
  # execuÃ§Ã£o
  # ===========================================================
  def interpretar(input_text)
    raise "runtime nÃ£o configurado" unless @runtime

    puts "[Interpreter] input_text: #{input_text.inspect}"

    result = run(input_text)

    run_ui do
      puts "[UI] browser=#{browser}"
    end

    result
  end

  # ===========================================================
  # UI
  # ===========================================================
  def start_ui_thread
    ready = false
    startup_error = nil

    release_frontend_display_if_idle!
    shutdown_ui_thread if @ui_thread&.alive?

    @ui_thread = Thread.new do
      begin
        @display = Display.new
        @shell, @shell_body, = GlaucoSWTChrome.create_shell(
          @display,
          title: "Agente de AutomaÃ§Ã£o",
          width: 1024,
          height: 768
        )
        @shell_body.setLayout(FillLayout.new)
        @browser = Browser.new(@shell_body, 0)
        install_overlay_tracking!

        @shell.open

        ready = true

        while !@shell.disposed?
          @display.sleep unless @display.read_and_dispatch
        end

        @display.dispose rescue nil
      rescue => e
        startup_error = e
        puts "[UI ERROR] #{e.class} - #{e.message}"
      ensure
        ready = true
      end
    end

    start = Time.now
    until ready
      sleep 0.05
      raise "Timeout ao iniciar UI" if Time.now - start > 10
    end

    raise startup_error if startup_error

    start = Time.now
    until @browser && !@browser.isDisposed
      sleep 0.05
      raise "Timeout ao materializar Browser" if Time.now - start > 10
    end
  end

  def ensure_ui_alive
    if @ui_thread.nil? || !@ui_thread.alive?
      start_ui_thread
      sleep 0.5
    end

    if @display.nil? || @display.isDisposed
      start_ui_thread
    end
  end

  def shutdown_ui_thread
    return unless @ui_thread&.alive?

    begin
      if @display && !@display.isDisposed
        @display.sync_exec do
          @overlay_shell.dispose if @overlay_shell && !@overlay_shell.isDisposed
          @shell.dispose if @shell && !@shell.isDisposed
        end
      end
    rescue StandardError
      # Segue para o cleanup abaixo.
    end

    @ui_thread.join(2)

    @display = nil
    @shell = nil
    @browser = nil
    @overlay_shell = nil
    @overlay_browser = nil
  end

  # ===========================================================
  # execuÃ§Ã£o UI segura
  # ===========================================================
  def run_ui(&block)
    ensure_ui_alive

    if Thread.current == @ui_thread
      block.call
    else
      result = nil

      @display.sync_exec do
        result = block.call
      end

      result
    end
  end

  # ===========================================================
  # helpers
  # ===========================================================
  def evaluate(js)
    ensure_ui_alive
    raise "browser nil" unless @browser

    run_ui { @browser.evaluate(js) }
  end

  def read_html(*)
    evaluate("return document.documentElement.outerHTML;")
  end

  def open_url(url)
    if !@visible && (@ui_thread.nil? || !@ui_thread.alive?)
      @state[:current_url] = url
      @state[:last_action] = "open_url_external"
      system("xdg-open", url)
      return "opened #{url} externally"
    end

    ensure_ui_alive
    raise "browser nil" unless @browser

    run_ui do
      @state[:current_url] = url
      @state[:last_action] = "open_url"
      @browser.setUrl(url)
    end

    "opened #{url}"
  end

  def current_url(*)
    @state[:current_url].to_s
  end

  def eval_js(js)
    @state[:last_action] = "eval_js"
    if !@visible && (@ui_thread.nil? || !@ui_thread.alive?)
      raise "browser nil: eval_js requer browser embutido. Inicialize com visible: true."
    end

    ensure_ui_alive
    raise "browser nil" unless @browser

    run_ui { @browser.evaluate(js) }
  end

  def list_frames(*)
    raw = eval_js(<<~JS)
      return JSON.stringify((function() {
        const frames = [];
        for (let index = 0; index < window.frames.length; index += 1) {
          const frame = window.frames[index];
          try {
            frames.push({
              index,
              name: frame.name || null,
              location: frame.location ? frame.location.href : null,
              accessible: true
            });
          } catch (error) {
            frames.push({
              index,
              name: null,
              location: null,
              accessible: false,
              error: String(error)
            });
          }
        }

        return {
          count: window.frames.length,
          frames
        };
      })());
    JS

    JSON.parse(raw.to_s)
  rescue JSON::ParserError
    { "count" => 0, "frames" => [], "raw" => raw.to_s }
  end

  def eval_js_in_frame(frame_ref, js)
    escaped_frame = frame_ref.to_s.dump
    escaped_js = js.to_s.dump

    raw = eval_js(<<~JS)
      return JSON.stringify((function() {
        const ref = #{escaped_frame};
        const code = #{escaped_js};
        let target = null;

        if (/^\\d+$/.test(ref)) {
          target = window.frames[Number(ref)];
        } else {
          target = window.frames[ref];
        }

        if (!target) {
          return { ok: false, error: "frame not found", ref };
        }

        try {
          const result = target.eval(code);
          return { ok: true, ref, result };
        } catch (error) {
          return { ok: false, ref, error: String(error) };
        }
      })());
    JS

    JSON.parse(raw.to_s)
  rescue JSON::ParserError
    { "ok" => false, "ref" => frame_ref.to_s, "error" => raw.to_s }
  end

  def frame_support_report(*)
    FRAME_LIMITATION_NOTE
  end

  def capability_schema(*)
    @state[:capability_schema]
  end

  # ===========================================================
  # overlay page
  # ===========================================================
  def overlay_open?
    !!(@overlay_shell && !@overlay_shell.isDisposed && @overlay_shell.getVisible)
  end

  def overlay_page(url: nil, html: nil, bounds: nil, alpha: 255, focus: false)
    show_overlay_page(
      url: url,
      html: html,
      bounds: bounds,
      alpha: alpha,
      focus: focus
    )
  end

  def show_overlay_page(url: nil, html: nil, bounds: nil, alpha: 255, focus: false)
    run_ui do
      ensure_overlay_shell!

      @state[:overlay][:url] = url if url
      @state[:overlay][:alpha] = alpha
      @state[:overlay][:bounds] = bounds if bounds

      begin
        @overlay_shell.setAlpha(alpha)
      rescue StandardError
        # Algumas plataformas/WM nao suportam alpha em Shell.
      end

      sync_overlay_page_bounds(bounds)

      @overlay_browser.setUrl(url) if url
      @overlay_browser.setText(html) if html

      @overlay_shell.setVisible(true)
      @overlay_shell.open
      @overlay_shell.setActive if focus

      @state[:overlay][:visible] = true
      @state[:overlay][:requested_visible] = true
      true
    end
  end

  def hide_overlay_page
    run_ui do
      return unless @overlay_shell && !@overlay_shell.isDisposed

      @overlay_shell.setVisible(false)
      @state[:overlay][:visible] = false
      @state[:overlay][:requested_visible] = false
      true
    end
  end

  def close_overlay_page
    hide_overlay_page
  end

  def dispose_overlay_page
    run_ui do
      return unless @overlay_shell && !@overlay_shell.isDisposed

      @overlay_browser.dispose if @overlay_browser && !@overlay_browser.isDisposed
      @overlay_shell.dispose
      @overlay_browser = nil
      @overlay_shell = nil
      @state[:overlay][:visible] = false
      @state[:overlay][:requested_visible] = false
      true
    end
  end

  def sync_overlay_page_bounds(bounds = nil)
    return unless @browser && !@browser.isDisposed
    return unless @overlay_shell && !@overlay_shell.isDisposed

    browser_bounds = @browser.getBounds
    resolved = resolve_overlay_bounds(browser_bounds, bounds || @state.dig(:overlay, :bounds))
    origin = @browser.toDisplay(resolved[:x], resolved[:y])

    @overlay_shell.setBounds(origin.x, origin.y, resolved[:width], resolved[:height])
    resolved
  end

  def overlay_support_report
    <<~TXT.strip
      SWT overlay page viavel via child Shell + Browser secundario.
      Melhor caminho: Shell filha com SWT::NO_TRIM | SWT::ON_TOP | SWT::TOOL, sincronizada com o Browser principal.
      Limite importante: nao e uma subview real dentro do Browser; e uma janela nativa separada posicionada sobre ele.
      Em Linux/Wayland e em algumas engines do SWT Browser, alpha e coordenadas podem variar por window manager.
    TXT
  end

  private

  def ensure_overlay_shell!
    return @overlay_shell if @overlay_shell && !@overlay_shell.isDisposed

    overlay_style = SWT::NO_TRIM | SWT::ON_TOP | SWT::TOOL
    @overlay_shell = Shell.new(@shell, overlay_style)
    @overlay_shell.setLayout(FillLayout.new)
    @overlay_browser = Browser.new(@overlay_shell, 0)
    @overlay_shell.setVisible(false)

    begin
      @overlay_shell.setAlpha(@state.dig(:overlay, :alpha) || 255)
    rescue StandardError
      # Alpha nao e garantido em todas as plataformas.
    end

    sync_overlay_page_bounds
    @overlay_shell
  end

  def install_overlay_tracking!
    listener = Listener.impl { |_event| sync_overlay_page_bounds if overlay_open? rescue nil }
    deactivate_listener = Listener.impl { |_event| hide_overlay_for_parent_state! rescue nil }
    activate_listener = Listener.impl { |_event| restore_overlay_for_parent_state! rescue nil }
    close_listener = Listener.impl { |_event| dispose_overlay_page rescue nil }

    @shell.addListener(SWT::Move, listener)
    @shell.addListener(SWT::Resize, listener)
    @shell.addListener(SWT::Deactivate, deactivate_listener)
    @shell.addListener(SWT::Iconify, deactivate_listener)
    @shell.addListener(SWT::Activate, activate_listener)
    @shell.addListener(SWT::Deiconify, activate_listener)
    @shell.addListener(SWT::Close, close_listener)
  end

  def resolve_overlay_bounds(browser_bounds, requested_bounds)
    bounds = requested_bounds || {}

    x =
      if bounds.key?(:x)
        bounds[:x].to_i
      else
        (browser_bounds.width * (bounds.fetch(:x_ratio, 0.0))).to_i
      end

    y =
      if bounds.key?(:y)
        bounds[:y].to_i
      else
        (browser_bounds.height * (bounds.fetch(:y_ratio, 0.15))).to_i
      end

    width =
      if bounds.key?(:width)
        bounds[:width].to_i
      else
        (browser_bounds.width * (bounds.fetch(:width_ratio, 1.0))).to_i
      end

    height =
      if bounds.key?(:height)
        bounds[:height].to_i
      else
        (browser_bounds.height * (bounds.fetch(:height_ratio, 0.70))).to_i
      end

    {
      x: x,
      y: y,
      width: [width, 1].max,
      height: [height, 1].max
    }
  end

  def hide_overlay_for_parent_state!
    return unless @overlay_shell && !@overlay_shell.isDisposed
    return unless @state.dig(:overlay, :requested_visible)

    @overlay_shell.setVisible(false)
    @state[:overlay][:visible] = false
  end

  def restore_overlay_for_parent_state!
    return unless @overlay_shell && !@overlay_shell.isDisposed
    return unless @state.dig(:overlay, :requested_visible)

    sync_overlay_page_bounds
    @overlay_shell.setVisible(true)
    @state[:overlay][:visible] = true
  end

  def release_frontend_display_if_idle!
    return unless defined?($display) && $display && !$display.isDisposed

    shell_visible =
      begin
        defined?($shell) && $shell && !$shell.isDisposed && $shell.getVisible
      rescue StandardError
        false
      end

    return if shell_visible

    begin
      $browser.dispose if defined?($browser) && $browser && !$browser.isDisposed
      $shell.dispose if defined?($shell) && $shell && !$shell.isDisposed
      $display.dispose unless $display.isDisposed
    rescue StandardError
      # Se o frontend global nao puder ser reciclado, o startup do shell dedicado
      # ainda vai falhar explicitamente ao tentar abrir outro Display.
    ensure
      if defined?($embedded_surfaces) && $embedded_surfaces
        $embedded_surfaces.each_value do |surface|
          surface.dispose if surface && !surface.isDisposed rescue nil
        end
      end
      $embedded_surfaces = {}
      $browser = nil
      $surface_parent = nil
      $shell = nil
      $display = nil
      $root = nil
    end
  end
end

module Glauco
  module Backend
    class SqlDatabase
      attr_reader :path

      SQLITE_DRIVER_CLASS = "org.sqlite.JDBC"

      def initialize(path:)
        @path = File.expand_path(path)
        @connection = nil
      end

      def connect
        return @connection if @connection

        load_sqlite_driver!
        FileUtils.mkdir_p(File.dirname(path))
        @connection = Java::JavaSql::DriverManager.getConnection("jdbc:sqlite:#{path}")
      end

      def execute(sql, params = [])
        statement = prepare(sql, params)
        statement.executeUpdate
      ensure
        statement&.close
      end

      def query(sql, params = [])
        statement = prepare(sql, params)
        result = statement.executeQuery
        rows = []
        metadata = result.getMetaData
        column_count = metadata.getColumnCount

        while result.next
          row = {}
          (1..column_count).each do |index|
            row[metadata.getColumnLabel(index)] = result.getObject(index)
          end
          rows << row
        end

        rows
      ensure
        result&.close
        statement&.close
      end

      def migrate!(statements)
        Array(statements).each { |statement| execute(statement) }
        true
      end

      def close
        @connection&.close
        @connection = nil
      end

      private

      def prepare(sql, params)
        statement = connect.prepareStatement(sql.to_s)
        Array(params).each_with_index do |value, index|
          statement.setObject(index + 1, value)
        end
        statement
      end

      def load_sqlite_driver!
        begin
          require "jdbc/sqlite3"
        rescue LoadError
          nil
        end
        require_sqlite_jars
        Java::JavaLang::Class.forName(SQLITE_DRIVER_CLASS)
      rescue Java::JavaLang::ClassNotFoundException
        raise LoadError, "Driver SQLite JDBC nao encontrado. Adicione sqlite-jdbc*.jar em jarlibs/ ou a gem jdbc-sqlite3."
      end

      def require_sqlite_jars
        roots = [
          defined?(PROJECT_ROOT) ? File.join(PROJECT_ROOT, "jarlibs") : nil,
          defined?(JARLIBS_DIR) ? JARLIBS_DIR : nil
        ].compact.uniq

        roots.each do |root|
          next unless Dir.exist?(root)

          Dir.glob(File.join(root, "sqlite-jdbc*.jar")).each { |jar| require jar }
        end
      end
    end

    class SqlAgentRuntime
      attr_reader :database

      def initialize(database_path:, schema: [], seed: nil)
        @database = SqlDatabase.new(path: database_path)
        @schema = Array(schema)
        @seed = seed
      end

      def db_init(*)
        database.migrate!(@schema)
        db_seed_company(@seed) if @seed
        "database initialized at #{database.path}"
      end

      def db_maintain(statements)
        database.migrate!(Array(statements))
        "database maintenance applied"
      end

      def db_execute(sql, params = [])
        database.execute(sql, params)
      end

      def db_query(sql, params = [])
        database.query(sql, params)
      end

      def db_seed_company(company)
        return "no company data" unless company

        database.execute(
          "INSERT OR REPLACE INTO companies (id, name, cnpj, city, state) VALUES (?, ?, ?, ?, ?)",
          [company[:id], company[:name], company[:cnpj], company[:city], company[:state]]
        )
        Array(company[:documents]).each do |document|
          database.execute(
            "INSERT OR REPLACE INTO documents (id, company_id, name, kind, status, confidence) VALUES (?, ?, ?, ?, ?, ?)",
            [document[:id], company[:id], document[:name], document[:kind], document[:status], document[:confidence]]
          )
        end
        Array(company[:criteria]).each do |criterion|
          database.execute(
            "INSERT OR REPLACE INTO criteria (id, company_id, title, status, risk) VALUES (?, ?, ?, ?, ?)",
            [criterion[:id], company[:id], criterion[:title], criterion[:status], criterion[:risk]]
          )
        end

        "company data seeded"
      end

      def db_company_snapshot(company_id)
        {
          company: database.query("SELECT * FROM companies WHERE id = ?", [company_id]).first,
          documents: database.query("SELECT * FROM documents WHERE company_id = ? ORDER BY name", [company_id]),
          criteria: database.query("SELECT * FROM criteria WHERE company_id = ? ORDER BY title", [company_id])
        }
      end
    end
  end
end

module Frontend
  DEBUG = ENV.fetch("GLAUCO_DEBUG", "0") == "1"
  DEFAULT_PORT = (ENV["GLAUCO_PORT"] || "8000").to_i
  @overlay_registry = {}
  @embedded_browser_registry = {}
  @served_page_registry = {}
  @served_page_servers = {}
  @ngrok_tunnels = {}

  def debug_log(msg)
    puts "[DEBUG] #{msg}" if DEBUG
  end

  def self.overlay_registry
    @overlay_registry ||= {}
  end

  def self.embedded_browser_registry
    @embedded_browser_registry ||= {}
  end

  def self.served_page_registry
    @served_page_registry ||= {}
  end

  def self.served_page_servers
    @served_page_servers ||= {}
  end

  def self.ngrok_tunnels
    @ngrok_tunnels ||= {}
  end

  def self.on_ui_thread
    display = defined?($display) ? $display : nil
    return yield unless display && !display.isDisposed

    current = Java::JavaLang::Thread.currentThread rescue nil
    return yield if current && display.respond_to?(:getThread) && display.getThread == current

    result = nil
    error = nil
    display.sync_exec do
      begin
        result = yield
      rescue => e
        error = e
      end
    end
    raise error if error

    result
  end

  def self.register_embedded_browser(id, config)
    key = id.to_s
    previous = embedded_browser_registry[key] || {}

    runtime_url = previous[:runtime_url]
    visual_bounds = previous[:visual_bounds]

    current = previous.merge(config)

    current[:runtime_url] = runtime_url if runtime_url
    current[:visual_bounds] = visual_bounds if visual_bounds

    embedded_browser_registry[key] = current
  end

  def self.sync_embedded_browser_source!(
    element_id,
    surface
  )
    config = embedded_browser_registry[
      element_id.to_s
    ]

    return false unless config

    if config[:html]
      html = config[:html].to_s

      source_key = [
        "html",
        Zlib.crc32(html),
        html.bytesize
      ].join(":")

      return true if surface.getData(
        "glauco_embedded_source"
      ).to_s == source_key

      loaded = surface.setText(html)
    else
      url = (
        config[:runtime_url] ||
        config[:url]
      ).to_s.strip

      return false if url.empty?

      source_key = "url:#{url}"

      return true if surface.getData(
        "glauco_embedded_source"
      ).to_s == source_key

      puts "[EmbeddedBrowser] carregando #{url}"

      loaded = surface.setUrl(url)
    end

    if loaded
      surface.setData(
        "glauco_embedded_source",
        source_key
      )
    else
      warn [
        "[EmbeddedBrowser]",
        "Browser recusou a fonte:",
        source_key
      ].join(" ")
    end

    loaded
  end

  def self.register_embedded_browser(id, config)
    key = id.to_s
    previous = embedded_browser_registry[key] || {}

    embedded_browser_registry[key] =
      previous.merge(config).tap do |current|
        current[:visual_bounds] ||= previous[:visual_bounds]
      end
  end

  def self.register_served_page(id, config)
    normalized = config.merge(id: id.to_s)
    normalized[:port] = ensure_served_page_server!(normalized[:port]) if normalized[:port]
    served_page_registry[id.to_s] = normalized
  end

  def self.unregister_served_page(id)
    served_page_registry.delete(id.to_s)
  end

  def self.served_page_url(id)
    page = served_page_registry[id.to_s]
    port = page && page[:port] ? page[:port].to_i : @server_port
    "http://localhost:#{port}/__glauco/pages/#{URI.encode_www_form_component(id.to_s)}"
  end

  def self.served_page_path(id)
    "/__glauco/pages/#{URI.encode_www_form_component(id.to_s)}"
  end

  def self.served_page_public_url(id, public_base_url)
    base = public_base_url.to_s.strip.sub(%r{/+\z}, "")
    "#{base}#{served_page_path(id)}"
  end

  def self.ensure_served_page_server!(preferred_port)
    requested_port = preferred_port.to_i
    return @server_port if requested_port == @server_port
    return served_page_servers[requested_port][:port] if served_page_servers[requested_port]

    actual_port = resolve_server_port(requested_port)
    server = WEBrick::HTTPServer.new(
      Port: actual_port,
      DocumentRoot: PUBLIC_DIR,
      AccessLog: [],
      Logger: WEBrick::Log.new(nil, 0)
    )
    mount_served_page_routes(server)
    thread = Thread.new { server.start }
    served_page_servers[requested_port] = { port: actual_port, server: server, thread: thread }
    actual_port
  end

  def self.mount_served_page_routes(server)
    server.mount_proc '/__glauco/ping' do |_req, res|
      res['Content-Type'] = 'text/plain'
      res.body = 'ok'
    end

    server.mount_proc '/__glauco/callback' do |req, res|
      res['Content-Type'] = 'application/json'
      begin
        payload = JSON.parse(req.body.to_s)
        callback_name = payload["callback"].to_s
        value = payload["value"]
        callback = $callbacks[callback_name]
        raise "Callback nao encontrado: #{callback_name}" unless callback

        Frontend.on_ui_thread { callback.call(value) }
        res.body = JSON.generate(ok: true, reload: true)
      rescue => e
        res.status = 500
        res.body = JSON.generate(ok: false, error: "#{e.class}: #{e.message}")
      end
    end

    mount_model_routes(server)

    server.mount_proc '/__glauco/pages' do |req, res|
      id = req.path.sub(%r{\A/__glauco/pages/?}, "")
      id = URI.decode_www_form_component(id.to_s)
      page = Frontend.served_page_registry[id]

      if page
        res['Content-Type'] = 'text/html; charset=UTF-8'
        component = page[:component]
        res.body = component && component.respond_to?(:render_served_page_document) ? Frontend.on_ui_thread { component.render_served_page_document } : page[:html].to_s
      else
        res.status = 404
        res.body = "Served page not found: #{id}"
      end
    end
  end

  def self.mount_model_routes(server)
    server.mount_proc '/__glauco/models' do |req, res|
      res['Content-Type'] = 'application/json'
      begin
        unless defined?(Glauco::Framework::SQL)
          begin
            require "glauco/framework/sql"
          rescue LoadError
            require File.expand_path("../../../gem/lib/glauco/framework/sql", __dir__)
          end
        end
        payload = req.request_method == "GET" ? {} : JSON.parse(req.body.to_s)
        res.body = JSON.generate(Glauco::Framework::SQL.handle_frontend_request(payload))
      rescue => e
        res.status = 500
        res.body = JSON.generate(ok: false, error: "#{e.class}: #{e.message}")
      end
    end
  end
  
  def self.start_ngrok_tunnel(
    id,
    port: server_port,
    ngrok_bin: ENV.fetch("NGROK_BIN", "ngrok"),
    authtoken: ENV["NGROK_AUTHTOKEN"]
  )
    id = id.to_s
    return ngrok_tunnels[id] if ngrok_tunnels[id]&.dig(:public_url)

    ngrok_bin = ngrok_bin.to_s.strip

    puts "[Glauco/ngrok] Binario usado:"
    puts ngrok_bin

    version_output = IO.popen([ngrok_bin, "version"], err: [:child, :out]) do |io|
      io.read
    end

    puts "[Glauco/ngrok] Versao detectada:"
    puts version_output.strip

    if authtoken && !authtoken.to_s.strip.empty?
      ok = system(ngrok_bin, "config", "add-authtoken", authtoken.to_s.strip)
      raise "falha ao configurar authtoken do ngrok" unless ok
    end

    ngrok_log_stdout = GlaucoEnv.truthy?(ENV.fetch("GLAUCO_NGROK_LOG_STDOUT", "0"))
    ngrok_log_target = ngrok_log_stdout ? $stdout : File::NULL

    pid = Process.spawn(
      ngrok_bin,
      "http",
      port.to_s,
      "--log=stdout",
      "--log-level=info",
      out: ngrok_log_target,
      err: ngrok_log_target
    )
    Process.detach(pid)

    public_url = wait_for_ngrok_public_url(port: port)

    ngrok_tunnels[id] = {
      pid: pid,
      port: port,
      public_url: public_url
    }
  rescue Errno::ENOENT
    raise "ngrok nao encontrado. Defina NGROK_BIN com caminho absoluto no .env."
  end

  def self.stop_ngrok_tunnel(id)
    tunnel = ngrok_tunnels.delete(id.to_s)
    return false unless tunnel && tunnel[:pid]

    begin
      Process.kill("TERM", tunnel[:pid])
    rescue StandardError
      begin
        Process.kill("KILL", tunnel[:pid])
      rescue StandardError
        nil
      end
    end
    true
  end

  def self.wait_for_ngrok_public_url(timeout: 15, port: nil)
    deadline = Time.now + timeout
    api_ports = Array(ENV["NGROK_API_PORT"] || ENV["NGROK_WEB_PORT"] || nil).compact.map(&:to_i)
    api_ports += (4040..4050).to_a
    api_ports = api_ports.uniq
    expected_port = port.to_i if port

    loop do
      api_ports.each do |api_port|
        begin
          uri = URI("http://127.0.0.1:#{api_port}/api/tunnels")
          response = Net::HTTP.get_response(uri)
          next unless response.is_a?(Net::HTTPSuccess)

          data = JSON.parse(response.body)
          tunnels = Array(data["tunnels"])
          tunnels = tunnels.select { |item| item["public_url"].to_s.start_with?("https://") }

          if expected_port && expected_port > 0
            matching = tunnels.find do |item|
              addr = item.dig("config", "addr").to_s
              addr.end_with?(":#{expected_port}") || addr.include?("localhost:#{expected_port}") || addr.include?("127.0.0.1:#{expected_port}")
            end
            return matching["public_url"] if matching && matching["public_url"]
          end

          tunnel = tunnels.first
          return tunnel["public_url"] if tunnel && tunnel["public_url"]
        rescue StandardError
          nil
        end
      end

      if Time.now >= deadline
        raise "ngrok iniciou, mas nao publicou URL HTTPS em http://127.0.0.1:4040..4050/api/tunnels"
      end

      sleep 0.3
    end
  end

  def self.ngrok_auto_enabled?
    GlaucoEnv.truthy?(ENV.fetch("GLAUCO_NGROK_AUTO", "0"))
  end

  def self.ensure_ngrok_tunnel_for_port!(
    port: server_port,
    id: ENV.fetch("GLAUCO_NGROK_ID", "frontend"),
    ngrok_bin: ENV.fetch("NGROK_BIN", "ngrok"),
    authtoken: ENV["NGROK_AUTHTOKEN"]
  )
    start_ngrok_tunnel(id, port: port, ngrok_bin: ngrok_bin, authtoken: authtoken)
  end

  def self.auto_start_ngrok_if_configured!
    return nil unless ngrok_auto_enabled?

    port = ENV.fetch("GLAUCO_NGROK_PORT", server_port).to_i
    ensure_ngrok_tunnel_for_port!(port: port)
  end

  def self.public_url_for_port(port: server_port, id: ENV.fetch("GLAUCO_NGROK_ID", "frontend"))
    tunnel = ngrok_tunnels[id.to_s]
    return tunnel[:public_url] if tunnel && tunnel[:port].to_i == port.to_i

    "http://localhost:#{port}"
  end

  def self.normalize_twa_public_url!(public_url)
    raw = public_url.to_s.strip

    raise "[Glauco/TWA] URL publica vazia. Configure GLAUCO_TWA_PUBLIC_URL ou habilite ngrok." if raw.empty?
    raise "[Glauco/TWA] URL publica invalida para TWA: #{raw.inspect}. Use uma URL HTTPS publica." unless raw.start_with?("https://")

    uri = URI.parse(raw)
    host = uri.host.to_s.strip

    raise "[Glauco/TWA] Host vazio extraido da URL: #{raw.inspect}" if host.empty?
    raise "[Glauco/TWA] Host local invalido para TWA: #{host.inspect}" if ["localhost", "127.0.0.1", "0.0.0.0"].include?(host) || host.end_with?(".local")
    raise "[Glauco/TWA] Host invalido para Bubblewrap: #{host.inspect}" unless host.include?(".")

    port_part = uri.port && ![80, 443].include?(uri.port) ? ":#{uri.port}" : ""
    base_url = "#{uri.scheme}://#{host}#{port_part}"

    path = uri.path.to_s
    path = "/" if path.empty?
    query = uri.query.to_s.empty? ? "" : "?#{uri.query}"

    {
      raw: raw,
      base_url: base_url,
      host: host,
      start_url: "#{path}#{query}",
      manifest_url: "#{base_url}/manifest.webmanifest"
    }
  rescue URI::InvalidURIError => e
    raise "[Glauco/TWA] URL publica malformada: #{raw.inspect} - #{e.message}"
  end

  def self.write_png_icon!(path, size:, color: "#0f62fe")
    hex = color.to_s.delete_prefix("#")
    r = hex[0, 2].to_i(16)
    g = hex[2, 2].to_i(16)
    b = hex[4, 2].to_i(16)
    a = 255

    raw = String.new.b
    size.times do
      raw << 0
      size.times { raw << r << g << b << a }
    end

    chunk = lambda do |type, data|
      [data.bytesize].pack("N") + type + data + [Zlib.crc32(type + data)].pack("N")
    end

    png = String.new.b
    png << "\x89PNG\r\n\x1a\n".b
    png << chunk.call("IHDR".b, [size, size, 8, 6, 0, 0, 0].pack("NNCCCCC"))
    png << chunk.call("IDAT".b, Zlib::Deflate.deflate(raw))
    png << chunk.call("IEND".b, "".b)

    File.binwrite(path, png)
  end

  def self.ensure_twa_public_icons!(public_dir:, theme_color: "#0f62fe")
    FileUtils.mkdir_p(public_dir)

    icon_192 = File.join(public_dir, "icon-192.png")
    icon_512 = File.join(public_dir, "icon-512.png")

    write_png_icon!(icon_192, size: 192, color: theme_color) unless File.file?(icon_192)
    write_png_icon!(icon_512, size: 512, color: theme_color) unless File.file?(icon_512)

    [icon_192, icon_512]
  end

  def self.write_pwa_web_manifest!(public_dir:, public_url:, app_name:, short_name: nil, theme_color: "#0f62fe", background_color: "#ffffff")
    normalized = normalize_twa_public_url!(public_url)
    short_name ||= app_name.to_s[0, 12]

    FileUtils.mkdir_p(public_dir)
    ensure_twa_public_icons!(public_dir: public_dir, theme_color: theme_color)

    manifest = {
      name: app_name,
      short_name: short_name,
      start_url: normalized[:start_url],
      scope: "/",
      display: "standalone",
      background_color: background_color,
      theme_color: theme_color,
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
      ]
    }

    manifest_path = File.join(public_dir, "manifest.webmanifest")
    File.write(manifest_path, JSON.pretty_generate(manifest))

    puts "[Glauco/TWA] Web Manifest PWA gerado em: #{manifest_path}"
    puts "[Glauco/TWA] Web Manifest publico: #{normalized[:manifest_url]}"
    puts File.read(manifest_path)

    { path: manifest_path, url: normalized[:manifest_url], normalized: normalized }
  end

  def self.write_twa_config_manifest!(target:, public_url:, package_name:, app_name:)
    normalized = normalize_twa_public_url!(public_url)
    launcher_name = app_name.to_s[0, 12]

    manifest = {
      packageId: package_name,
      host: normalized[:host],
      name: app_name,
      launcherName: launcher_name,
      startUrl: normalized[:start_url],
      display: "standalone",
      themeColor: "#0f62fe",
      navigationColor: "#0f62fe",
      signingKey: { path: "android.keystore", alias: "android" }
    }

    manifest_path = File.join(target, "twa-config.json")
    File.write(manifest_path, JSON.pretty_generate(manifest))

    puts "[Glauco/TWA] Config Bubblewrap de referencia gerada em: #{manifest_path}"
    puts "[Glauco/TWA] URL publica usada: #{normalized[:raw]}"
    puts "[Glauco/TWA] Host usado: #{normalized[:host]}"
    puts File.read(manifest_path)

    manifest_path
  end

  def self.write_twa_manifest!(target:, public_url:, package_name:, app_name:)
    # Compatibilidade com chamadas antigas: agora gera a config de referencia.
    # O comando `bubblewrap init --manifest` deve receber a URL HTTPS do Web Manifest PWA.
    write_twa_config_manifest!(target: target, public_url: public_url, package_name: package_name, app_name: app_name)
  end

  def self.generate_twa_artifacts_for(id, output_dir: File.join(PROJECT_ROOT, "dist", "twa"), public_url: nil, package_name: nil, app_name: nil)
    config = served_page_registry[id.to_s] || {}
    tunnel_url = ngrok_tunnels.dig(id.to_s, :public_url)
    public_url ||= tunnel_url ? served_page_public_url(id, tunnel_url) : served_page_url(id)
    app_name ||= config[:title] || id.to_s
    package_name ||= config.dig(:twa, :package_name) || "app.glauco.#{id.to_s.gsub(/[^a-zA-Z0-9_]/, "_").downcase}"
    target = File.join(output_dir, id.to_s)

    FileUtils.mkdir_p(target)

    pwa_manifest = write_pwa_web_manifest!(
      public_dir: PUBLIC_DIR,
      public_url: public_url,
      app_name: app_name,
      short_name: config.dig(:twa, :short_name)
    )

    write_twa_config_manifest!(
      target: target,
      public_url: public_url,
      package_name: package_name,
      app_name: app_name
    )

    File.write(File.join(target, "assetlinks.json"), JSON.pretty_generate([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: package_name,
          sha256_cert_fingerprints: Array(config.dig(:twa, :sha256_cert_fingerprints))
        }
      }
    ]))

    File.write(File.join(target, "build-twa.ps1"), <<~PS1)
      Set-StrictMode -Version Latest
      $ErrorActionPreference = "Stop"
      Set-Location $PSScriptRoot
      bubblewrap init --manifest=#{pwa_manifest[:url]}
      bubblewrap build
    PS1

    sh_path = File.join(target, "build-twa.sh")
    File.write(sh_path, <<~SH)
      #!/usr/bin/env sh
      set -eu
      cd "$(dirname "$0")"
      bubblewrap init --manifest=#{Shellwords.escape(pwa_manifest[:url])}
      bubblewrap build
    SH
    File.chmod(0o755, sh_path) rescue nil

    File.write(File.join(target, "manifest-url.txt"), pwa_manifest[:url])

    target
  end

  def self.generate_twa_for_port!(
    port: ENV.fetch("GLAUCO_TWA_PORT", server_port).to_i,
    output_dir: File.join(PROJECT_ROOT, "dist", "twa"),
    public_url: nil,
    package_name: ENV["GLAUCO_TWA_PACKAGE"],
    app_name: ENV.fetch("GLAUCO_TWA_NAME", "Glauco App"),
    id: ENV.fetch("GLAUCO_TWA_ID", "frontend"),
    auto_ngrok: GlaucoEnv.truthy?(ENV.fetch("GLAUCO_TWA_NGROK", ENV.fetch("GLAUCO_NGROK_AUTO", "0")))
  )
    public_url ||= begin
      if auto_ngrok
        tunnel = ensure_ngrok_tunnel_for_port!(port: port, id: id)
        served_page_public_url(id, tunnel[:public_url])
      else
        public_url_for_port(port: port, id: id)
      end
    end

    fake_id = id.to_s
    served_page_registry[fake_id] ||= {
      id: fake_id,
      title: app_name,
      port: port,
      twa: { package_name: package_name }
    }

    generate_twa_artifacts_for(
      fake_id,
      output_dir: output_dir,
      public_url: public_url,
      package_name: package_name,
      app_name: app_name
    )
  end

  def self.build_signed_twa_apk_for(
    id,
    output_dir: File.join(PROJECT_ROOT, "dist", "twa"),
    public_url: nil,
    package_name: nil,
    app_name: nil,
    bubblewrap_bin: ENV.fetch("BUBBLEWRAP_BIN", "bubblewrap")
  )
    target = generate_twa_artifacts_for(
      id,
      output_dir: output_dir,
      public_url: public_url,
      package_name: package_name,
      app_name: app_name
    )
    ensure_twa_build_requirements!(bubblewrap_bin: bubblewrap_bin)

    Dir.chdir(target) do
      manifest_url = File.read(File.join(target, "manifest-url.txt")).strip
      run_twa_command!(bubblewrap_bin, "init", "--manifest=#{manifest_url}") unless File.exist?(File.join(target, "package.json"))
      run_twa_command!(bubblewrap_bin, "build")
    end

    {
      directory: target,
      apk: Dir.glob(File.join(target, "**", "*.apk")).max_by { |path| File.mtime(path).to_f },
      aab: Dir.glob(File.join(target, "**", "*.aab")).max_by { |path| File.mtime(path).to_f }
    }
  end

  def self.build_twa_apk_noninteractive_for(
    id,
    output_dir: File.join(PROJECT_ROOT, "dist", "twa"),
    public_url: nil,
    package_name: nil,
    app_name: nil,
    bubblewrap_bin: ENV.fetch("BUBBLEWRAP_BIN", "bubblewrap"),
    node_bin: ENV.fetch("NODE_BIN", "node")
  )
    target = generate_twa_artifacts_for(
      id,
      output_dir: output_dir,
      public_url: public_url,
      package_name: package_name,
      app_name: app_name
    )
    ensure_twa_build_requirements!(bubblewrap_bin: bubblewrap_bin)

    init_script = File.join(PROJECT_ROOT, "scripts", "bubblewrap_init.js")
    raise "Script Bubblewrap nao encontrado: #{init_script}" unless File.file?(init_script)

    manifest_url = File.read(File.join(target, "manifest-url.txt")).strip
    config_path = File.join(target, "twa-config.json")

    FileUtils.rm_f(File.join(target, "twa-manifest.json"))
    FileUtils.rm_f(File.join(target, "manifest-checksum.txt"))

    run_twa_command!(node_bin, init_script, target, manifest_url, config_path)
    ensure_twa_signing_key!(target)

    old_storepass = ENV["BUBBLEWRAP_KEYSTORE_PASSWORD"]
    old_keypass = ENV["BUBBLEWRAP_KEY_PASSWORD"]
    ENV["BUBBLEWRAP_KEYSTORE_PASSWORD"] = ENV.fetch("GLAUCO_TWA_KEYSTORE_PASSWORD", "android")
    ENV["BUBBLEWRAP_KEY_PASSWORD"] = ENV.fetch("GLAUCO_TWA_KEY_PASSWORD", "android")

    Dir.chdir(target) do
      run_twa_command!(bubblewrap_bin, "build")
    end

    {
      directory: target,
      apk: Dir.glob(File.join(target, "**", "*.apk")).max_by { |path| File.mtime(path).to_f },
      aab: Dir.glob(File.join(target, "**", "*.aab")).max_by { |path| File.mtime(path).to_f }
    }
  ensure
    ENV["BUBBLEWRAP_KEYSTORE_PASSWORD"] = old_storepass if defined?(old_storepass)
    ENV["BUBBLEWRAP_KEY_PASSWORD"] = old_keypass if defined?(old_keypass)
  end

  def self.ensure_twa_build_requirements!(bubblewrap_bin: ENV.fetch("BUBBLEWRAP_BIN", "bubblewrap"))
    raise "bubblewrap nao encontrado. Instale com npm install -g @bubblewrap/cli ou defina BUBBLEWRAP_BIN." unless command_available?(bubblewrap_bin)
    raise "ANDROID_HOME ou ANDROID_SDK_ROOT nao definido. Instale Android SDK Command-line Tools e exporte o caminho." if ENV["ANDROID_HOME"].to_s.empty? && ENV["ANDROID_SDK_ROOT"].to_s.empty?
    raise "JAVA_HOME nao definido. Configure JDK compativel com Android/Gradle." if ENV["JAVA_HOME"].to_s.empty?

    true
  end

  def self.ensure_twa_signing_key!(target)
    config_path = File.join(target, "twa-config.json")
    config = File.file?(config_path) ? JSON.parse(File.read(config_path)) : {}
    signing_key = config.fetch("signingKey", {})
    key_path = signing_key.fetch("path", "android.keystore").to_s
    key_path = File.expand_path(key_path, target) unless Pathname.new(key_path).absolute?
    return key_path if File.file?(key_path)

    keytool_bin = ENV["KEYTOOL_BIN"].to_s
    if keytool_bin.empty? && !ENV["JAVA_HOME"].to_s.empty?
      candidate = File.join(ENV["JAVA_HOME"], "bin", Gem.win_platform? ? "keytool.exe" : "keytool")
      keytool_bin = candidate if File.executable?(candidate)
    end
    keytool_bin = "keytool" if keytool_bin.empty?
    storepass = ENV.fetch("GLAUCO_TWA_KEYSTORE_PASSWORD", "android")
    keypass = ENV.fetch("GLAUCO_TWA_KEY_PASSWORD", "android")
    dname = [
      "CN=#{ENV.fetch("GLAUCO_TWA_KEY_FULL_NAME", "Glauco Development")}",
      "OU=#{ENV.fetch("GLAUCO_TWA_KEY_ORG_UNIT", "Development")}",
      "O=#{ENV.fetch("GLAUCO_TWA_KEY_ORG", "Glauco")}",
      "C=#{ENV.fetch("GLAUCO_TWA_KEY_COUNTRY", "BR")}"
    ].join(", ")

    ok = system(
      keytool_bin,
      "-genkeypair",
      "-keystore", key_path,
      "-storepass", storepass,
      "-keypass", keypass,
      "-alias", signing_key.fetch("alias", "android").to_s,
      "-keyalg", "RSA",
      "-keysize", "2048",
      "-validity", "10000",
      "-dname", dname
    )
    raise "Falha ao criar keystore TWA em #{key_path}" unless ok

    key_path
  end

  def self.command_available?(command)
    system(command, "--version", out: File::NULL, err: File::NULL)
  rescue Errno::ENOENT
    false
  end

  def self.run_twa_command!(*command)
    ok = system(*command)
    raise "Falha ao executar #{command.join(' ')}" unless ok
  end

  def self.register_overlay_geometry_callback(browser, element_id)
    callback_name = "overlay_geom_#{element_id}_#{rand(1000..9999)}"

    $callbacks[callback_name] = proc do |payload|
      begin
        data = payload.is_a?(String) ? JSON.parse(payload) : payload
        update_overlay_geometry(data)
      rescue => e
        puts "[Overlay] geometry callback error: #{e.class} - #{e.message}"
      end
    end

    browserFunctionFac(browser, callback_name)
    callback_name
  end

  def self.register_embedded_browser_geometry_callback(browser, element_id)
    safe_id = element_id.to_s.gsub(/[^A-Za-z0-9_$]/, "_")
    callback_name = "embedded_geom_#{safe_id}_#{rand(1000..9999)}"

    $callbacks[callback_name] = proc do |payload|
      begin
        data = payload.is_a?(String) ? JSON.parse(payload) : payload
        update_embedded_browser_geometry(data)
      rescue => e
        puts "[EmbeddedBrowser] geometry callback error: #{e.class} - #{e.message}"
      end
    end

    browserFunctionFac(browser, callback_name)
    callback_name
  end

  def self.update_overlay_geometry(data)
    element_id = data["id"].to_s
    config = overlay_registry[element_id]
    return unless config

    config[:visual_bounds] = {
      x: data["x"].to_i,
      y: data["y"].to_i,
      width: data["width"].to_i,
      height: data["height"].to_i
    }

    if $overlay_state && $overlay_state[:element_id] == element_id && $overlay_state[:requested_visible]
      sync_overlay_page_bounds(config[:visual_bounds])
    end
  end

  def self.update_embedded_browser_geometry(data)
    element_id = data["id"].to_s
    config = embedded_browser_registry[element_id]
    return unless config

    config[:visual_bounds] = {
      x: data["x"].to_i,
      y: data["y"].to_i,
      width: data["width"].to_i,
      height: data["height"].to_i
    }

    sync_embedded_browser_surface(element_id)
  end

  def self.overlay_bridge_script
    <<~HTML
      <script>
        (() => {
          const previous = new Map();

          const collect = () => {
            document.querySelectorAll('[data-overlay-host="true"]').forEach((node) => {
              const callbackName = node.getAttribute('data-overlay-geometry-callback');
              if (!callbackName || typeof window[callbackName] !== 'function') return;

              const rect = node.getBoundingClientRect();
              const payload = {
                id: node.id,
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              };

              const key = JSON.stringify(payload);
              if (previous.get(node.id) === key) return;

              previous.set(node.id, key);
              window[callbackName](key);
            });
          };

          window.addEventListener('load', collect);
          window.addEventListener('resize', collect);
          window.addEventListener('scroll', collect, true);

          if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => collect());
            window.addEventListener('load', () => {
              document.querySelectorAll('[data-overlay-host="true"]').forEach((node) => observer.observe(node));
            });
          }

          setInterval(collect, 250);
        })();
      </script>
    HTML
  end

  def self.embedded_browser_bridge_script
    <<~HTML
      <script>
        (() => {
          const previous = new Map();

          const collect = () => {
            document.querySelectorAll('[data-embedded-browser-host="true"]').forEach((node) => {
              const callbackName = node.getAttribute('data-embedded-browser-geometry-callback');
              if (!callbackName || typeof window[callbackName] !== 'function') return;

              const rect = node.getBoundingClientRect();
              const payload = {
                id: node.id,
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              };

              const key = JSON.stringify(payload);
              if (previous.get(node.id) === key) return;

              previous.set(node.id, key);
              window[callbackName](key);
            });
          };

          window.addEventListener('load', collect);
          window.addEventListener('resize', collect);
          window.addEventListener('scroll', collect, true);

          if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => collect());
            window.addEventListener('load', () => {
              document.querySelectorAll('[data-embedded-browser-host="true"]').forEach((node) => observer.observe(node));
            });
          }

          setInterval(collect, 250);
        })();
      </script>
    HTML
  end

  def self.tailwind_script_tag
    return "" if ENV.fetch("GLAUCO_TAILWIND", "1").to_s == "0"

    <<~HTML
      <script>
        window.tailwind = window.tailwind || {};
        window.tailwind.config = {
          corePlugins: {
            preflight: false
          },
          theme: {
            extend: {}
          }
        };
      </script>
      <script src="https://cdn.tailwindcss.com"></script>
    HTML
  end

  require 'java' if Frontend.swt?
  require 'set'
  require 'webrick'

  root = PUBLIC_DIR
  node_modules = NODE_MODULES_DIR
  @server_port = DEFAULT_PORT

  WEBrick::HTTPUtils::DefaultMimeTypes['js'] = 'application/javascript'

  def self.port_available?(port)
    TCPServer.new('127.0.0.1', port).close
    true
  rescue Errno::EADDRINUSE, Errno::EACCES
    false
  end

  def self.resolve_server_port(preferred_port = DEFAULT_PORT)
    port = preferred_port.to_i
    50.times do
      return port if port_available?(port)
      port += 1
    end

    raise "Nenhuma porta disponivel encontrada a partir de #{preferred_port}"
  end

  @server_port = resolve_server_port(@server_port)

  server = WEBrick::HTTPServer.new(
    Port: @server_port,
    DocumentRoot: root,
    AccessLog: [],
    Logger: WEBrick::Log.new(nil, 0)
  )

  @server = server
  @root_html = +""

  def self.server_port
    @server_port
  end

  def self.server
    @server
  end

  def self.base_url
    "http://localhost:#{@server_port}"
  end

  def self.root_url
    "#{base_url}/__glauco/root"
  end

  def self.root_html=(html)
    @root_html = html.to_s
  end

  def self.root_html
    @root_html.to_s
  end

  def self.wait_for_server!(timeout: 5)
    deadline = Time.now + timeout
    loop do
      begin
        Net::HTTP.start("127.0.0.1", @server_port, open_timeout: 0.2, read_timeout: 0.2) do |http|
          http.get("/__glauco/ping")
        end
        return true
      rescue StandardError
        raise "Servidor frontend nao iniciou em #{base_url}" if Time.now >= deadline
        sleep 0.05
      end
    end
  end

  server.mount('/node_modules', WEBrick::HTTPServlet::FileHandler, node_modules) if File.directory?(node_modules)

  server.mount_proc '/__glauco/ping' do |_req, res|
    res['Content-Type'] = 'text/plain'
    res.body = 'ok'
  end

  server.mount_proc '/favicon.ico' do |_req, res|
    icon_path = File.join(PUBLIC_DIR, "icon-192.png")
    if File.exist?(icon_path)
      res['Content-Type'] = 'image/png'
      res.body = File.binread(icon_path)
    else
      res.status = 204
      res.body = ""
    end
  end

  server.mount_proc '/__glauco/callback' do |req, res|
    res['Content-Type'] = 'application/json'
    begin
      payload = JSON.parse(req.body.to_s)
      callback_name = payload["callback"].to_s
      value = payload["value"]
      callback = $callbacks[callback_name]
      raise "Callback nao encontrado: #{callback_name}" unless callback

      Frontend.on_ui_thread { callback.call(value) }
      res.body = JSON.generate(ok: true, reload: true)
    rescue => e
      res.status = 500
      res.body = JSON.generate(ok: false, error: "#{e.class}: #{e.message}")
    end
  end

  mount_model_routes(server)

  server.mount_proc '/__glauco/root' do |_req, res|
    res['Content-Type'] = 'text/html; charset=UTF-8'
    res.body = Frontend.root_html
  end

  server.mount_proc '/__glauco/pages' do |req, res|
    id = req.path.sub(%r{\A/__glauco/pages/?}, "")
    id = URI.decode_www_form_component(id.to_s)
    page = Frontend.served_page_registry[id]

    if page
      res['Content-Type'] = 'text/html; charset=UTF-8'
      component = page[:component]
      res.body = component && component.respond_to?(:render_served_page_document) ? Frontend.on_ui_thread { component.render_served_page_document } : page[:html].to_s
    else
      res.status = 404
      res.body = "Served page not found: #{id}"
    end
  end

  require 'uri'
  require 'zlib'

  server.mount_proc '/files' do |req, res|
    raw_path = req.path.sub('/files/', '')

    # ðŸ”¥ decode URL (%20, %C3%8D, etc)
    decoded = URI.decode_www_form_component(raw_path)

    # ðŸ”¥ normalizar path windows
    full_path = decoded

    puts "[FILES] raw=#{raw_path}"
    puts "[FILES] decoded=#{decoded}"
    puts "[FILES] full_path=#{full_path}"

    if File.exist?(full_path)
      res.body = File.binread(full_path)
      res['Content-Type'] =
        WEBrick::HTTPUtils.mime_type(full_path, WEBrick::HTTPUtils::DefaultMimeTypes)
    else
      puts "[FILES] NOT FOUND"
      res.status = 404
      res.body = "Not found"
    end
  end

  def self.ensure_overlay_shell!
    return $overlay_shell if defined?($overlay_shell) && $overlay_shell && !$overlay_shell.isDisposed

    overlay_style = SWT::NO_TRIM | SWT::ON_TOP | SWT::TOOL
    $overlay_shell = Shell.new($shell, overlay_style)
    $overlay_shell.setLayout(FillLayout.new)
    $overlay_browser = Browser.new($overlay_shell, 0)
    $overlay_shell.setVisible(false)

    begin
      $overlay_shell.setAlpha(255)
    rescue StandardError
      # Alpha depende do window manager.
    end

    install_overlay_tracking!
    $overlay_shell
  end

  def self.install_overlay_tracking!
    return if defined?($overlay_tracking_installed) && $overlay_tracking_installed

    listener = Listener.impl { |_event| sync_overlay_page_bounds if overlay_open? rescue nil }
    deactivate_listener = Listener.impl { |_event| hide_overlay_for_parent_state! rescue nil }
    activate_listener = Listener.impl { |_event| restore_overlay_for_parent_state! rescue nil }
    close_listener = Listener.impl { |_event| dispose_overlay_page rescue nil }

    $shell.addListener(SWT::Move, listener)
    $shell.addListener(SWT::Resize, listener)
    $shell.addListener(SWT::Deactivate, deactivate_listener)
    $shell.addListener(SWT::Iconify, deactivate_listener)
    $shell.addListener(SWT::Activate, activate_listener)
    $shell.addListener(SWT::Deiconify, activate_listener)
    $shell.addListener(SWT::Close, close_listener)

    $overlay_tracking_installed = true
  end

  def self.overlay_open?
    !!(defined?($overlay_shell) && $overlay_shell && !$overlay_shell.isDisposed && $overlay_shell.getVisible)
  end

  def self.show_overlay_page(url: nil, html: nil, bounds: nil, alpha: 255, focus: false)
    ensure_overlay_shell!

    puts "[Overlay] show_overlay_page url=#{url.inspect} html?=#{!html.nil?} bounds=#{bounds.inspect} alpha=#{alpha}"

    begin
      $overlay_shell.setAlpha(alpha)
    rescue StandardError
      # Alpha depende do window manager.
    end

    $overlay_state = {
      url: url,
      html: html,
      alpha: alpha,
      bounds: bounds,
      requested_visible: true
    }

    sync_overlay_page_bounds(bounds)
    $overlay_browser.setText(html) if html
    $overlay_browser.setUrl(url) if url && html.nil?
    $overlay_shell.setVisible(true)
    $overlay_shell.open
    $overlay_shell.setActive if focus
    true
  end

  def self.hide_overlay_page
    return unless defined?($overlay_shell) && $overlay_shell && !$overlay_shell.isDisposed

    $overlay_shell.setVisible(false)
    $overlay_state[:requested_visible] = false if $overlay_state
    true
  end

  def self.close_overlay_page
    hide_overlay_page
  end

  def self.dispose_overlay_page
    return unless defined?($overlay_shell) && $overlay_shell && !$overlay_shell.isDisposed

    $overlay_browser.dispose if defined?($overlay_browser) && $overlay_browser && !$overlay_browser.isDisposed
    $overlay_shell.dispose
    $overlay_browser = nil
    $overlay_shell = nil
    $overlay_state = nil
    true
  end

  def self.sync_overlay_page_bounds(bounds = nil)
    return unless defined?($browser) && $browser && !$browser.isDisposed
    return unless defined?($overlay_shell) && $overlay_shell && !$overlay_shell.isDisposed

    browser_bounds = $browser.getBounds
    resolved = resolve_overlay_bounds(browser_bounds, bounds || ($overlay_state && $overlay_state[:bounds]))
    origin = $browser.toDisplay(resolved[:x], resolved[:y])
    $overlay_shell.setBounds(origin.x, origin.y, resolved[:width], resolved[:height])
    resolved
  end

  def self.resolve_overlay_bounds(browser_bounds, requested_bounds)
    bounds = requested_bounds || {}

    x = bounds.key?(:x) ? bounds[:x].to_i : (browser_bounds.width * bounds.fetch(:x_ratio, 0.0)).to_i
    y = bounds.key?(:y) ? bounds[:y].to_i : (browser_bounds.height * bounds.fetch(:y_ratio, 0.15)).to_i
    width = bounds.key?(:width) ? bounds[:width].to_i : (browser_bounds.width * bounds.fetch(:width_ratio, 1.0)).to_i
    height = bounds.key?(:height) ? bounds[:height].to_i : (browser_bounds.height * bounds.fetch(:height_ratio, 0.70)).to_i

    {
      x: x,
      y: y,
      width: [width, 1].max,
      height: [height, 1].max
    }
  end

  def self.hide_overlay_for_parent_state!
    return unless defined?($overlay_shell) && $overlay_shell && !$overlay_shell.isDisposed
    return unless $overlay_state && $overlay_state[:requested_visible]

    $overlay_shell.setVisible(false)
  end

  def self.restore_overlay_for_parent_state!
    return unless defined?($overlay_shell) && $overlay_shell && !$overlay_shell.isDisposed
    return unless $overlay_state && $overlay_state[:requested_visible]

    sync_overlay_page_bounds
    $overlay_shell.setVisible(true)
  end

  def self.open_overlay_page_for_element(element_id)
    config = overlay_registry[element_id.to_s]
    raise "overlay element not found: #{element_id}" unless config

    bounds = (config[:visual_bounds] || config[:bounds] || {}).dup

    show_overlay_page(
      url: config[:url],
      html: config[:html],
      alpha: (config[:alpha] || 255).to_i,
      bounds: bounds
    )

    $overlay_state[:element_id] = element_id.to_s if $overlay_state

    true
  end

  def self.ensure_embedded_browser_surface!(element_id)
    config = embedded_browser_registry[element_id.to_s]
    raise "embedded browser element not found: #{element_id}" unless config
    raise "surface parent composite nÃ£o inicializado" unless defined?($surface_parent) && $surface_parent && !$surface_parent.isDisposed

    $embedded_surfaces ||= {}
    surface = $embedded_surfaces[element_id.to_s]
    return surface if surface && !surface.isDisposed

    surface = Browser.new($surface_parent, 0)
    surface.setVisible(false)
    surface.moveAbove(nil)
    $embedded_surfaces[element_id.to_s] = surface
    surface
  end

  def self.show_embedded_browser(element_id)
    config = embedded_browser_registry[element_id.to_s]
    return unless config

    surface = ensure_embedded_browser_surface!(element_id)
    bounds = config[:visual_bounds] || config[:bounds] || {}
    sync_embedded_browser_surface(element_id, bounds)

    if config[:html]
      surface.setText(config[:html])
    elsif config[:url]
      surface.setUrl(config[:url])
    end

    surface.setVisible(config.fetch(:visible, true))
    surface.moveAbove(nil)
    true
  end

  def self.hide_embedded_browser(element_id)
    return unless defined?($embedded_surfaces) && $embedded_surfaces

    surface = $embedded_surfaces[element_id.to_s]
    return unless surface && !surface.isDisposed

    surface.setVisible(false)
    true
  end

  def self.dispose_embedded_browser(element_id)
    return unless defined?($embedded_surfaces) && $embedded_surfaces

    surface = $embedded_surfaces.delete(element_id.to_s)
    return unless surface && !surface.isDisposed

    surface.dispose
    true
  end

  def self.sync_embedded_browser_surface(element_id, fallback_bounds = nil)
    config = embedded_browser_registry[element_id.to_s]
    return unless config

    if config.fetch(:visible, true)
      surface = ensure_embedded_browser_surface!(element_id)
      host_bounds = config[:visual_bounds] || fallback_bounds || config[:bounds]
      return unless host_bounds

      resolved = resolve_embedded_browser_bounds(host_bounds)
      surface.setBounds(resolved[:x], resolved[:y], resolved[:width], resolved[:height])
      surface.setVisible(true)
      surface.moveAbove(nil)
    else
      hide_embedded_browser(element_id)
    end

    true
  end

  def self.sync_embedded_browser_surface(
      element_id,
      fallback_bounds = nil
    )
    id = element_id.to_s
    config = embedded_browser_registry[id]

    return false unless config

    unless config.fetch(:visible, true)
      hide_embedded_browser(id)
      return true
    end

    host_bounds =
      config[:visual_bounds] ||
      fallback_bounds ||
      config[:bounds]

    return false unless host_bounds

    surface = ensure_embedded_browser_surface!(id)
    resolved = resolve_embedded_browser_bounds(
      host_bounds
    )

    surface.setBounds(
      resolved[:x],
      resolved[:y],
      resolved[:width],
      resolved[:height]
    )

    sync_embedded_browser_source!(
      id,
      surface
    )

    surface.setVisible(true)
    surface.moveAbove(nil)

    true
  end

  def self.resolve_embedded_browser_bounds(bounds)
    {
      x: bounds[:x].to_i,
      y: bounds[:y].to_i,
      width: [bounds[:width].to_i, 1].max,
      height: [bounds[:height].to_i, 1].max
    }
  end

  def self.sync_frontend_layout!
    return unless defined?($surface_parent)
    return unless $surface_parent
    return if $surface_parent.isDisposed

    return unless defined?($browser)
    return unless $browser
    return if $browser.isDisposed

    area = $surface_parent.getClientArea

    $browser.setBounds(
      0,
      0,
      area.width,
      area.height
    )

    embedded_browser_registry.keys.each do |element_id|
      sync_embedded_browser_surface(element_id)
    end

    true
  end

  # ===========================================================
  # ðŸ”¥ Carbon Registry
  # ===========================================================
  module CarbonRegistry
    require 'json'
    require 'set'

    DEBUG = ENV.fetch("GLAUCO_CARBON_DEBUG", ENV.fetch("GLAUCO_DEBUG", "0")) == "1"

    def self.log(msg)
      puts "[CarbonRegistry] #{msg}" if DEBUG
    end

    @css_src = "/carbon-styles.min.css"
    @js_src  = "/carbon.js"

    HTML_TAGS = Set.new(%w[
      html head body title meta link style script
      div span p a strong button
      input textarea
      form label fieldset legend
      ul ol li
      main section article aside footer
      table thead tbody tr th td
      h1 h2 h3 h4 h5 h6
      br hr
      svg path
      overlay-page
      embedded-browser
    ])

    @available_tags = Set.new
    @map = {}

    class << self
      attr_accessor :css_src, :js_src
      attr_reader :available_tags, :map
    end

    def self.asset_url(path)
      return path unless path.to_s.start_with?("/")

      "#{Frontend.base_url}#{path}"
    end

    # ===========================================================
    # ðŸ”¥ LOAD COM DEBUG TOTAL
    # ===========================================================
    def self.load!
      json_path = File.join(NODE_MODULES_DIR, "@carbon", "web-components", "custom-elements.json")

      log "loading from: #{json_path}"

      unless File.exist?(json_path)
        log "âŒ custom-elements.json NOT FOUND"
        return
      end

      data = JSON.parse(File.read(json_path))

      log "json keys: #{data.keys}"

      @available_tags = Set.new
      @map = {}

      tags =
        if data["modules"]
          log "using modules[] format"
          data["modules"].flat_map { |m| m["declarations"] || [] }
            .map { |d| d["tagName"] || d["tag"] }
        elsif data["declarations"]
          log "using declarations[] root format"
          data["declarations"].map { |d| d["tagName"] || d["tag"] }
        elsif data["tags"]
          log "using tags[] format"
          data["tags"].map { |t| t["name"] }
        else
          log "âŒ unknown format"
          []
        end

      log "total raw tags: #{tags.size}"

      tags.each do |tag|
        next unless tag
        next unless tag.start_with?("cds-")

        @available_tags << tag

        base = tag.sub(/^cds-/, '').tr('-', '_')
        @map[base] = tag

        log "mapped: #{base} â†’ #{tag}"
      end

      log "âœ” total mapped: #{@map.size}"

      if @map.empty?
        log "âŒ MAP EMPTY â€” parsing falhou"
      end
    end

    # ===========================================================
    # ðŸ”¥ RESOLVE COM DEBUG
    # ===========================================================
    def self.resolve(ruby_name)
      name = ruby_name.to_s

      log "resolve called: #{name}"

      # HTML
      if HTML_TAGS.include?(name)
        log "â†’ html tag passthrough"
        return name
      end

      # cds_
      if name.start_with?("cds_")
        tag = name.tr('_', '-')
        if @available_tags.include?(tag)
          log "â†’ cds direct hit: #{tag}"
          return tag
        else
          log "âš  cds_ not found in available_tags: #{tag}"
          return name
        end
      end

      # DSL
      if @map[name]
        log "â†’ mapped: #{@map[name]}"
        return @map[name]
      end

      log "âš  MISS: #{name}"
      name
    end

    # ===========================================================
    # HTML
    # ===========================================================
    def self.script_tag
      log "injecting script: #{@js_src}"
      %(<script type="module" src="#{asset_url(@js_src)}"></script>)
    end

    def self.style_tag
      log "injecting css: #{@css_src}"
      %(<link rel="stylesheet" href="#{asset_url(@css_src)}">)
    end

    def self.defined_style_tag
      <<~HTML
        <style>
          cds-*:not(:defined) {
            visibility: hidden;
          }
        </style>
      HTML
    end
  end

  CarbonRegistry.load!



  # ===========================================================
  # ðŸ”¥ Browser callbacks
  # ===========================================================
  $callbacks = {}

  def self.browserFunctionFac(browser, callback_name)
    Class.new(Java::OrgEclipseSwtBrowser::BrowserFunction) do
      define_method(:function) do |*args|
        begin
          arg = args.first
          arg = arg[0] if arg.is_a?(Java::JavaLang::Object[]) && arg.size == 1
          if defined?($display) && $display && !$display.isDisposed
            $display.async_exec do
              begin
                $callbacks[callback_name].call(arg)
              rescue => e
                puts "Error in async callback #{callback_name}: #{e.class} - #{e.message}"
              end
            end
          else
            $callbacks[callback_name].call(arg)
          end
        rescue => e
          puts "Error in callback #{callback_name}: #{e.class} - #{e.message}"
        end
      end
    end.new(browser, callback_name)
  end

  def self.callback_bridge_script
    <<~HTML
      <script>
        window.__glaucoInvoke = async function(callbackName, value, event) {
          if (event) {
            event.preventDefault();
            event.stopPropagation();
          }

          if (typeof window[callbackName] === "function") {
            window[callbackName](value);
            return false;
          }

          const response = await fetch("/__glauco/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback: callbackName, value })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.ok === false) {
            throw new Error(result.error || "Falha ao chamar callback Glauco");
          }
          if (result.reload) window.location.reload();
          return false;
        };
      </script>
    HTML
  end

  def self.orm_bridge_script
    <<~HTML
      <script>
        (function installGlaucoOrmBridge(){
          if (window.Glauco && window.Glauco.models) return;

          const request = async (model, action, payload = {}) => {
            const response = await fetch("/__glauco/models", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(Object.assign({}, payload, { model, action }))
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data.ok === false) {
              throw new Error(data.error || "Falha no ORM Glauco");
            }
            return data.result;
          };

          const model = (name) => ({
            all: (query = {}) => request(name, "index", query),
            find: (id) => request(name, "find", { id }),
            count: (query = {}) => request(name, "count", query),
            create: (attributes) => request(name, "create", { attributes }),
            update: (id, attributes) => request(name, "update", { id, attributes }),
            destroy: (id) => request(name, "destroy", { id })
          });

          window.Glauco = window.Glauco || {};
          window.Glauco.model = model;
          window.Glauco.models = new Proxy({}, {
            get(target, prop) {
              if (typeof prop !== "string") return target[prop];
              return target[prop] || (target[prop] = model(prop));
            }
          });
        })();
      </script>
    HTML
  end

  def self.transparent_window_style
    return "" unless Frontend.swt? && defined?(GlaucoSWTChrome) && GlaucoSWTChrome.transparent?

    <<~HTML
      <style>
        :root {
          --glauco-transparent-key: #{GlaucoSWTChrome.transparent_key_hex};
        }

        html,
        body {
          background: transparent !important;
        }

        body.cds-theme-zone-g100 {
          background: transparent !important;
        }

        .glauco-transparent-window-bg {
          background: transparent !important;
        }

        body {
          cursor: grab;
        }

        html.glauco-window-dragging,
        html.glauco-window-dragging body {
          cursor: grabbing !important;
        }
      </style>
    HTML
  end

  def self.window_page_drag_script
    return "" unless Frontend.swt? && defined?(GlaucoSWTChrome) && GlaucoSWTChrome.page_drag?

    <<~HTML
      <script>
        (function installGlaucoWindowPageDrag(){
          if (window.__glaucoWindowPageDragInstalled) return;
          window.__glaucoWindowPageDragInstalled = true;

          const blockedSelector = [
            "input",
            "textarea",
            "select",
            "option",
            "button",
            "a",
            "summary",
            "[contenteditable='true']",
            "[data-glauco-no-window-drag='true']",
            "[data-glauco-allow-selection='true']",
            "[data-glauco-native-gesture='true']",
            ".map-viewport"
          ].join(",");

          function canDragFrom(target) {
            if (!target || !target.closest) return true;
            return !target.closest(blockedSelector);
          }

          let dragging = false;
          let armed = false;
          let lastX = 0;
          let lastY = 0;
          let originX = 0;
          let originY = 0;
          let pointerId = null;
          let pendingDx = 0;
          let pendingDy = 0;
          let flushScheduled = false;

          function flushMove() {
            flushScheduled = false;
            const dx = pendingDx;
            const dy = pendingDy;
            pendingDx = 0;
            pendingDy = 0;
            if ((dx || dy) && typeof window.__glaucoWindowDragMove === "function") {
              window.__glaucoWindowDragMove(JSON.stringify({ dx, dy }));
            }
          }

          function queueMove(dx, dy) {
            pendingDx += dx;
            pendingDy += dy;
            if (flushScheduled) return;
            flushScheduled = true;
            requestAnimationFrame(flushMove);
          }

          function beginDrag(event) {
            if (event.button !== 0 || !canDragFrom(event.target)) return;
            armed = true;
            dragging = false;
            pointerId = event.pointerId;
            originX = event.screenX;
            originY = event.screenY;
            lastX = event.screenX;
            lastY = event.screenY;
            try { event.target.setPointerCapture && event.target.setPointerCapture(event.pointerId); } catch (_) {}
          }

          function moveDrag(event) {
            if (!armed && !dragging) return;
            if (pointerId != null && event.pointerId != null && event.pointerId !== pointerId) return;
            if (!dragging) {
              const distance = Math.hypot(event.screenX - originX, event.screenY - originY);
              if (distance < 4) return;
              dragging = true;
              document.documentElement.classList.add("glauco-window-dragging");
            }
            const dx = Math.round(event.screenX - lastX);
            const dy = Math.round(event.screenY - lastY);
            if (dx || dy) {
              lastX = event.screenX;
              lastY = event.screenY;
              queueMove(dx, dy);
            }
            event.preventDefault();
          }

          function endDrag(event) {
            if (!armed && !dragging) return;
            const wasDragging = dragging;
            armed = false;
            dragging = false;
            pointerId = null;
            if (flushScheduled) flushMove();
            document.documentElement.classList.remove("glauco-window-dragging");
            if (wasDragging) event && event.preventDefault && event.preventDefault();
          }

          document.addEventListener("pointerdown", beginDrag, true);
          document.addEventListener("pointermove", moveDrag, true);
          document.addEventListener("pointerup", endDrag, true);
          document.addEventListener("pointercancel", endDrag, true);
          document.addEventListener("mousedown", beginDrag, true);
          document.addEventListener("mousemove", moveDrag, true);
          document.addEventListener("mouseup", endDrag, true);
          window.addEventListener("blur", endDrag, true);
        })();
      </script>
    HTML
  end

  def self.native_map_gesture_script
    <<~HTML
      <script>
        (function installGlaucoNativeMapGestures(){
          if (window.__glaucoNativeMapGesturesInstalled) return;
          window.__glaucoNativeMapGesturesInstalled = true;
          const MIN_SCALE = 0.06;
          const MAX_SCALE = 1;
          const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

          function setup(viewport) {
            if (!viewport || viewport.dataset.nativeMapReady === "1") return;
            const content = viewport.querySelector(".map-content");
            if (!content) return;
            viewport.dataset.nativeMapReady = "1";
            const state = {
              x: Number(content.dataset.x || 0),
              y: Number(content.dataset.y || 0),
              scale: Number(content.dataset.scale || 1),
              pointers: new Map(),
              drag: null,
              pinch: null,
              moved: false,
              lastTap: null,
              suppressClickUntil: 0
            };

            function apply() {
              content.style.transform = "translate3d(" + state.x + "px," + state.y + "px,0) scale(" + state.scale + ")";
            }

            function invokeMapReset(event) {
              const callbackName = viewport.dataset.mapResetCallback;
              if (!callbackName || typeof window.__glaucoInvoke !== "function") return;
              window.__glaucoInvoke(callbackName, viewport.dataset.mapContext || "", event);
            }

            function zoomAt(nextScale, clientX, clientY) {
              const rect = viewport.getBoundingClientRect();
              const pointX = clientX - rect.left;
              const pointY = clientY - rect.top;
              const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
              const worldX = (pointX - state.x) / state.scale;
              const worldY = (pointY - state.y) / state.scale;
              state.x = pointX - worldX * scale;
              state.y = pointY - worldY * scale;
              state.scale = scale;
              apply();
            }

            function focusRect(target) {
              if (!target || !target.matches || !target.matches("rect[data-lot-id]")) return;
              const svg = content.querySelector(".base-map");
              if (!svg || !target.getBBox || !target.getCTM) return;
              const box = target.getBBox();
              const matrix = target.getCTM();
              if (!matrix) return;
              const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x + box.width, box.y + box.height], [box.x, box.y + box.height]].map(([x, y]) => {
                const point = svg.createSVGPoint();
                point.x = x;
                point.y = y;
                return point.matrixTransform(matrix);
              });
              const xs = corners.map((point) => point.x);
              const ys = corners.map((point) => point.y);
              const minX = Math.min.apply(null, xs);
              const maxX = Math.max.apply(null, xs);
              const minY = Math.min.apply(null, ys);
              const maxY = Math.max.apply(null, ys);
              const width = Math.max(maxX - minX, 1);
              const height = Math.max(maxY - minY, 1);
              const bounds = viewport.getBoundingClientRect();
              const nextScale = clamp(Math.min(bounds.width / width, bounds.height / height) * 0.42, MIN_SCALE, MAX_SCALE);
              state.scale = nextScale;
              state.x = (bounds.width / 2) - ((minX + width / 2) * nextScale);
              state.y = (bounds.height / 2) - ((minY + height / 2) * nextScale);
              apply();
            }

            viewport.addEventListener("pointerdown", (event) => {
              viewport.setPointerCapture(event.pointerId);
              state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
              state.moved = false;
              viewport.classList.add("is-dragging");
              if (state.pointers.size === 1) state.drag = { x: event.clientX, y: event.clientY, transformX: state.x, transformY: state.y, target: event.target };
              if (state.pointers.size === 2) {
                const points = Array.from(state.pointers.values());
                state.pinch = { distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y), scale: state.scale };
              }
            });

            viewport.addEventListener("pointermove", (event) => {
              if (!state.pointers.has(event.pointerId)) return;
              state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
              if (state.pointers.size === 2 && state.pinch) {
                const points = Array.from(state.pointers.values());
                const centerX = (points[0].x + points[1].x) / 2;
                const centerY = (points[0].y + points[1].y) / 2;
                state.moved = true;
                zoomAt(state.pinch.scale * (Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / state.pinch.distance), centerX, centerY);
                return;
              }
              if (!state.drag || state.pointers.size !== 1) return;
              const dx = event.clientX - state.drag.x;
              const dy = event.clientY - state.drag.y;
              if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.moved = true;
              state.x = state.drag.transformX + dx;
              state.y = state.drag.transformY + dy;
              apply();
            });

            function finishPointer(event) {
              const target = state.drag ? state.drag.target : event.target;
              state.pointers.delete(event.pointerId);
              if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
              viewport.classList.remove("is-dragging");
              if (!state.moved) {
                const now = Date.now();
                const previousTap = state.lastTap;
                const isDoubleTap = previousTap && now - previousTap.time < 320 && Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y) < 28;
                state.lastTap = { time: now, x: event.clientX, y: event.clientY };
                if (isDoubleTap) {
                  event.preventDefault();
                  state.lastTap = null;
                  state.suppressClickUntil = Date.now() + 450;
                  invokeMapReset(event);
                } else {
                  focusRect(target);
                }
              }
              state.drag = null;
              state.pinch = null;
            }

            viewport.addEventListener("pointerup", finishPointer);
            viewport.addEventListener("pointercancel", (event) => {
              state.pointers.delete(event.pointerId);
              state.drag = null;
              state.pinch = null;
              viewport.classList.remove("is-dragging");
            });
            viewport.addEventListener("wheel", (event) => {
              event.preventDefault();
              zoomAt(state.scale * (event.deltaY < 0 ? 1.12 : 0.88), event.clientX, event.clientY);
            }, { passive: false });
            viewport.addEventListener("click", (event) => {
              if (Date.now() > state.suppressClickUntil && event.detail < 2) return;
              event.preventDefault();
              event.stopImmediatePropagation();
            }, true);
            viewport.addEventListener("dblclick", (event) => {
              event.preventDefault();
              state.suppressClickUntil = Date.now() + 450;
              invokeMapReset(event);
            });
          }

          function setupAll(){ document.querySelectorAll("[data-glauco-native-gesture='true']").forEach(setup); }
          document.addEventListener("DOMContentLoaded", setupAll);
          window.addEventListener("load", setupAll);
          new MutationObserver(setupAll).observe(document.documentElement, { childList: true, subtree: true });
        })();
      </script>
    HTML
  end


  def self.native_shell_behavior_style
    <<~HTML
      <style>
        html, body, body * {
          -webkit-user-select: none;
          user-select: none;
          -webkit-user-drag: none;
        }
        body, body * { cursor: default; }
        input, textarea, select, option, [contenteditable="true"], [data-glauco-allow-selection="true"] {
          -webkit-user-select: text;
          user-select: text;
          cursor: text;
        }
        button, a, summary, label, [role="button"], [onclick], cds-button, [data-glauco-clickable="true"] {
          cursor: pointer;
        }
        img, svg { -webkit-user-drag: none; }
        .map-viewport, .map-viewport *, [data-glauco-native-gesture="true"], [data-glauco-native-gesture="true"] * {
          -webkit-user-select: none;
          user-select: none;
        }
        .map-viewport, [data-glauco-native-gesture="true"] { cursor: grab; }
        .map-viewport.is-dragging, [data-glauco-native-gesture="true"].is-dragging { cursor: grabbing; }
      </style>
    HTML
  end

  def self.native_shell_behavior_script
    <<~HTML
      <script>
        (function installGlaucoNativeShellBehavior(){
          if (window.__glaucoNativeShellBehaviorInstalled) return;
          window.__glaucoNativeShellBehaviorInstalled = true;

          function allowed(target) {
            return !!(target && target.closest && target.closest(
              "input,textarea,select,option,[contenteditable='true']," +
              "[data-glauco-allow-selection='true']," +
              ".map-viewport,.map-viewport *," +
              "[data-glauco-native-gesture='true'],[data-glauco-native-gesture='true'] *"
            ));
          }

          function disableDragAttrs(root) {
            (root || document).querySelectorAll("img,a,svg,[draggable='true']").forEach(function(node) {
              if (!allowed(node)) node.setAttribute("draggable", "false");
            });
          }

          document.addEventListener("dragstart", function(event) {
            if (!allowed(event.target)) event.preventDefault();
          }, true);

          document.addEventListener("selectstart", function(event) {
            if (!allowed(event.target)) event.preventDefault();
          }, true);

          document.addEventListener("mousedown", function(event) {
            if (event.detail > 1 && !allowed(event.target)) event.preventDefault();
          }, true);

          document.addEventListener("DOMContentLoaded", function() { disableDragAttrs(document); });
          new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
              mutation.addedNodes && mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) disableDragAttrs(node);
              });
            });
          }).observe(document.documentElement, { childList: true, subtree: true });
        })();
      </script>
    HTML
  end

  # ===========================================================
  # ðŸ”¥ Root Renderer
  # ===========================================================
  class RootRenderer
    attr_accessor :browser, :root_component

    def initialize(browser)
      @browser = browser
    end

    def bind_callback(event, proc_obj)
      callback_name = register_callback(proc_obj)

      attr = event.to_s.gsub('_', '')

      if attr == "onclick"
        %(onclick="return __glaucoInvoke('#{callback_name}', this.value, event);")
      else
        %(#{attr}="return __glaucoInvoke('#{callback_name}', this.value, event);")
      end
    end

    def register_callback(proc_obj)
      callback_name = "callback_#{rand(1000..9999)}"
      $callbacks[callback_name] = proc_obj
      Frontend.browserFunctionFac(@browser, callback_name)
      callback_name
    end

    def render
      puts "[RootRenderer.render] full render" if DEBUG
      return unless @root_component

      body_html = @root_component.render_to_html

      html = <<~HTML
        <!DOCTYPE html>
        <html theme="g100">
          <head>
            <meta charset="UTF-8">
            <base href="#{Frontend.base_url}/">
            #{CarbonRegistry.style_tag}
            #{CarbonRegistry.script_tag}
            #{CarbonRegistry.defined_style_tag}
            #{Frontend.native_shell_behavior_style}
            #{Frontend.transparent_window_style}
            #{Frontend.callback_bridge_script}
            #{Frontend.orm_bridge_script}
            #{Frontend.native_shell_behavior_script}
            #{Frontend.window_page_drag_script}
            #{Frontend.overlay_bridge_script}
            #{Frontend.embedded_browser_bridge_script}
            #{Frontend.tailwind_script_tag}
            <style>
              html, body {
                margin: 0;
                padding: 0;
                height: 100%;
              }
            </style>
          </head>
          <body class="cds-theme-zone-g100">
            #{body_html}
          </body>
        </html>
      HTML

      Frontend.root_html = html
      Frontend.wait_for_server!
      @browser.setUrl(Frontend.root_url)
      if Frontend.swt? && defined?(GlaucoSWTChrome) && GlaucoSWTChrome.transparent? && defined?($display) && $display && !$display.isDisposed
        $display.async_exec { GlaucoSWTChrome.apply_webview2_transparent_background(@browser) rescue nil }
      end
    end
  end

  # ===========================================================
  # ðŸ”¥ Component DSL
  # ===========================================================
  class Component
    attr_accessor :children, :parent_renderer, :attrs
    attr_writer :state

    def initialize(parent_renderer: nil, **attrs)
      puts "initilizing component" if DEBUG
      @state = self.class.default_state_snapshot
      @bindings = {}
      @bindings_by_path = Hash.new { |hash, key| hash[key] = [] }
      @binding_sequence = 0
      @effects = []
      @effect_sequence = 0
      @pending_effect_ids = Set.new
      @active_effect_ids = Set.new
      @effect_batch_depth = 0
      @is_flushing_effects = false
      @children = []
      @parent_renderer = parent_renderer
      @event_listeners = {}
      @attrs = self.class.default_attrs.merge(attrs)
      @render_block = self.class.default_render_block
    end

    undef select
    undef p

    class << self
      # -------------------------------------------------------
      # Cognition DSL (Metis memory + OpenJEV machine)
      # -------------------------------------------------------
      def memory(phrase, &block)
        definition = Glauco::Memory::ConditionDefinition.new(phrase)
        definition.instance_eval(&block) if block
        Glauco::Cognition.register_memory(self, definition)
      end

      def machine(name, &block)
        Glauco::Cognition.register_machine(self, name, &block)
      end

      def machine_state(name)
        runtime = Glauco::Cognition.machine(self, name)
        runtime && runtime.state
      end

      def remember(text, **metadata)
        Glauco::Cognition.memory_runtime(self).remember(text, **metadata)
      end

      def memory_refresh!
        Glauco::Cognition.memory_runtime(self).refresh!
      end

      def memory_reset!(clear_persisted: false)
        Glauco::Cognition.memory_runtime(self).reset!(clear_persisted: clear_persisted)
      end

      def attrs(defaults = {})
        @default_attrs = defaults
        self
      end

      def default_attrs
        @default_attrs || {}
      end

      def ui(&block)
        raise ArgumentError, "ui precisa receber bloco de renderizacao" unless block

        @default_render_block = block
        self
      end

      def default_render_block
        if instance_variable_defined?(:@default_render_block)
          @default_render_block
        elsif superclass.respond_to?(:default_render_block)
          superclass.default_render_block
        end
      end

      def state(defaults = :__glauco_state_not_set, &block)
        if block
          @state = block.call
        elsif defaults != :__glauco_state_not_set
          @state = defaults
        end

        @state
      end

      def default_state
        if instance_variable_defined?(:@state)
          validate_default_state!(@state)
        elsif superclass.respond_to?(:default_state)
          superclass.default_state
        else
          {}
        end
      end

      def default_state_snapshot
        deep_dup_state(default_state)
      end

      private

      def validate_default_state!(value)
        value ||= {}

        unless value.is_a?(Hash)
          raise TypeError, "estado inicial de #{name} precisa ser Hash, recebido #{value.class}"
        end

        value
      end

      def deep_dup_state(value)
        case value
        when Hash
          value.each_with_object({}) do |(key, child), copy|
            copy[key] = deep_dup_state(child)
          end
        when Array
          value.map { |child| deep_dup_state(child) }
        else
          begin
            value.dup
          rescue TypeError
            value
          end
        end
      end
    end

    def add_event_listener(event_name, &callback)
      callback_name = "callback_#{$callbacks.length + 1}"
      $callbacks[callback_name] = callback
      browserFunctionFac(callback_name) if @parent_renderer&.browser
      callback_name
    end

    def state(path = nil)
      return @state if path.nil?

      dig_state_path(path.is_a?(StatePath) ? path : StatePath.new(path))
    end

    class Symbol
      def >(other)
        sp = StatePath.new(self)
        sp.append_part(other)
      end
    end

    class StatePath
      def initialize(base)
        @parts = [base.to_s]
      end

      def [](key)
        @parts << key.to_s
        self
      end

      def append_part(part)
        @parts << part.to_s
        self
      end

      def to_s
        first, *rest = @parts
        rest.reduce(first) { |acc, part| "#{acc}[#{part}]" }
      end
    end

    def render_binding_result(result)
      case result
      when Array
        result.map { |r| r.respond_to?(:render_to_html) ? r.render_to_html : r.to_s }.join("\n")
      when Component
        result.render_to_html
      else
        result.to_s
      end
    end

    def capture_rendered_nodes
      @capture_buffers ||= []
      @capture_buffers << []
      result = yield
      captured_nodes = @capture_buffers.pop
      nodes = captured_nodes.empty? ? result : captured_nodes
      render_nodes(nodes)
    end

    def append_captured_node(node)
      return unless @capture_buffers && !@capture_buffers.empty?

      @capture_buffers.last << node
    end

    def html_for_capture_entry(entry)
      if entry.respond_to?(:render_to_html)
        entry.render_to_html
      else
        entry.to_s
      end
    end

    def replace_captured_node(original_node, replacement_html)
      return false unless @capture_buffers && !@capture_buffers.empty?

      original_html = html_for_capture_entry(original_node)
      buffer = @capture_buffers.last

      index = nil

      (buffer.length - 1).downto(0) do |i|
        if html_for_capture_entry(buffer[i]) == original_html
          index = i
          break
        end
      end

      return false unless index

      buffer[index] = replacement_html
      true
    end

    def bind(state_key, node = self, &block)
      raise ArgumentError, "bind precisa de bloco" unless block

      state_path = state_key.is_a?(StatePath) ? state_key : StatePath.new(state_key)
      path_str = state_path.to_s

      @binding_sequence ||= 0
      @binding_sequence += 1
      binding_id = "bind_#{@binding_sequence}"

      node_html =
        if node.equal?(self)
          pseudo_bind_content_tag(path_str, binding_id)
        else
          node.to_s
        end

      node_html = upsert_html_attr(node_html, "data-bind", path_str)
      node_html = upsert_html_attr(node_html, "data-bind-id", binding_id)

      @bindings ||= {}
      @bindings_by_path ||= Hash.new { |hash, key| hash[key] = [] }

      @bindings[binding_id] = {
        id: binding_id,
        path: state_path,
        key: path_str,
        block: block
      }

      @bindings_by_path[path_str] << binding_id

      value = dig_state_path(state_path)
      body_html = render_binding_body(value, &block)

      final_html = bind_body_into_host(node_html, body_html)

      replace_captured_node(node, final_html) unless node.equal?(self)

      final_html
    rescue => e
      puts "⚠️ Erro ao executar binding para #{path_str}: #{e.class} - #{e.message}"
      node_html || ""
    end

    def render_binding_body(value, &block)
      result = nil

      captured =
        if respond_to?(:capture_rendered_nodes, true)
          capture_rendered_nodes do
            result = block.call(value)
          end
        else
          result = block.call(value)
          []
        end

      captured_html = Array(captured).join
      return captured_html unless captured_html.empty?

      render_binding_result(result)
    end

    def bind_body_into_host(node_html, body_html)
      tag_name = node_html[/\A<\s*([a-zA-Z][\w:-]*)/, 1].to_s.downcase

      case tag_name
      when "input"
        upsert_html_attr(node_html, "value", html_plain_text(body_html))
      when "textarea"
        node_html.sub(%r{(<textarea\b[^>]*>).*?(</textarea>)}im) do
          "#{$1}#{html_text(html_plain_text(body_html))}#{$2}"
        end
      else
        node_html.sub(%r{\A(<([a-zA-Z][\w:-]*)(?:\s[^>]*)?>).*?(</\2>)\s*\z}m) do
          "#{$1}#{body_html}#{$3}"
        end
      end

    end

    def upsert_html_attr(html, name, value)
      escaped = html_attr(value)

      if html.match?(/\s#{Regexp.escape(name)}=/)
        html.sub(/\s#{Regexp.escape(name)}=(["']).*?\1/) do
          " #{name}=\"#{escaped}\""
        end
      else
        html.sub(/<([a-zA-Z][\w:-]*)([^>]*?)(\s*\/?)>/) do
          "<#{$1}#{$2} #{name}=\"#{escaped}\"#{$3}>"
        end
      end
    end

    def html_text(value)
      value.to_s
          .gsub("&", "&amp;")
          .gsub("<", "&lt;")
          .gsub(">", "&gt;")
    end

    def html_plain_text(value)
      value.to_s.gsub(/<[^>]*>/, "")
    end
    private

    def pseudo_bind_content_tag(path_str, binding_id)
      "<glauco-bind-content data-glauco-pseudotag=\"content\" data-bind=\"#{html_attr(path_str)}\" data-bind-id=\"#{html_attr(binding_id)}\"></glauco-bind-content>"
    end

    def render_binding_result(result)
      case result
      when Array
        result.map { |r| r.is_a?(Component) ? r.render_to_html : r.to_s }.join
      when Component
        result.render_to_html
      else
        result.to_s
      end
    end

    def html_attr(value)
      value.to_s
          .gsub("&", "&amp;")
          .gsub('"', "&quot;")
          .gsub("<", "&lt;")
          .gsub(">", "&gt;")
    end

    def dig_state_path(state_path)
      parts =
        if state_path.respond_to?(:parts)
          state_path.parts
        else
          StatePath.new(state_path).to_s.split(".")
        end

      parts.reduce(@state) do |current, key|
        read_state_value(current, key)
      end
    end

    def read_state_value(current, key)
      case current
      when Hash
        return current[key] if current.key?(key)

        string_key = key.to_s
        return current[string_key] if current.key?(string_key)

        symbol_key = string_key.to_sym
        return current[symbol_key] if current.key?(symbol_key)

        nil
      when Array
        index = key.to_s
        return nil unless index.match?(/\A\d+\z/)

        current[index.to_i]
      else
        nil
      end
    end

    def effect(deps, immediate: true, run_on_init: true, &block)
      dep_paths = Array(deps).map { |dep| normalize_state_path(dep) }
      raise ArgumentError, "effect precisa de pelo menos uma dependencia" if dep_paths.empty?
      raise ArgumentError, "effect precisa de um bloco" unless block

      @effect_sequence += 1
      effect = {
        id: @effect_sequence,
        deps: dep_paths,
        immediate: immediate,
        block: block
      }

      @effects << effect
      run_effect(effect) if run_on_init
      effect
    end

    def batch(&block)
      @effect_batch_depth += 1
      block.call
    ensure
      @effect_batch_depth -= 1
      flush_pending_effects if @effect_batch_depth.zero?
    end

    def commit(&block)
      return batch(&block) if block_given?

      flush_pending_effects
    end

    def set_state(path, new_value, replace: false)
      unless swt_ui_thread?
        return run_on_swt_thread { set_state(key, value) }
      end

      path_str = normalize_state_path(path)

      parts = path_str.scan(/([^\[\]]+)/).flatten
      last_key = parts.pop

      target = parts.reduce(@state) do |obj, key|
        key_sym = key.to_sym
        obj[key_sym] ||= {}
        obj[key_sym]
      end

      last_key_sym = last_key.to_sym
      current_value = target[last_key_sym]

      target[last_key_sym] =
        if !replace && current_value.is_a?(Hash) && new_value.is_a?(Hash)
          current_value.merge(new_value)
        else
          new_value
        end

      notify_bindings(path_str)
      schedule_effects(path_str)
      flush_pending_effects if @effect_batch_depth.zero?
    end

    def notify_bindings(path)
      unless swt_ui_thread?
        return run_on_swt_thread { notify_bindings(changed_key) }
      end
      path_str = normalize_state_path(path)
      puts "notify_bindings called for path #{path_str}" if DEBUG

      binding_ids = @bindings_by_path[path_str]
      return path_str if binding_ids.nil? || binding_ids.empty?

      updates = binding_ids.filter_map do |binding_id|
        binding = @bindings[binding_id]
        next unless binding

        value = dig_state_path(binding[:path])

        begin
          puts "Binding found for #{path_str}/#{binding_id}, updating DOM with value: #{value.inspect}" if DEBUG
          inner_html = render_binding_result(binding[:block].call(value))
      rescue => e
        puts "âš ï¸ Erro ao renderizar binding #{path_str}: #{e.class} - #{e.message}"
        inner_html = ""
      end

      { id: binding_id, html: inner_html }
    end

      return path_str if updates.empty?

      js = <<~JS
        (() => {
          const updates = #{updates.to_json};
          updates.forEach(update => {
            const nodes = document.querySelectorAll(`[data-bind-id="${update.id}"]`);
            nodes.forEach(el => {
              el.innerHTML = update.html;
            });
          });
        })();
      JS

      browser = @parent_renderer&.browser
      return path_str unless browser

      if defined?($display) && $display && !$display.isDisposed
        $display.async_exec do
          begin
            browser.execute(js) unless browser.isDisposed
          rescue => e
            puts "âš ï¸ Erro ao executar update JS para #{path_str}: #{e.class} - #{e.message}"
          end
        end
      else
        browser.execute(js)
      end

      path_str
    end

    private

    def swt_ui_thread?
      defined?(Display) && !Display.getCurrent.nil?
    end

    def run_on_swt_thread(&block)
      display =
        if defined?(Display)
          Display.getCurrent || Display.getDefault
        end

      if display.nil? || display.isDisposed || swt_ui_thread?
        block.call
      else
        display.asyncExec do
          begin
            block.call unless display.isDisposed
          rescue => e
            puts "⚠️ Erro na UI thread SWT: #{e.class} - #{e.message}"
            puts e.backtrace.first(20).join("\n")
          end
        end
      end
    end

    def normalize_state_path(path)
      path.is_a?(StatePath) ? path.to_s : path.to_s
    end

    def schedule_effects(changed_path)
      @effects.each do |registered_effect|
        next unless registered_effect[:deps].any? { |dep| related_state_paths?(dep, changed_path) }

        if registered_effect[:immediate]
          run_effect(registered_effect)
        else
          @pending_effect_ids.add(registered_effect[:id])
        end
      end
    end

    def flush_pending_effects
      return if @is_flushing_effects
      return if @pending_effect_ids.empty?

      @is_flushing_effects = true

      loop do
        pending_ids = @pending_effect_ids.to_a
        @pending_effect_ids.clear
        break if pending_ids.empty?

        pending_ids.each do |effect_id|
          registered_effect = @effects.find { |effect| effect[:id] == effect_id }
          run_effect(registered_effect) if registered_effect
        end
      end
    ensure
      @is_flushing_effects = false
    end

    def run_effect(registered_effect)
      return unless registered_effect
      return if @active_effect_ids.include?(registered_effect[:id])

      @active_effect_ids.add(registered_effect[:id])
      values = registered_effect[:deps].map { |dep| dig_state_path(dep) }
      registered_effect[:block].call(*values)
    ensure
      @active_effect_ids.delete(registered_effect[:id]) if registered_effect
    end

    def related_state_paths?(left, right)
      left == right || left.start_with?("#{right}[") || right.start_with?("#{left}[")
    end

    public

    def add_child(comp)
      comp.parent_renderer = parent_renderer
      @children << comp
    end

    def expose_as(name, **options)
      raise LoadError, "Glauco::Framework::SQL nao esta disponivel" unless defined?(Glauco::Framework::SQL)

      model = Glauco::Framework::SQL.expose_table_as(name, **options)
      singleton_class.define_method(name) do
        model.order(id: :asc).to_a
      end
      model
    end

    def method_missing(method_name, *args, **kwargs, &block)
      name = method_name.to_s
      tag(CarbonRegistry.resolve(name), *args, **kwargs, &block)
    end

    def respond_to_missing?(_method_name, _include_private = false)
      true
    end

    def tag(name, *args, **attrs, &block)
      resolved_name = CarbonRegistry.resolve(name)

      content_or_attrs = args.first

      inner_content =
        if block
          capture_rendered_nodes { instance_eval(&block) }
        else
          content_or_attrs.is_a?(Component) ? content_or_attrs.render_to_html : content_or_attrs.to_s
        end

      html_attrs = attrs.map do |k, v|
        attr_name = k.to_s.tr('_', '-')

        if k.to_s.start_with?("on") && v.is_a?(Proc)
          @parent_renderer.bind_callback(k, v)
        elsif k.to_s.start_with?("data_") && v.is_a?(Proc)
          "#{attr_name}=\"#{@parent_renderer.register_callback(v)}\""
        elsif v == true
          attr_name
        elsif v == false || v.nil?
          nil
        else
          "#{attr_name}=\"#{v}\""
        end
      end.compact.join(" ")

      html =
        if html_attrs.empty?
          "<#{resolved_name}>#{inner_content}</#{resolved_name}>"
        else
          "<#{resolved_name} #{html_attrs}>#{inner_content}</#{resolved_name}>"
        end

      append_captured_node(html)
      html
    end

    def p(*args, **attrs, &block)
      tag(:p, *args, **attrs, &block)
    end

    def overlay_page_element(id:, url: nil, html: nil, alpha: 255, x: nil, y: nil, width: nil, height: nil,
                             x_ratio: nil, y_ratio: nil, width_ratio: nil, height_ratio: nil, **attrs, &block)
      geometry_callback = Frontend.register_overlay_geometry_callback(@parent_renderer.browser, id)

      Frontend.register_overlay_page(
        id,
        {
          url: url,
          html: html,
          alpha: alpha,
          bounds: {
            x: x,
            y: y,
            width: width,
            height: height,
            x_ratio: x_ratio,
            y_ratio: y_ratio,
            width_ratio: width_ratio,
            height_ratio: height_ratio
          }.compact
        }
      )

      overlay_attrs = attrs.merge(
        id: id,
        data_overlay_host: "true",
        data_overlay_geometry_callback: geometry_callback,
        data_overlay_url: url,
        data_overlay_html: html,
        data_overlay_alpha: alpha,
        data_overlay_x: x,
        data_overlay_y: y,
        data_overlay_width: width,
        data_overlay_height: height,
        data_overlay_x_ratio: x_ratio,
        data_overlay_y_ratio: y_ratio,
        data_overlay_width_ratio: width_ratio,
        data_overlay_height_ratio: height_ratio
      )

      tag("overlay-page", **overlay_attrs, &block)
    end

    def embedded_browser_element(id:, url: nil, html: nil, visible: true, x: nil, y: nil, width: nil, height: nil, **attrs, &block)
      geometry_callback = Frontend.register_embedded_browser_geometry_callback(@parent_renderer.browser, id)
      host_content = attrs.delete(:host_content) || ""
      embedded_html =
        if block
          build_embedded_browser_document(capture_rendered_nodes { instance_eval(&block) })
        elsif html
          warn "[embedded_browser_element] html: estÃ¡ deprecado; prefira conteÃºdo via bloco de tags."
          html
        else
          nil
        end

      Frontend.register_embedded_browser(
        id,
        {
          url: url,
          html: embedded_html,
          visible: visible,
          bounds: {
            x: x,
            y: y,
            width: width,
            height: height
          }.compact
        }
      )

      embedded_attrs = attrs.merge(
        id: id,
        data_embedded_browser_host: "true",
        data_embedded_browser_geometry_callback: geometry_callback,
        data_embedded_browser_url: url,
        data_embedded_browser_html: embedded_html,
        data_embedded_browser_visible: visible
      )

      tag("embedded-browser", host_content, **embedded_attrs)
    end

    def agent_chatbox(**attrs, &block)
      component = AgentChatboxComponent.new(parent_renderer: @parent_renderer, **attrs, &block)
      add_child(component)
      html = component.render_to_html
      append_captured_node(html)
      html
    end

    def served_page_feature(**attrs, &block)
      component = ServedPageFeatureComponent.new(parent_renderer: @parent_renderer, owner: self, **attrs, &block)
      add_child(component)
      html = component.render_to_html
      append_captured_node(html)
      html
    end

    def external_view(**attrs, &block)
      served_page_feature(**attrs, &block)
    end

    def frontend(**attrs, &block)
      external_view(**attrs, &block)
    end

    def render_nodes(result)
      components = result.is_a?(Array) ? result : [result]

      components.map do |c|
        add_child(c) if c.is_a?(Component)
        c.is_a?(Component) ? c.render_to_html : c.to_s
      end.join
    end

    def build_embedded_browser_document(inner_html)
      <<~HTML
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
              }
            </style>
          </head>
          <body>
            #{inner_html}
          </body>
        </html>
      HTML
    end

    def render_to_html
      @children = []
      return "" unless @render_block
      capture_rendered_nodes { instance_eval(&@render_block) }
    end

    def ui(&block)
      @render_block = block
    end

    def define_render(&block)
      @render_block = block
    end

    def render
      instance_eval(&@render_block)
    end

    # Runtime cognition API belongs to Component itself, not to a later
    # monkey-patch/reopen block.
    def remember(text, **metadata)
      Glauco::Cognition.memory_runtime(self.class).bind(self).remember(text, **metadata)
    end

    def memory_present?(phrase)
      Glauco::Cognition.memory_runtime(self.class).bind(self).present?(phrase)
    end

    def memory_refresh!
      Glauco::Cognition.memory_runtime(self.class).bind(self).refresh!
    end

    def memory_reset!(clear_persisted: false)
      Glauco::Cognition.memory_runtime(self.class).bind(self).reset!(clear_persisted: clear_persisted)
    end

    def machine(name)
      Glauco::Cognition.machine(self.class, name)
    end

    def run(title: nil, width: nil, height: nil, root_component: nil)
      Glauco::Cognition.bind(self)
      Glauco::Cognition.boot_for(self)
      Frontend.ensure_frontend_runtime!
      component = root_component || self
      component.parent_renderer = $root if component.respond_to?(:parent_renderer=)
      $root.root_component = component
      $root.render
      Frontend.apply_window_title(title) if title
      Frontend.apply_window_size(width, height) if width && height
      Frontend.start!
    end

    def run_js(js_code)
      @parent_renderer.browser.evaluate(js_code)
    end

    def rerender
      puts "rerenderrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr"
      @parent_renderer.render
    end

    def web_contents_view(
      id:,
      url: nil,
      html: nil,
      visible: true,
      **attrs,
      &block
    )
      base_style = [
        "display:block",
        "position:relative",
        "width:100%",
        "height:100%",
        "min-width:1px",
        "min-height:1px",
        "overflow:hidden"
      ].join(";")

      custom_style = attrs.delete(:style)

      attrs[:style] = [
        base_style,
        custom_style
      ].compact.join(";")

      embedded_browser_element(
        id: id,
        url: url,
        html: html,
        visible: visible,
        **attrs,
        &block
      )
    end


    def webview_content(**attrs, &block)
      web_contents_view(**attrs, &block)
    end

    alias webviewcontent webview_content
  end

  class ServedPageFeatureComponent < Component
    def initialize(parent_renderer:, owner:, id:, title:, port: nil, path: nil, twa: {}, ngrok: nil, bubblewrap: nil, apk: nil, **attrs, &block)
      super(parent_renderer: parent_renderer, **attrs)

      @owner = owner
      @id = id.to_s
      @title = title.to_s
      @port = port && port.to_i
      @path = path
      @twa =
        case twa
        when true
          { auto_ngrok: true, auto_bubblewrap: true }
        when false, nil
          {}
        else
          twa
        end
      @auto_ngrok = truthy_option?(ngrok) || truthy_option?(@twa[:auto_ngrok]) || truthy_option?(@twa["auto_ngrok"]) || truthy_option?(@twa[:auto]) || truthy_option?(@twa["auto"])
      @auto_bubblewrap = truthy_option?(bubblewrap) || truthy_option?(@twa[:bubblewrap]) || truthy_option?(@twa["bubblewrap"]) || truthy_option?(@twa[:auto_bubblewrap]) || truthy_option?(@twa["auto_bubblewrap"])
      @auto_apk = truthy_option?(apk) || truthy_option?(@twa[:apk]) || truthy_option?(@twa["apk"]) || truthy_option?(@twa[:auto_apk]) || truthy_option?(@twa["auto_apk"]) || truthy_option?(@twa[:build_apk]) || truthy_option?(@twa["build_apk"])
      @auto_bubblewrap ||= @auto_apk
      @children_block = block
      @served_inner_html = ""

      @state[:public_url] = nil
      register_page!
      @state[:local_url] = Frontend.served_page_url(@id)
      @state[:status] = "Pagina servida em localhost:#{served_port}."
      auto_publish! if @auto_ngrok || @auto_bubblewrap || @auto_apk

      ui do
        section(class: "served-page-feature border border-[#d0d0d0] bg-white p-4 #{attrs[:class]}".strip) do
          div(class: "flex items-start justify-between gap-4") do
            div do
              div("Served Page", class: "text-xs font-semibold uppercase tracking-[0.2em] text-[#525252]") +
                h3(@title, class: "mt-1 text-lg font-semibold text-[#161616]")
            end +
              tag("localhost:#{served_port}", type: "blue")
          end +
            bind(:local_url, code(class: "mt-3 block break-all bg-[#f4f4f4] p-2 text-xs")) { |url| url.to_s } +
            bind(:public_url, div(class: "mt-3")) do |url|
              next "" if url.to_s.empty?

              code(url.to_s, class: "block break-all bg-[#edf5ff] p-2 text-xs")
            end +
            bind(:status, p(class: "mt-3 text-sm text-[#525252]")) { |status| status.to_s } +
            div(class: "mt-4 flex flex-wrap gap-2") do
              button(kind: "secondary", onclick: proc { open_local_page }) { "Abrir local" } +
                button(kind: "primary", onclick: proc { start_ngrok }) { "Ativar ngrok" } +
                button(kind: "ghost", onclick: proc { generate_twa }) { "Gerar TWA" }
            end +
            div(class: "external-view-inline mt-4") { @served_inner_html }
        end
      end
    end

    def open_local_page
      Program.launch(@state[:local_url].to_s)
      nil
    end

    def start_ngrok
      tunnel = Frontend.start_ngrok_tunnel(@id, port: served_port)
      public_page_url = Frontend.served_page_public_url(@id, tunnel[:public_url])
      batch do
        set_state(:public_url, public_page_url, replace: true)
        set_state(:status, "ngrok ativo: #{public_page_url}", replace: true)
      end
      nil
    rescue => e
      set_state(:status, "Falha ao ativar ngrok: #{e.message}", replace: true)
      nil
    end

    def generate_twa
      output = Frontend.generate_twa_artifacts_for(@id, public_url: @state[:public_url], app_name: @title)
      set_state(:status, "TWA gerado em #{output}", replace: true)
      nil
    rescue => e
      set_state(:status, "Falha ao gerar TWA: #{e.message}", replace: true)
      nil
    end

    private

    def truthy_option?(value)
      return value if value == true || value == false

      GlaucoEnv.truthy?(value.to_s)
    end

    def auto_publish!
      tunnel = Frontend.start_ngrok_tunnel(@id, port: served_port)
      public_page_url = Frontend.served_page_public_url(@id, tunnel[:public_url])
      @state[:public_url] = public_page_url
      @state[:status] = "ngrok ativo: #{public_page_url}"

      return unless @auto_bubblewrap

      output = Frontend.generate_twa_artifacts_for(@id, public_url: public_page_url, app_name: @title)
      @state[:status] = "TWA gerado em #{output}"

      build_apk_async(public_page_url) if @auto_apk
    rescue => e
      @state[:status] = "Falha ao publicar TWA: #{e.message}"
    end

    def build_apk_async(public_page_url)
      @state[:status] = "Build APK iniciado em background para #{public_page_url}"

      Thread.new do
        begin
          result = Frontend.build_twa_apk_noninteractive_for(@id, public_url: public_page_url, app_name: @title)
          apk = result[:apk] || "APK nao encontrado apos build"
          set_state(:status, "APK gerado: #{apk}", replace: true)
        rescue => e
          set_state(:status, "Falha ao gerar APK: #{e.message}", replace: true)
        end
      end
    end

    def register_page!
      @served_inner_html = render_page_inner
      html = render_page_document(@served_inner_html)
      Frontend.register_served_page(@id, title: @title, html: html, twa: @twa, port: @port, component: self)
    end

    def render_served_page_document
      render_page_document(render_page_inner)
    end
    public :render_served_page_document

    def served_port
      page = Frontend.served_page_registry[@id] || {}
      (page[:port] || Frontend.server_port).to_i
    end

    def render_page_inner
      return "" unless @children_block

      @owner.capture_rendered_nodes do
        @children_block.arity.zero? ? @owner.instance_eval(&@children_block) : @owner.instance_exec(&@children_block)
      end
    end

    def render_page_document(inner)
      <<~HTML
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>#{@title}</title>
            <style>
              body { margin: 0; font-family: Arial, sans-serif; background: #f4f4f4; color: #161616; }
              .served-page-root { max-width: 1120px; margin: 0 auto; padding: 24px; }
            </style>
            #{Frontend.native_shell_behavior_style}
            #{Frontend.transparent_window_style}
          </head>
          <body>
            <main class="served-page-root">#{inner}</main>
            #{Frontend.callback_bridge_script}
            #{Frontend.native_shell_behavior_script}
            #{Frontend.window_page_drag_script}
          </body>
        </html>
      HTML
    end
  end

  class AgentChatboxComponent < Component
    def initialize(
      parent_renderer:,
      id: "agent-chatbox",
      title: "Agente",
      subtitle: nil,
      placeholder: "Digite uma mensagem...",
      initial_messages: [],
      quick_prompts: [],
      user_author: "Voce",
      response_author: "Agente",
      on_input: nil,
      output_handler: nil,
      on_response: nil,
      **attrs,
      &block
    )
      super(parent_renderer: parent_renderer, **attrs)

      @id = id.to_s
      @title = title
      @subtitle = subtitle
      @placeholder = placeholder
      @quick_prompts = Array(quick_prompts)
      @user_author = user_author
      @response_author = response_author
      @on_input = on_input
      @output_handler = output_handler
      @on_response = on_response
      @children_block = block

      @state[:draft] = ""
      @state[:typing] = false
      @state[:messages] = normalize_initial_messages(initial_messages)
      @state[:feed] = { messages: @state[:messages], typing: false }
      @state[:outputs] = @state[:feed]

      ui do
        section(class: "agent-chatbox flex min-h-0 flex-col border border-[#d0d0d0] bg-white #{attrs[:class]}".strip, id: @id) do
          render_header +
            render_children +
            render_messages +
            render_quick_prompts +
            render_composer
        end
      end
    end

    def push_message(prompt)
      text = prompt.to_s.strip
      return nil if text.empty?

      dispatch_user_message(text)
      nil
    end

    private

    def normalize_initial_messages(messages)
      Array(messages).map do |message|
        {
          role: message[:role] || :assistant,
          author: message[:author] || @response_author,
          text: message[:text].to_s,
          time: message[:time] || "agora"
        }
      end
    end

    def render_header
      div(class: "border-b border-[#d0d0d0] p-4") do
        div(@title, class: "text-xs font-semibold uppercase tracking-[0.24em] text-[#525252]") +
          if @subtitle.to_s.empty?
            ""
          else
            p(@subtitle, class: "mt-2 text-sm leading-6 text-[#525252]")
          end
      end
    end

    def render_children
      return "" unless @children_block

      bind(:outputs, div(class: "border-b border-[#e0e0e0] p-4")) do |outputs|
        if @children_block.arity.zero?
          instance_eval(&@children_block)
        else
          instance_exec(input_handler, outputs, &@children_block)
        end
      end
    end

    def render_messages
      bind(:feed, div(id: messages_id, class: "min-h-0 flex-1 space-y-3 overflow-y-auto p-4")) do |feed|
        items = Array(feed[:messages]).map { |message| message_bubble(message) }
        items << typing_indicator if feed[:typing]
        items
      end
    end

    def render_quick_prompts
      return "" if @quick_prompts.empty?

      div(class: "border-t border-[#e0e0e0] p-4") do
        div("Sugestoes", class: "mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#525252]") +
          div(class: "flex flex-wrap gap-2") do
            @quick_prompts.map do |prompt|
              button(kind: "ghost", onclick: proc { dispatch_user_message(prompt) }) { prompt }
            end
          end
      end
    end

    def render_composer
      div(class: "border-t border-[#d0d0d0] p-4") do
        textarea(
          "",
          id: draft_id,
          rows: "4",
          placeholder: @placeholder,
          oninput: proc { |value| set_state(:draft, value.to_s, replace: true) },
          class: "w-full resize-none border border-[#8d8d8d] bg-white p-3 text-sm leading-6 outline-none focus:border-[#0f62fe]"
        ) +
          div(class: "mt-3 flex items-center justify-between gap-3") do
            bind(:typing, span(class: "text-xs text-[#525252]")) do |typing|
              typing ? "Consultando backend..." : "Pronto para enviar"
            end +
              button(kind: "primary", onclick: proc { submit_message }) { "Enviar" }
          end
      end
    end

    def message_bubble(message)
      from_user = message[:role] == :user
      wrapper = from_user ? "flex justify-end" : "flex justify-start"
      bubble = from_user ? "bg-[#0f62fe] text-white" : "bg-[#f4f4f4] text-[#262626]"
      meta = from_user ? "text-blue-100" : "text-[#525252]"

      div(class: wrapper) do
        div(class: "max-w-[88%] #{bubble} px-4 py-3") do
          div(message[:author], class: "text-[11px] font-semibold uppercase tracking-[0.18em] #{meta}") +
            div(message[:text], class: "mt-2 whitespace-pre-wrap text-sm leading-6") +
            div(message[:time], class: "mt-2 text-[11px] #{meta}")
        end
      end
    end

    def typing_indicator
      div(class: "flex justify-start") do
        div("#{@response_author} esta respondendo...", class: "bg-[#f4f4f4] px-4 py-3 text-sm text-[#525252]")
      end
    end

    def submit_message
      dispatch_user_message(@state[:draft])
    end

    def input_handler
      proc { |message| dispatch_user_message(message) }
    end

    def dispatch_user_message(prompt)
      text = prompt.to_s.strip
      return nil if text.empty?

      call_handler(@on_input, text) if @on_input

      messages = Array(@state[:messages]) + [
        { role: :user, author: @user_author, text: text, time: current_time }
      ]

      batch do
        set_state(:messages, messages, replace: true)
        set_state(:feed, { messages: messages, typing: true }, replace: true)
        set_state(:outputs, { messages: messages, typing: true }, replace: true)
        set_state(:draft, "", replace: true)
        set_state(:typing, true)
      end

      clear_input
      scroll_to_bottom

      Thread.new do
        response = generate_response(text)

        async do
          append_response(response)
        end
      end

      nil
    end

    def generate_response(prompt)
      return "Nenhum output_handler foi configurado para este agent_chatbox." unless @output_handler

      call_handler(@output_handler, prompt).to_s
    rescue => e
      "Erro ao gerar resposta: #{e.class} - #{e.message}"
    end

    def append_response(response)
      call_handler(@on_response, response) if @on_response

      messages = Array(@state[:messages]) + [
        { role: :assistant, author: @response_author, text: response.to_s, time: current_time }
      ]

      batch do
        set_state(:messages, messages, replace: true)
        set_state(:feed, { messages: messages, typing: false }, replace: true)
        set_state(:outputs, { messages: messages, typing: false }, replace: true)
        set_state(:typing, false)
      end

      scroll_to_bottom
    end

    def call_handler(handler, value)
      case handler.arity
      when 0
        handler.call
      when 1
        handler.call(value)
      else
        handler.call(value, self)
      end
    end

    def clear_input
      run_js(<<~JS)
        (() => {
          const field = document.getElementById(#{draft_id.to_json});
          if (field) field.value = '';
        })();
      JS
    end

    def scroll_to_bottom
      run_js(<<~JS)
        (() => {
          const list = document.getElementById(#{messages_id.to_json});
          if (list) list.scrollTop = list.scrollHeight;
        })();
      JS
    end

    def draft_id
      "#{@id}-draft"
    end

    def messages_id
      "#{@id}-messages"
    end

    def current_time
      Time.now.strftime("%H:%M")
    end
  end

  def self.embedded_browser_source_key(config)
    if config[:html]
      html = config[:html].to_s
      "html:#{Zlib.crc32(html)}:#{html.bytesize}"
    elsif config[:url]
      "url:#{config[:url]}"
    else
      "empty"
    end
  end

  def self.load_embedded_browser_source!(element_id, surface)
    config = embedded_browser_registry[element_id.to_s]
    return false unless config

    source_key = embedded_browser_source_key(config)
    current_key = surface.getData("glauco_embedded_source_key")

    return false if current_key.to_s == source_key

    if config[:html]
      surface.setText(config[:html].to_s)
    elsif config[:url] && !config[:url].to_s.empty?
      surface.setUrl(config[:url].to_s)
    else
      surface.setText("")
    end

    surface.setData(
      "glauco_embedded_source_key",
      source_key
    )

    true
  end

  def +(other)
    left = respond_to?(:render_to_html) ? render_to_html : to_s
    right = other.is_a?(Component) ? other.render_to_html : other.to_s
    left + right
  end

  def async(&block)
    Frontend.ensure_frontend_runtime!
    Frontend.defer(&block)
  end

  def self.hmr_entry_file
    @hmr_entry_file ||= File.expand_path($0.to_s)
  end

  def self.hmr_watch_paths
    entry = hmr_entry_file
    app_dir = File.dirname(entry)
    Dir.glob(File.join(app_dir, "**", "*.rb")).map { |path| File.expand_path(path) }.uniq.sort
  end

  def self.hmr_snapshot(paths = hmr_watch_paths)
    paths.to_h do |path|
      [path, File.exist?(path) ? File.mtime(path) : Time.at(0)]
    end
  end

  def self.ensure_hmr_watcher!
    return if @hmr_thread && @hmr_thread.alive?

    watch_paths = hmr_watch_paths
    return if watch_paths.empty?

    mtimes = hmr_snapshot(watch_paths)

    @hmr_thread = Thread.new do
      loop do
        sleep 0.6

        latest_paths = hmr_watch_paths
        latest_snapshot = hmr_snapshot(latest_paths)
        changed = latest_paths != watch_paths || latest_snapshot != mtimes

        watch_paths = latest_paths
        mtimes = latest_snapshot

        next unless changed

        begin
          $display.async_exec do
            begin
              load hmr_entry_file
              puts "[HMR] reload aplicado"
            rescue SyntaxError, StandardError => e
              warn "[HMR] falha ao recarregar: #{e.class} - #{e.message}"
            end
          end
        rescue StandardError => e
          warn "[HMR] falha ao agendar reload: #{e.class} - #{e.message}"
        end
      end
    end
  end

  def self.ensure_frontend_runtime!
    display_ready = defined?($display) && $display && !$display.isDisposed
    browser_ready = defined?($browser) && $browser && !$browser.isDisposed

    if display_ready && browser_ready
      $root = RootRenderer.new($browser) unless defined?($root) && $root && $root.browser.equal?($browser)
      return
    end

    $display = display_ready ? $display : Display.new
    $shell, $shell_body, = GlaucoSWTChrome.create_shell(
      $display,
      title: ENV.fetch("GLAUCO_WINDOW_TITLE", "Glauco SWT"),
      width: ENV.fetch("GLAUCO_WINDOW_WIDTH", "1200"),
      height: ENV.fetch("GLAUCO_WINDOW_HEIGHT", "760")
    )
    $shell_body.setLayout(FillLayout.new)
    if GlaucoSWTChrome.browser_hittest_shell?
      $surface_parent = Shell.new($shell, SWT::NO_TRIM | SWT::TOOL)
      $surface_parent.setLayout(nil)
      $surface_parent.setText($shell.getText.to_s)
      sync_browser_hittest_shell!
    else
      $surface_parent = Composite.new($shell_body, 0)
      $surface_parent.setLayout(nil)
    end
    $embedded_surfaces = {}

    $browser = Browser.new($surface_parent, 0)
    if GlaucoSWTChrome.transparent?
      r, g, b = GlaucoSWTChrome.transparent_background_rgb
      transparent_bg = Color.new($display, r, g, b)
      [$shell, $shell_body, $surface_parent, $browser].each do |control|
        begin
          control.setBackground(transparent_bg)
        rescue
          nil
        end
      end
      GlaucoSWTChrome.apply_color_key_transparency($shell)
      GlaucoSWTChrome.apply_color_key_transparency($surface_parent) if GlaucoSWTChrome.browser_hittest_shell?
      $shell.setData('glauco_frontend_transparent_bg', transparent_bg)
      $shell.addListener(SWT::Dispose) do |_event|
        stored = $shell.getData('glauco_frontend_transparent_bg')
        stored.dispose if stored && !stored.isDisposed
      end
    end
    $root    = RootRenderer.new($browser)
    install_window_drag_function!($browser)
    install_native_window_drag_listeners!($browser) if GlaucoEnv.truthy?(ENV['GLAUCO_WINDOW_NATIVE_DRAG'])
    if GlaucoSWTChrome.transparent?
      $display.async_exec { GlaucoSWTChrome.apply_webview2_transparent_background($browser) rescue nil }
    end

    frontend_resize_listener = Listener.impl { |_event| Frontend.sync_frontend_layout! rescue nil }
    $shell.addListener(SWT::Resize, frontend_resize_listener)
    $shell.addListener(SWT::Move, frontend_resize_listener)
    $surface_parent.addListener(SWT::Resize, frontend_resize_listener)
    install_browser_hittest_shell_tracking! if GlaucoSWTChrome.browser_hittest_shell?

    @server_thread ||= Thread.new { server.start }
    wait_for_server!
    auto_start_ngrok_if_configured!
  end

  def self.sync_browser_hittest_shell!
    return unless GlaucoSWTChrome.browser_hittest_shell?
    return unless defined?($shell) && $shell && !$shell.isDisposed
    return unless defined?($surface_parent) && $surface_parent && !$surface_parent.isDisposed

    forced = $shell.getData('glauco_full_bounds') rescue nil
    if forced && forced.respond_to?(:[])
      x, y, width, height = forced[0].to_i, forced[1].to_i, forced[2].to_i, forced[3].to_i
    else
      bounds = $shell.getBounds
      x, y, width, height = bounds.x, bounds.y, bounds.width, bounds.height
    end
    $surface_parent.setBounds(x, y, [width, 1].max, [height, 1].max)
    GlaucoSWTChrome.apply_image_region($surface_parent, $display)
    $surface_parent.moveAbove(nil)
    $surface_parent.setVisible($shell.getVisible)
  end

  def self.move_window_by!(dx, dy)
    return if dx.to_i.zero? && dy.to_i.zero?
    return unless defined?($shell) && $shell && !$shell.isDisposed

    forced = $shell.getData('glauco_full_bounds') rescue nil
    if forced && forced.respond_to?(:[])
      x, y, width, height = forced[0].to_i, forced[1].to_i, forced[2].to_i, forced[3].to_i
    else
      bounds = $shell.getBounds
      x, y, width, height = bounds.x, bounds.y, bounds.width, bounds.height
    end

    next_x = x + dx.to_i
    next_y = y + dy.to_i
    $shell.setData('glauco_full_bounds', [next_x, next_y, width, height])
    $shell.setData('glauco_drag_move_in_progress', true)
    $shell.setLocation(next_x, next_y)

    if GlaucoSWTChrome.browser_hittest_shell? &&
       defined?($surface_parent) && $surface_parent && !$surface_parent.isDisposed
      $surface_parent.setLocation(next_x, next_y)
      $surface_parent.moveAbove(nil)
    end
    $display.timer_exec(40) do
      $shell.setData('glauco_drag_move_in_progress', false) if defined?($shell) && $shell && !$shell.isDisposed
    end if defined?($display) && $display && !$display.isDisposed
  end

  def self.install_browser_hittest_shell_tracking!
    return if defined?(@browser_hittest_shell_tracking_installed) && @browser_hittest_shell_tracking_installed

    sync_listener = Listener.impl do |_event|
      begin
        next if defined?($shell) && $shell && !$shell.isDisposed && $shell.getData('glauco_drag_move_in_progress') == true
        sync_browser_hittest_shell!
      rescue
        nil
      end
    end
    hide_listener = Listener.impl { |_event| $surface_parent.setVisible(false) if defined?($surface_parent) && $surface_parent && !$surface_parent.isDisposed rescue nil }
    show_listener = Listener.impl { |_event| sync_browser_hittest_shell! rescue nil }
    dispose_listener = Listener.impl do |_event|
      begin
        if defined?($surface_parent) && $surface_parent && !$surface_parent.isDisposed
          region = $surface_parent.getData('glauco_image_region')
          region.dispose if region && !region.isDisposed
          $surface_parent.dispose
        end
      rescue
        nil
      end
    end

    $shell.addListener(SWT::Move, sync_listener)
    $shell.addListener(SWT::Resize, sync_listener)
    $shell.addListener(SWT::Activate, show_listener)
    $shell.addListener(SWT::Deiconify, show_listener)
    $shell.addListener(SWT::Iconify, hide_listener)
    $shell.addListener(SWT::Close, dispose_listener)
    $shell.addListener(SWT::Dispose, dispose_listener)

    @browser_hittest_shell_tracking_installed = true
  end

  def self.install_window_drag_function!(browser)
    return unless GlaucoSWTChrome.page_drag?
    return if defined?(@window_drag_function) && @window_drag_function

    @window_drag_function = Class.new(Java::OrgEclipseSwtBrowser::BrowserFunction) do
      define_method(:function) do |*args|
        begin
          raw = args.first
          raw = raw[0] if raw.is_a?(Java::JavaLang::Object[]) && raw.size == 1
          payload = raw.is_a?(String) ? JSON.parse(raw) : {}
          dx = payload["dx"].to_i
          dy = payload["dy"].to_i
          next nil if dx.zero? && dy.zero?
          next nil unless defined?($shell) && $shell && !$shell.isDisposed

          if defined?($display) && $display && !$display.isDisposed
            $display.async_exec do
              next unless defined?($shell) && $shell && !$shell.isDisposed
              Frontend.move_window_by!(dx, dy)
            end
          end
        rescue => e
          warn "Falha ao mover janela por drag da pagina: #{e.class} - #{e.message}"
        end
        nil
      end
    end.new(browser, "__glaucoWindowDragMove")
  end

  def self.install_native_window_drag_listeners!(control)
    return unless GlaucoSWTChrome.page_drag?
    return unless control && !control.isDisposed
    return if control.getData("glauco_native_window_drag") == true

    state = {
      armed: false,
      dragging: false,
      start_mouse_x: 0,
      start_mouse_y: 0,
      last_mouse_x: 0,
      last_mouse_y: 0
    }

    control.addMouseListener(Class.new(MouseAdapter) do
      define_method(:mouseDown) do |event|
        next unless event.button == 1
        cursor = control.getDisplay.getCursorLocation
        state[:armed] = true
        state[:dragging] = false
        state[:start_mouse_x] = cursor.x
        state[:start_mouse_y] = cursor.y
        state[:last_mouse_x] = cursor.x
        state[:last_mouse_y] = cursor.y
      end

      define_method(:mouseUp) do |_event|
        state[:armed] = false
        state[:dragging] = false
      end
    end.new)

    control.addMouseMoveListener(Class.new do
      include MouseMoveListener

      define_method(:mouseMove) do |_event|
        next unless state[:armed]
        next unless defined?($shell) && $shell && !$shell.isDisposed

        cursor = control.getDisplay.getCursorLocation
        unless state[:dragging]
          distance = Math.hypot(cursor.x - state[:start_mouse_x], cursor.y - state[:start_mouse_y])
          next if distance < 4
          state[:dragging] = true
        end

        dx = cursor.x - state[:last_mouse_x]
        dy = cursor.y - state[:last_mouse_y]
        next if dx.zero? && dy.zero?

        Frontend.move_window_by!(dx, dy)
        state[:last_mouse_x] = cursor.x
        state[:last_mouse_y] = cursor.y
      end
    end.new)

    control.setData("glauco_native_window_drag", true)
  end

  def self.start!
    return if defined?(Glauco::Framework) && Glauco::Framework.maybe_build_msi_installer!(component: defined?($root) ? $root.root_component : nil)

    ensure_frontend_runtime!
    ensure_hmr_watcher!
    return if defined?(@run_loop_started) && @run_loop_started

    @run_loop_started = true
    $shell.open
    if GlaucoSWTChrome.browser_hittest_shell?
      sync_browser_hittest_shell!
      $surface_parent.open if defined?($surface_parent) && $surface_parent && !$surface_parent.isDisposed
    end
    sync_frontend_layout!
    self.run_loop
  end

  def self.safe_set_text(widget, text)
    return unless widget
    return if widget.respond_to?(:isDisposed) && widget.isDisposed
    return unless widget.respond_to?(:setText)

    widget.setText(text.to_s)
  end

  def self.apply_window_title(title)
    return if title.nil?

    text = title.to_s

    if webview? && defined?(@native_webview_client) && @native_webview_client
      @native_webview_client.title(text)
      return text
    end

    safe_set_text($shell, text) if defined?($shell)
    safe_set_text($glauco_title_label, text) if defined?($glauco_title_label)
    text
  end

  def self.apply_window_size(width, height)
    return false unless width && height

    if webview? && defined?(@native_webview_client) && @native_webview_client
      @native_webview_client.size(width.to_i, height.to_i)
      return true
    end

    if defined?($shell) && $shell && (!$shell.respond_to?(:isDisposed) || !$shell.isDisposed)
      $shell.setSize(width.to_i, height.to_i)
      return true
    end

    false
  end

  def self.defer(delay_ms = 0, &block)
    raise ArgumentError, "defer requires a block" unless block

    if swt? && defined?($display) && $display && !$display.isDisposed
      if delay_ms.to_i.positive?
        $display.timerExec(delay_ms.to_i) { block.call }
      else
        $display.async_exec { block.call }
      end
      return true
    end

    Thread.new do
      sleep(delay_ms.to_f / 1000.0) if delay_ms.to_i.positive?
      block.call
    end
    true
  end

  def self.start(component, title: nil, width: nil, height: nil)
    return if defined?(Glauco::Framework) && Glauco::Framework.maybe_build_msi_installer!(component: component)

    ensure_frontend_runtime!
    component.parent_renderer = $root if component.respond_to?(:parent_renderer=)
    $root.root_component = component
    $root.render
    Frontend.apply_window_title(title) if title
    apply_window_size(width, height) if width && height
    start!
  end
  
  def self.run_loop
		ensure_frontend_runtime!
		while !$shell.disposed?
			$display.sleep unless $display.read_and_dispatch
		end
    $display.dispose
  end
  
  def self.embedded_browser_surface(id)
    $embedded_surfaces &&
      $embedded_surfaces[id.to_s]
  end

  def self.navigate_embedded_browser(
      element_id,
      url
    )
    id = element_id.to_s
    target = url.to_s.strip

    raise "URL vazia" if target.empty?

    on_ui_thread do
      config = embedded_browser_registry[id]

      raise(
        "embedded browser nao registrado: #{id}"
      ) unless config

      config[:runtime_url] = target
      config[:html] = nil
      config[:visible] = true

      surface = ensure_embedded_browser_surface!(id)

      # Força nova navegação, mesmo que o elemento
      # já tenha sido sincronizado anteriormente.
      surface.setData(
        "glauco_embedded_source",
        ""
      )

      sync_embedded_browser_surface(id)

      puts [
        "[EmbeddedBrowser]",
        id,
        "=>",
        surface.getUrl
      ].join(" ")

      true
    end
  end

  def self.evaluate_embedded_browser(id, javascript)
    on_ui_thread do
      surface = ensure_embedded_browser_surface!(id)
      surface.evaluate(javascript.to_s)
    end
  end

  def self.execute_embedded_browser(id, javascript)
    on_ui_thread do
      surface = ensure_embedded_browser_surface!(id)
      surface.execute(javascript.to_s)
    end
  end

  def self.reload_embedded_browser(id)
    on_ui_thread do
      surface = embedded_browser_surface(id)
      surface&.refresh
    end
  end

  def self.back_embedded_browser(id)
    on_ui_thread do
      surface = embedded_browser_surface(id)
      surface&.back
    end
  end

  def self.forward_embedded_browser(id)
    on_ui_thread do
      surface = embedded_browser_surface(id)
      surface&.forward
    end
  end

  def self.set_embedded_browser_visible(id, visible)
    on_ui_thread do
      config = embedded_browser_registry[id.to_s]
      return false unless config

      config[:visible] = visible == true

      if config[:visible]
        sync_embedded_browser_surface(id)
      else
        hide_embedded_browser(id)
      end

      true
    end
  end

end


# === GLAUCO MONOLITHIC WEBKIT/HMR/AGENTS BEGIN ===

# Esta seção permanece no mesmo arquivo glauco_asked_ruby.rb.
# Ela substitui, por redefinição Ruby, as partes frágeis declaradas acima.
#
# Decisões:
# - uma BrowserFunction nativa por Browser;
# - callbacks Ruby em workers, fora da UI thread GTK;
# - navegação do Browser embutido fora do callback de geometria;
# - HMR do código de aplicação sem recriar Display/Shell/Browser;
# - browser agent e SQL agent sem um segundo Display SWT.

require "thread"
require "set"

module Frontend
  @browser_dispatch_functions ||= {}
  @callback_queue ||= Queue.new
  @callback_workers ||= []
  @embedded_sync_pending ||= {}
  @active_embedded_browser_ids = nil
  @hmr_extra_paths ||= Set.new

  class << self
    # -------------------------------------------------------
    # SWT thread
    # -------------------------------------------------------
    def swt_display
      return nil unless defined?($display)
      return nil unless $display
      return nil if $display.isDisposed

      $display
    rescue StandardError
      nil
    end

    def swt_ui_thread?
      display = swt_display
      return false unless display

      Display.getCurrent == display
    rescue StandardError
      false
    end

    def assert_ui_thread!
      display = swt_display
      raise "SWT Display não inicializado" unless display
      return true if swt_ui_thread?

      current =
        Java::JavaLang::Thread.currentThread

      expected = display.getThread

      raise(
        "Operação SWT fora da UI thread: " \
        "current=#{current.getName} " \
        "expected=#{expected.getName}"
      )
    end

    # -------------------------------------------------------
    # Callback dispatch
    # -------------------------------------------------------
    def invoke_callback(callback, value = nil)
      raise "callback não encontrado" unless callback

      arity =
        if callback.respond_to?(:arity)
          callback.arity
        else
          1
        end

      if arity == 0
        callback.call
      else
        callback.call(value)
      end
    end

    def callback_worker_count
      requested =
        ENV.fetch(
          "GLAUCO_CALLBACK_WORKERS",
          "2"
        ).to_i

      [[requested, 1].max, 8].min
    end

    def ensure_callback_workers!
      @callback_queue ||= Queue.new
      @callback_workers ||= []

      @callback_workers.select!(&:alive?)

      missing =
        callback_worker_count -
        @callback_workers.length

      missing.times do |index|
        worker = Thread.new do
          begin
            Thread.current.name =
              "glauco-callback-#{index}"
          rescue StandardError
            nil
          end

          loop do
            item = @callback_queue.pop
            break if item == :__glauco_stop__

            callback_name, value = item
            callback =
              $callbacks &&
              $callbacks[callback_name.to_s]

            next unless callback

            begin
              invoke_callback(callback, value)
            rescue StandardError => e
              warn(
                "[Glauco/Callback] " \
                "#{callback_name}: " \
                "#{e.class} - #{e.message}"
              )

              if ENV["GLAUCO_DEBUG"] == "1"
                warn(
                  e.backtrace
                    .first(15)
                    .join("\n")
                )
              end
            end
          end
        end

        @callback_workers << worker
      end

      @callback_workers
    end

    def enqueue_callback(callback_name, value = nil)
      ensure_callback_workers!

      @callback_queue << [
        callback_name.to_s,
        value
      ]

      true
    end

    # Uma única BrowserFunction por Browser.
    #
    # O código antigo criava uma BrowserFunction por evento e por render.
    # Isso acumulava objetos nativos WebKit/GObject durante HMR e rerender.
    def install_browser_dispatch!(browser)
      raise "Browser inválido" unless browser
      raise "Browser descartado" if browser.isDisposed

      @browser_dispatch_functions ||= {}
      key = browser.object_id
      current = @browser_dispatch_functions[key]

      if current && !current.isDisposed
        return current
      end

      function_class =
        Class.new(
          Java::OrgEclipseSwtBrowser::BrowserFunction
        ) do
          define_method(:function) do |*raw_args|
            values =
              if raw_args.length == 1 &&
                 raw_args.first.is_a?(
                   Java::JavaLang::Object[]
                 )
                raw_args.first.to_a
              else
                raw_args
              end

            callback_name =
              values[0].to_s

            value =
              values.length > 1 ?
                values[1] :
                nil

            Frontend.enqueue_callback(
              callback_name,
              value
            )

            nil
          rescue StandardError => e
            warn(
              "[Glauco/BrowserDispatch] " \
              "#{e.class} - #{e.message}"
            )
            nil
          end
        end

      function =
        function_class.new(
          browser,
          "__glaucoDispatch"
        )

      @browser_dispatch_functions[key] =
        function

      # Mantém referência forte enquanto o Browser existir.
      browser.setData(
        "glauco_browser_dispatch",
        function
      )

      browser.addListener(SWT::Dispose) do |_event|
        @browser_dispatch_functions.delete(key)
        # O SWT descarta BrowserFunction junto com Browser.
        # Não chamamos dispose durante o evento de dispose
        # para evitar reentrada no backend GTK/WebKit.
      end

      function
    end

    # Compatibilidade com chamadas existentes.
    def browserFunctionFac(
      browser,
      _callback_name = nil
    )
      install_browser_dispatch!(browser)
    end

    def callback_bridge_script
      <<~HTML
        <script>
          (() => {
            if (window.__glaucoInvokeInstalled) return;
            window.__glaucoInvokeInstalled = true;

            window.__glaucoInvoke =
              async function(
                callbackName,
                value,
                event
              ) {
                if (event) {
                  event.preventDefault();
                  event.stopPropagation();
                }

                if (
                  typeof window.__glaucoDispatch ===
                  "function"
                ) {
                  window.__glaucoDispatch(
                    callbackName,
                    value
                  );

                  return false;
                }

                const response = await fetch(
                  "/__glauco/callback",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        "application/json"
                    },
                    body: JSON.stringify({
                      callback: callbackName,
                      value
                    })
                  }
                );

                const result =
                  await response
                    .json()
                    .catch(() => ({}));

                if (
                  !response.ok ||
                  result.ok === false
                ) {
                  throw new Error(
                    result.error ||
                    "Falha no callback Glauco"
                  );
                }

                return false;
              };
          })();
        </script>
      HTML
    end

    def install_safe_callback_route!(server)
      return false unless server

      begin
        server.unmount(
          "/__glauco/callback"
        )
      rescue StandardError
        nil
      end

      server.mount_proc(
        "/__glauco/callback"
      ) do |req, res|
        res["Content-Type"] =
          "application/json"

        begin
          payload =
            JSON.parse(req.body.to_s)

          callback_name =
            payload["callback"].to_s

          value = payload["value"]

          callback =
            $callbacks &&
            $callbacks[callback_name]

          raise(
            "Callback não encontrado: " \
            "#{callback_name}"
          ) unless callback

          # A requisição WEBrick já está fora da UI thread.
          invoke_callback(callback, value)

          res.body = JSON.generate(
            ok: true,
            reload: false
          )
        rescue StandardError => e
          res.status = 500

          res.body = JSON.generate(
            ok: false,
            error: "#{e.class}: #{e.message}"
          )
        end
      end

      true
    end

    alias_method(
      :__glauco_original_mount_served_page_routes,
      :mount_served_page_routes
    ) unless method_defined?(
      :__glauco_original_mount_served_page_routes
    )

    def mount_served_page_routes(server)
      __glauco_original_mount_served_page_routes(
        server
      )

      install_safe_callback_route!(server)
    end

    # -------------------------------------------------------
    # Render-cycle registries
    # -------------------------------------------------------
    def begin_native_render_cycle!
      @active_embedded_browser_ids = Set.new
    end

    def finish_native_render_cycle!
      active =
        @active_embedded_browser_ids ||
        Set.new

      stale =
        embedded_browser_registry.keys -
        active.to_a

      stale.each do |element_id|
        dispose_embedded_browser(element_id)
        embedded_browser_registry.delete(
          element_id
        )
      end

      @active_embedded_browser_ids = nil
      true
    end

    def abort_native_render_cycle!
      @active_embedded_browser_ids = nil
    end

    def register_embedded_browser(id, config)
      key = id.to_s
      previous =
        embedded_browser_registry[key] ||
        {}

      runtime_url =
        previous[:runtime_url]

      visual_bounds =
        previous[:visual_bounds]

      current = previous.merge(config)

      current[:runtime_url] =
        runtime_url if runtime_url

      current[:visual_bounds] =
        visual_bounds if visual_bounds

      embedded_browser_registry[key] =
        current

      @active_embedded_browser_ids <<
        key if @active_embedded_browser_ids

      current
    end

    # -------------------------------------------------------
    # Geometry bridge without polling
    # -------------------------------------------------------
    def geometry_bridge_script(
      key:,
      selector:,
      callback_attribute:
    )
      <<~HTML
        <script>
          (() => {
            const bridgeKey = #{key.to_json};
            const selector = #{selector.to_json};
            const callbackAttribute =
              #{callback_attribute.to_json};

            window.__glaucoGeometryBridges =
              window.__glaucoGeometryBridges ||
              {};

            if (
              window.__glaucoGeometryBridges[
                bridgeKey
              ]
            ) return;

            const state = {
              previous: new Map(),
              observed: new WeakSet(),
              scheduled: false
            };

            const send = (node) => {
              const callbackName =
                node.getAttribute(
                  callbackAttribute
                );

              if (!callbackName) return;

              const rect =
                node.getBoundingClientRect();

              const payload = {
                id: node.id,
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height:
                  Math.round(rect.height)
              };

              const serialized =
                JSON.stringify(payload);

              if (
                state.previous.get(node.id) ===
                serialized
              ) return;

              state.previous.set(
                node.id,
                serialized
              );

              if (
                typeof window.__glaucoDispatch ===
                "function"
              ) {
                window.__glaucoDispatch(
                  callbackName,
                  serialized
                );
              } else if (
                typeof window.__glaucoInvoke ===
                "function"
              ) {
                window.__glaucoInvoke(
                  callbackName,
                  serialized,
                  null
                );
              }
            };

            const collect = () => {
              state.scheduled = false;

              document
                .querySelectorAll(selector)
                .forEach((node) => {
                  send(node);

                  if (
                    resizeObserver &&
                    !state.observed.has(node)
                  ) {
                    state.observed.add(node);
                    resizeObserver.observe(node);
                  }
                });
            };

            const schedule = () => {
              if (state.scheduled) return;

              state.scheduled = true;
              requestAnimationFrame(collect);
            };

            const resizeObserver =
              window.ResizeObserver ?
                new ResizeObserver(schedule) :
                null;

            const mutationObserver =
              new MutationObserver(schedule);

            mutationObserver.observe(
              document.documentElement,
              {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                  "style",
                  "class",
                  "hidden"
                ]
              }
            );

            window.addEventListener(
              "load",
              schedule,
              { once: true }
            );

            window.addEventListener(
              "resize",
              schedule
            );

            window.addEventListener(
              "scroll",
              schedule,
              true
            );

            window.__glaucoGeometryBridges[
              bridgeKey
            ] = {
              schedule,
              resizeObserver,
              mutationObserver
            };

            schedule();
          })();
        </script>
      HTML
    end

    def overlay_bridge_script
      geometry_bridge_script(
        key: "overlay",
        selector:
          '[data-overlay-host="true"]',
        callback_attribute:
          "data-overlay-geometry-callback"
      )
    end

    def embedded_browser_bridge_script
      geometry_bridge_script(
        key: "embedded-browser",
        selector:
          '[data-embedded-browser-host="true"]',
        callback_attribute:
          "data-embedded-browser-geometry-callback"
      )
    end

    def register_overlay_geometry_callback(
      browser,
      element_id
    )
      safe_id =
        element_id
          .to_s
          .gsub(
            /[^A-Za-z0-9_$]/,
            "_"
          )

      callback_name =
        "overlay_geom_#{safe_id}"

      $callbacks[callback_name] =
        proc do |payload|
          begin
            data =
              payload.is_a?(String) ?
                JSON.parse(payload) :
                payload

            update_overlay_geometry(data)
          rescue StandardError => e
            warn(
              "[Overlay] geometry " \
              "#{element_id}: " \
              "#{e.class} - #{e.message}"
            )
          end
        end

      install_browser_dispatch!(browser)
      callback_name
    end

    def register_embedded_browser_geometry_callback(
      browser,
      element_id
    )
      safe_id =
        element_id
          .to_s
          .gsub(
            /[^A-Za-z0-9_$]/,
            "_"
          )

      callback_name =
        "embedded_geom_#{safe_id}"

      $callbacks[callback_name] =
        proc do |payload|
          begin
            data =
              payload.is_a?(String) ?
                JSON.parse(payload) :
                payload

            update_embedded_browser_geometry(
              data
            )
          rescue StandardError => e
            warn(
              "[EmbeddedBrowser] geometry " \
              "#{element_id}: " \
              "#{e.class} - #{e.message}"
            )
          end
        end

      install_browser_dispatch!(browser)
      callback_name
    end

    def update_embedded_browser_geometry(data)
      return false unless data.respond_to?(:[])

      element_id = data["id"].to_s
      config =
        embedded_browser_registry[
          element_id
        ]

      return false unless config

      bounds = {
        x: data["x"].to_i,
        y: data["y"].to_i,
        width: data["width"].to_i,
        height: data["height"].to_i
      }

      return true if config[:visual_bounds] ==
                     bounds

      config[:visual_bounds] = bounds

      schedule_embedded_browser_sync(
        element_id
      )
    end

    def schedule_embedded_browser_sync(
      element_id
    )
      display = swt_display
      return false unless display

      @embedded_sync_pending ||= {}
      id = element_id.to_s

      return true if @embedded_sync_pending[id]

      @embedded_sync_pending[id] = true

      display.asyncExec do
        @embedded_sync_pending[id] = false

        begin
          next if display.isDisposed

          sync_embedded_browser_surface(id)
        rescue StandardError => e
          warn(
            "[EmbeddedBrowser] sync #{id}: " \
            "#{e.class} - #{e.message}"
          )
        end
      end

      true
    end

    # -------------------------------------------------------
    # Embedded Browser lifecycle
    # -------------------------------------------------------
    def ensure_embedded_browser_surface!(
      element_id
    )
      id = element_id.to_s
      config =
        embedded_browser_registry[id]

      raise(
        "embedded browser não registrado: " \
        "#{id}"
      ) unless config

      parent =
        if defined?($surface_parent)
          $surface_parent
        end

      unless parent && !parent.isDisposed
        raise(
          "surface parent composite " \
          "não inicializado"
        )
      end

      assert_ui_thread!

      $embedded_surfaces ||= {}

      surface =
        $embedded_surfaces[id]

      if surface && !surface.isDisposed
        return surface
      end

      surface =
        Browser.new(
          parent,
          SWT::NONE
        )

      surface.setVisible(false)
      surface.moveAbove(nil)

      surface.setData(
        "glauco_embedded_id",
        id
      )

      surface.setData(
        "glauco_loaded_source",
        ""
      )

      surface.setData(
        "glauco_pending_source",
        ""
      )

      surface.setData(
        "glauco_navigation_token",
        0
      )

      if ENV["GLAUCO_BROWSER_TRACE"] == "1"
        listener_class =
          Class.new(LocationAdapter) do
            define_method(:changing) do |event|
              puts(
                "[EmbeddedBrowser/#{id}] " \
                "changing #{event.location}"
              )
            end

            define_method(:changed) do |event|
              puts(
                "[EmbeddedBrowser/#{id}] " \
                "changed #{event.location}"
              )
            end
          end

        listener = listener_class.new

        surface.addLocationListener(
          listener
        )

        surface.setData(
          "glauco_location_listener",
          listener
        )
      end

      surface.addListener(SWT::Dispose) do |_event|
        if defined?($embedded_surfaces)
          $embedded_surfaces.delete(id)
        end
      end

      $embedded_surfaces[id] = surface
      surface
    end

    def embedded_browser_source(config)
      if config[:html]
        html = config[:html].to_s

        {
          kind: :html,
          value: html,
          key:
            "html:" \
            "#{Zlib.crc32(html)}:" \
            "#{html.bytesize}"
        }
      else
        url =
          (
            config[:runtime_url] ||
            config[:url]
          ).to_s.strip

        return nil if url.empty?

        {
          kind: :url,
          value: url,
          key: "url:#{url}"
        }
      end
    end

    def schedule_embedded_browser_source!(
      element_id,
      surface
    )
      id = element_id.to_s
      config =
        embedded_browser_registry[id]

      return false unless config
      return false unless surface
      return false if surface.isDisposed

      source =
        embedded_browser_source(config)

      return false unless source

      loaded =
        surface
          .getData(
            "glauco_loaded_source"
          )
          .to_s

      pending =
        surface
          .getData(
            "glauco_pending_source"
          )
          .to_s

      return true if loaded == source[:key]
      return true if pending == source[:key]

      token =
        surface
          .getData(
            "glauco_navigation_token"
          )
          .to_i + 1

      surface.setData(
        "glauco_navigation_token",
        token
      )

      surface.setData(
        "glauco_pending_source",
        source[:key]
      )

      display = surface.getDisplay

      # Entrega o controle ao GTK antes de iniciar
      # uma navegação no WebKit secundário.
      display.timerExec(16) do
        begin
          next if display.isDisposed
          next if surface.isDisposed

          current_token =
            surface
              .getData(
                "glauco_navigation_token"
              )
              .to_i

          next unless current_token == token

          current_config =
            embedded_browser_registry[id]

          next unless current_config

          current_source =
            embedded_browser_source(
              current_config
            )

          next unless current_source
          next unless current_source[:key] ==
                      source[:key]

          accepted =
            if source[:kind] == :html
              surface.setText(
                source[:value]
              )
            else
              surface.setUrl(
                source[:value]
              )
            end

          if accepted
            surface.setData(
              "glauco_loaded_source",
              source[:key]
            )

            if ENV["GLAUCO_BROWSER_TRACE"] == "1"
              puts(
                "[EmbeddedBrowser/#{id}] " \
                "load #{source[:value]}"
              )
            end
          else
            warn(
              "[EmbeddedBrowser/#{id}] " \
              "fonte recusada: " \
              "#{source[:key]}"
            )
          end
        rescue StandardError => e
          warn(
            "[EmbeddedBrowser/#{id}] " \
            "source: " \
            "#{e.class} - #{e.message}"
          )
        ensure
          unless surface.isDisposed
            current_token =
              surface
                .getData(
                  "glauco_navigation_token"
                )
                .to_i

            if current_token == token
              surface.setData(
                "glauco_pending_source",
                ""
              )
            end
          end
        end
      end

      true
    end

    def sync_embedded_browser_surface(
      element_id,
      fallback_bounds = nil
    )
      assert_ui_thread!

      id = element_id.to_s
      config =
        embedded_browser_registry[id]

      return false unless config

      unless config.fetch(:visible, true)
        hide_embedded_browser(id)
        return true
      end

      host_bounds =
        config[:visual_bounds] ||
        fallback_bounds ||
        config[:bounds]

      return false unless host_bounds

      resolved =
        resolve_embedded_browser_bounds(
          host_bounds
        )

      surface =
        ensure_embedded_browser_surface!(id)

      bounds_key = [
        resolved[:x],
        resolved[:y],
        resolved[:width],
        resolved[:height]
      ].join(":")

      previous_key =
        surface
          .getData(
            "glauco_bounds_key"
          )
          .to_s

      if previous_key != bounds_key
        surface.setBounds(
          resolved[:x],
          resolved[:y],
          resolved[:width],
          resolved[:height]
        )

        surface.setData(
          "glauco_bounds_key",
          bounds_key
        )
      end

      unless surface.getVisible
        surface.setVisible(true)
      end

      schedule_embedded_browser_source!(
        id,
        surface
      )

      true
    end

    def show_embedded_browser(element_id)
      on_ui_thread do
        id = element_id.to_s
        config =
          embedded_browser_registry[id]

        next false unless config

        config[:visible] = true

        sync_embedded_browser_surface(
          id,
          config[:visual_bounds] ||
            config[:bounds]
        )
      end
    end

    def navigate_embedded_browser(
      element_id,
      url
    )
      id = element_id.to_s
      target = url.to_s.strip

      raise "URL vazia" if target.empty?

      on_ui_thread do
        config =
          embedded_browser_registry[id]

        raise(
          "embedded browser não registrado: " \
          "#{id}"
        ) unless config

        config[:runtime_url] = target
        config[:url] = target
        config[:html] = nil
        config[:visible] = true

        surface =
          ensure_embedded_browser_surface!(id)

        surface.setData(
          "glauco_loaded_source",
          ""
        )

        surface.setData(
          "glauco_pending_source",
          ""
        )

        schedule_embedded_browser_source!(
          id,
          surface
        )

        true
      end
    end

    def sync_frontend_layout!
      return false unless defined?($surface_parent)
      return false unless $surface_parent
      return false if $surface_parent.isDisposed
      return false unless defined?($browser)
      return false unless $browser
      return false if $browser.isDisposed

      assert_ui_thread!

      area =
        $surface_parent.getClientArea

      main_key =
        "0:0:#{area.width}:#{area.height}"

      previous_key =
        $browser
          .getData(
            "glauco_bounds_key"
          )
          .to_s

      if previous_key != main_key
        $browser.setBounds(
          0,
          0,
          area.width,
          area.height
        )

        $browser.setData(
          "glauco_bounds_key",
          main_key
        )
      end

      embedded_browser_registry.each_key do |id|
        sync_embedded_browser_surface(id)
      end

      true
    end

    # -------------------------------------------------------
    # HMR
    # -------------------------------------------------------
    def hmr_enabled?
      ENV.fetch(
        "GLAUCO_HMR",
        "1"
      ).to_s != "0"
    end

    def hmr_reloading?
      @hmr_reloading == true
    end

    def register_hmr_path(path)
      @hmr_extra_paths ||= Set.new
      @hmr_extra_paths <<
        File.expand_path(path.to_s)

      path
    end

    def hmr_entry_file
      @hmr_entry_file ||=
        File.expand_path($0.to_s)
    end

    def hmr_watch_paths
      entry = hmr_entry_file
      app_dir = File.dirname(entry)

      paths =
        Dir.glob(
          File.join(
            app_dir,
            "**",
            "*.rb"
          )
        )

      extra =
        Array(@hmr_extra_paths).flat_map do |path|
          if File.directory?(path)
            Dir.glob(
              File.join(
                path,
                "**",
                "*.rb"
              )
            )
          else
            path
          end
        end

      env_paths =
        ENV.fetch(
          "GLAUCO_HMR_PATHS",
          ""
        )
          .split(
            File::PATH_SEPARATOR
          )
          .reject(&:empty?)
          .flat_map do |path|
            expanded =
              File.expand_path(path)

            if File.directory?(expanded)
              Dir.glob(
                File.join(
                  expanded,
                  "**",
                  "*.rb"
                )
              )
            else
              expanded
            end
          end

      (paths + extra + env_paths)
        .map { |path| File.expand_path(path) }
        .select { |path| File.file?(path) }
        .reject do |path|
          path.include?("/vendor/") ||
            path.include?("/node_modules/") ||
            path.end_with?(".bak")
        end
        .uniq
        .sort
    end

    def hmr_snapshot(paths = hmr_watch_paths)
      paths.to_h do |path|
        mtime =
          if File.exist?(path)
            File.mtime(path).to_f
          else
            0.0
          end

        [path, mtime]
      end
    end

    def schedule_hmr_reload!(changed_files)
      display = swt_display
      return false unless display

      @hmr_generation =
        @hmr_generation.to_i + 1

      generation = @hmr_generation

      display.asyncExec do
        next if display.isDisposed

        display.timerExec(120) do
          next if display.isDisposed
          next unless @hmr_generation ==
                      generation

          perform_hmr_reload!(
            changed_files
          )
        end
      end

      true
    end

    def perform_hmr_reload!(changed_files)
      return false if hmr_reloading?

      assert_ui_thread!

      files =
        Array(changed_files)
          .map { |path| File.expand_path(path) }
          .select { |path| File.file?(path) }
          .uniq

      entry = hmr_entry_file
      dependencies =
        files.reject { |path| path == entry }

      @hmr_reloading = true
      @hmr_changed_files = files

      previous_component =
        if defined?($root) && $root
          $root.root_component
        end

      dependencies.each do |path|
        load path
      end

      load entry

      current_component =
        if defined?($root) && $root
          $root.root_component
        end

      # Caso o entrypoint apenas defina classes e não chame run,
      # renderizamos novamente o componente existente.
      if current_component.equal?(
        previous_component
      ) && defined?($root) && $root
        $root.render
      end

      puts(
        "[HMR] aplicado: " \
        "#{files.map { |p| File.basename(p) }.join(', ')}"
      )

      true
    rescue SyntaxError, StandardError => e
      warn(
        "[HMR] falha: " \
        "#{e.class} - #{e.message}"
      )

      if ENV["GLAUCO_DEBUG"] == "1"
        warn(
          e.backtrace
            .first(20)
            .join("\n")
        )
      end

      false
    ensure
      @hmr_reloading = false
      @hmr_changed_files = nil
    end

    def ensure_hmr_watcher!
      return false unless hmr_enabled?

      if @hmr_thread && @hmr_thread.alive?
        return @hmr_thread
      end

      watch_paths = hmr_watch_paths
      mtimes = hmr_snapshot(watch_paths)

      @hmr_thread = Thread.new do
        begin
          Thread.current.name =
            "glauco-hmr"
        rescue StandardError
          nil
        end

        loop do
          sleep(
            ENV.fetch(
              "GLAUCO_HMR_INTERVAL",
              "0.35"
            ).to_f
          )

          latest_paths =
            hmr_watch_paths

          latest_mtimes =
            hmr_snapshot(latest_paths)

          all_paths =
            (
              watch_paths +
              latest_paths
            ).uniq

          changed =
            all_paths.select do |path|
              mtimes[path] !=
                latest_mtimes[path]
            end

          watch_paths = latest_paths
          mtimes = latest_mtimes

          next if changed.empty?

          schedule_hmr_reload!(changed)
        end
      end

      @hmr_thread
    end

    def apply_hmr_component!(
      component,
      title: nil
    )
      assert_ui_thread!

      raise(
        "RootRenderer não inicializado"
      ) unless defined?($root) && $root

      component.parent_renderer =
        $root if component.respond_to?(
          :parent_renderer=
        )

      $root.root_component = component
      $root.render

      apply_window_title(title) if title

      component
    end
  end
end

# O servidor principal já foi montado antes desta seção.
Frontend.install_safe_callback_route!(
  Frontend.server
) if Frontend.respond_to?(:server)

module Frontend
  class RootRenderer
    unless method_defined?(
      :__glauco_monolith_original_render
    )
      alias_method(
        :__glauco_monolith_original_render,
        :render
      )
    end

    def register_callback(proc_obj)
      @callback_sequence =
        @callback_sequence.to_i + 1

      @active_callback_names ||=
        Set.new

      callback_name =
        "callback_" \
        "#{object_id}_" \
        "#{@callback_sequence}"

      @active_callback_names <<
        callback_name

      $callbacks[callback_name] =
        proc_obj

      Frontend.install_browser_dispatch!(
        @browser
      )

      callback_name
    end

    def render
      previous =
        @registered_callback_names ||
        Set.new

      @callback_sequence = 0
      @active_callback_names = Set.new
      success = false

      Frontend.begin_native_render_cycle!

      result =
        __glauco_monolith_original_render

      success = true

      stale =
        previous -
        @active_callback_names

      stale.each do |callback_name|
        $callbacks.delete(callback_name)
      end

      @registered_callback_names =
        @active_callback_names

      Frontend.finish_native_render_cycle!
      result
    ensure
      Frontend.abort_native_render_cycle! unless success
    end
  end
end

module Frontend
  class Component
    unless method_defined?(
      :__glauco_monolith_original_set_state
    )
      alias_method(
        :__glauco_monolith_original_set_state,
        :set_state
      )
    end

    unless method_defined?(
      :__glauco_monolith_original_notify_bindings
    )
      alias_method(
        :__glauco_monolith_original_notify_bindings,
        :notify_bindings
      )
    end

    unless method_defined?(
      :__glauco_monolith_original_run
    )
      alias_method(
        :__glauco_monolith_original_run,
        :run
      )
    end

    def set_state(
      path,
      new_value,
      replace: false
    )
      unless Frontend.swt_ui_thread?
        return run_on_swt_thread do
          __glauco_monolith_original_set_state(
            path,
            new_value,
            replace: replace
          )
        end
      end

      __glauco_monolith_original_set_state(
        path,
        new_value,
        replace: replace
      )
    end

    def notify_bindings(path)
      unless Frontend.swt_ui_thread?
        return run_on_swt_thread do
          __glauco_monolith_original_notify_bindings(
            path
          )
        end
      end

      __glauco_monolith_original_notify_bindings(
        path
      )
    end

    def async(&block)
      display = Frontend.swt_display

      raise(
        "SWT Display não inicializado"
      ) unless display

      display.asyncExec do
        begin
          block.call unless display.isDisposed
        rescue StandardError => e
          warn(
            "[Glauco/AsyncUI] " \
            "#{e.class} - #{e.message}"
          )
        end
      end
    end

    def run(
      title: nil,
      width: nil,
      height: nil,
      root_component: nil
    )
      if Frontend.hmr_reloading?
        component =
          root_component ||
          self

        return Frontend.apply_hmr_component!(
          component,
          title: title
        )
      end

      __glauco_monolith_original_run(
        title: title,
        width: width,
        height: height,
        root_component: root_component
      )
    end

    private

    def run_on_swt_thread(&block)
      display = Frontend.swt_display

      return block.call unless display

      if Frontend.swt_ui_thread?
        return block.call
      end

      display.asyncExec do
        begin
          block.call unless display.isDisposed
        rescue StandardError => e
          warn(
            "[Glauco/UI] " \
            "#{e.class} - #{e.message}"
          )

          if ENV["GLAUCO_DEBUG"] == "1"
            warn(
              e.backtrace
                .first(15)
                .join("\n")
            )
          end
        end
      end
    end
  end
end

module Frontend
  class << self
    unless method_defined?(
      :__glauco_monolith_original_start
    )
      alias_method(
        :__glauco_monolith_original_start,
        :start
      )
    end

    def start(
      component,
      title: nil,
      width: nil,
      height: nil
    )
      if hmr_reloading?
        return apply_hmr_component!(
          component,
          title: title
        )
      end

      __glauco_monolith_original_start(
        component,
        title: title,
        width: width,
        height: height
      )
    end
end
end

module Glauco
  Framework = Backend unless const_defined?(:Framework, false)
end

# ---------------------------------------------------------
# Domain agents
# ---------------------------------------------------------
module Glauco
  module Backend
    module Agents
      class BrowserRuntime
        def initialize(target: :main)
          @target = target
        end

        def browser
          case @target
          when :main
            defined?($browser) ?
              $browser :
              nil
          else
            Frontend.embedded_browser_surface(
              @target.to_s
            )
          end
        end

        def browser_ready?(*)
          current = browser

          !!(
            current &&
            !current.isDisposed
          )
        rescue StandardError
          false
        end

        def open_url(url)
          target = url.to_s.strip
          raise "URL vazia" if target.empty?

          if @target == :main
            Frontend.on_ui_thread do
              current = browser

              unless current &&
                     !current.isDisposed
                raise(
                  "Browser principal " \
                  "indisponível"
                )
              end

              current.setUrl(target)
            end
          else
            Frontend.navigate_embedded_browser(
              @target.to_s,
              target
            )
          end

          "opened #{target}"
        end

        def current_url(*)
          Frontend.on_ui_thread do
            current = browser

            unless current &&
                   !current.isDisposed
              raise "Browser indisponível"
            end

            current.getUrl.to_s
          end
        end

        def eval_js(js)
          Frontend.on_ui_thread do
            current = browser

            unless current &&
                   !current.isDisposed
              raise "Browser indisponível"
            end

            current.evaluate(js.to_s)
          end
        end

        def execute_js(js)
          Frontend.on_ui_thread do
            current = browser

            unless current &&
                   !current.isDisposed
              raise "Browser indisponível"
            end

            current.execute(js.to_s)
          end
        end

        def read_html(*)
          eval_js(
            "return " \
            "document.documentElement.outerHTML;"
          )
        end

        def page_title(*)
          eval_js(
            "return document.title;"
          )
        end

        def reload(*)
          Frontend.on_ui_thread do
            current = browser
            raise "Browser indisponível" unless current
            current.refresh
          end
        end

        def back(*)
          Frontend.on_ui_thread do
            current = browser
            raise "Browser indisponível" unless current
            current.back
          end
        end

        def forward(*)
          Frontend.on_ui_thread do
            current = browser
            raise "Browser indisponível" unless current
            current.forward
          end
        end

        def list_frames(*)
          raw = eval_js(<<~JS)
            return JSON.stringify((() => {
              const frames = [];

              for (
                let index = 0;
                index < window.frames.length;
                index += 1
              ) {
                const frame =
                  window.frames[index];

                try {
                  frames.push({
                    index,
                    name:
                      frame.name || null,
                    location:
                      frame.location.href,
                    accessible: true
                  });
                } catch (error) {
                  frames.push({
                    index,
                    name: null,
                    location: null,
                    accessible: false,
                    error: String(error)
                  });
                }
              }

              return {
                count: frames.length,
                frames
              };
            })());
          JS

          JSON.parse(raw.to_s)
        rescue JSON::ParserError
          {
            "count" => 0,
            "frames" => [],
            "raw" => raw.to_s
          }
        end
      end

      class DelegationRuntime
        attr_reader(
          :browser_agent,
          :sql_agent,
          :base_runtime
        )

        def initialize(
          browser_agent:,
          sql_agent:,
          base_runtime: nil
        )
          @browser_agent = browser_agent
          @sql_agent = sql_agent
          @base_runtime = base_runtime
        end

        def ask_browser(question)
          browser_agent.call(
            question.to_s
          )
        end

        def ask_sql(question)
          sql_agent.call(
            question.to_s
          )
        end

        def route_agent(
          question,
          domain: nil
        )
          resolved =
            domain&.to_sym ||
            classify_domain(question)

          case resolved
          when :browser
            ask_browser(question)
          when :sql
            ask_sql(question)
          else
            raise(
              "Domínio ambíguo. Use " \
              "domain: :browser ou :sql."
            )
          end
        end

        def classify_domain(question)
          text =
            question
              .to_s
              .downcase

          browser_terms = %w[
            browser navegador webview webkit
            swt dom javascript página pagina
            url frame iframe reload navegar
            cookie localstorage github
          ]

          sql_terms = %w[
            sql sqlite banco database tabela
            table query select insert update
            delete migration migrate schema
            jdbc activerecord active_record
          ]

          browser_score =
            browser_terms.count do |term|
              text.include?(term)
            end

          sql_score =
            sql_terms.count do |term|
              text.include?(term)
            end

          return :browser if browser_score >
                             sql_score

          return :sql if sql_score >
                         browser_score

          nil
        end

        def public_methods(
          include_super = true
        )
          return super(include_super) if include_super

          own = %i[
            ask_browser
            ask_sql
            route_agent
            classify_domain
          ]

          inherited =
            if base_runtime
              base_runtime.public_methods(
                false
              )
            else
              []
            end

          (own + inherited)
            .map(&:to_sym)
            .uniq
        end

        def respond_to_missing?(
          name,
          include_private = false
        )
          (
            base_runtime &&
            base_runtime.respond_to?(
              name,
              include_private
            )
          ) || super
        end

        def method_missing(
          name,
          *args,
          **kwargs,
          &block
        )
          if base_runtime &&
             base_runtime.respond_to?(name)
            return base_runtime.public_send(
              name,
              *args,
              **kwargs,
              &block
            )
          end

          super
        end
      end

      module Factory
        module_function

        def build_browser_agent(
          target: :main,
          endpoint:
            GlaucoBasicPlasticAgent::
              DEFAULT_ENDPOINT,
          model:
            GlaucoBasicPlasticAgent::
              DEFAULT_MODEL
        )
          runtime =
            BrowserRuntime.new(
              target: target
            )

          agent =
            GlaucoBasicPlasticAgent.new(
              endpoint: endpoint,
              model: model
            )

          agent.build_agent(
            initial_vars: {
              "agent_domain" => "browser",
              "system_config" => <<~PROMPT
                Você é o browser agent.
                Resolva somente navegação, DOM,
                JavaScript, frames e estado da página.
                Use as funções do BrowserRuntime.
                Não execute SQL.
              PROMPT
            },
            runtime: runtime
          )

          agent
        end

        def build_sql_agent(
          database_path:,
          schema: [],
          seed: nil,
          endpoint:
            GlaucoBasicPlasticAgent::
              DEFAULT_ENDPOINT,
          model:
            GlaucoBasicPlasticAgent::
              DEFAULT_MODEL
        )
          runtime =
            SqlAgentRuntime.new(
              database_path:
                database_path,
              schema: schema,
              seed: seed
            )

          agent =
            GlaucoBasicPlasticAgent.new(
              endpoint: endpoint,
              model: model
            )

          agent.build_agent(
            initial_vars: {
              "agent_domain" => "sql",
              "system_config" => <<~PROMPT
                Você é o SQL agent.
                Resolva somente schema, migrações,
                consultas parametrizadas e
                manutenção do banco.
                Use db_init, db_query, db_execute,
                db_maintain, db_seed_company e
                db_company_snapshot.
                Não opere o navegador.
              PROMPT
            },
            runtime: runtime
          )

          agent
        end

        def attach_delegation(
          main_agent:,
          browser_agent:,
          sql_agent:
        )
          previous_runtime =
            if main_agent.respond_to?(
              :rlm_runtime
            )
              main_agent.rlm_runtime
            else
              main_agent.instance_variable_get(
                :@runtime
              )
            end

          runtime =
            DelegationRuntime.new(
              browser_agent:
                browser_agent,
              sql_agent:
                sql_agent,
              base_runtime:
                previous_runtime
            )

          main_agent.attach_runtime(runtime)

          main_agent.vars[
            "delegation_policy"
          ] = <<~POLICY
            Questões de navegador:
            ask_browser(%q{...})

            Questões de SQL:
            ask_sql(%q{...})

            Roteamento explícito:
            route_agent(
              %q{...},
              domain: :browser
            )

            Não misture operações SWT e JDBC
            no mesmo passo.
          POLICY

          runtime
        end
      end
    end
  end
end

class GlaucoBasicPlasticAgent
  def assign_domain_agents(
    browser:,
    sql:
  )
    Glauco::Framework::Agents::
      Factory.attach_delegation(
        main_agent: self,
        browser_agent: browser,
        sql_agent: sql
      )

    self
  end

  def rlm
    self
  end

  def rlm_runtime
    @runtime
  end

  def get(key)
    vars[key.to_s]
  end

  def set(key, value)
    vars[key.to_s] = value
  end

  def conditions
    vars["rlm_conditions"] ||= {}
  end

  def call_fn(name, *args, **kwargs)
    raise "runtime not configured" unless @runtime

    @runtime.public_send(name.to_sym, *args, **kwargs)
  end
end

class GlaucoPlasticAgent < GlaucoBasicPlasticAgent
  RLM = ::Glauco::RLM unless const_defined?(:RLM, false)
end

# === GLAUCO MONOLITHIC WEBKIT/HMR/AGENTS END ===





# === GLAUCO FRONTEND CRASH REPORTER BEGIN ===

require "securerandom"
require "rbconfig"

module Frontend
  module CrashReporter
    extend self

    NATIVE_ERROR_PATTERN = Regexp.union(
      /GLib-GObject-CRITICAL/i,
      /g_signal_connect_data/i,
      /invalid \(NULL\) pointer/i,
      /WebKitWebProcess.*(?:crash|abort|segmentation)/i,
      /Segmentation fault/i,
      /SIGSEGV/i,
      /GStreamer element .* not found/i,
      /gst_element_factory_make.*failed/i,
      /SWTException/i
    ).freeze

    FATAL_NATIVE_PATTERN = Regexp.union(
      /GLib-GObject-CRITICAL/i,
      /g_signal_connect_data/i,
      /invalid \(NULL\) pointer/i,
      /Segmentation fault/i,
      /SIGSEGV/i
    ).freeze

    def enabled?
      ENV.fetch(
        "GLAUCO_CRASH_REPORTS",
        "1"
      ).to_s != "0"
    end

    def report_root
      @report_root ||=
        File.expand_path(
          ENV.fetch(
            "GLAUCO_CRASH_REPORT_DIR",
            File.join(
              PROJECT_ROOT,
              "log",
              "crash-reports"
            )
          )
        )
    end

    def run_id
      @run_id ||=
        [
          Time.now.utc.strftime(
            "%Y%m%dT%H%M%S"
          ),
          Process.pid,
          SecureRandom.hex(3)
        ].join("-")
    end

    def run_dir
      @run_dir ||=
        File.join(
          report_root,
          run_id
        )
    end

    def events_path
      File.join(
        run_dir,
        "events.jsonl"
      )
    end

    def stderr_path
      File.join(
        run_dir,
        "native-stderr.log"
      )
    end

    def environment_path
      File.join(
        run_dir,
        "environment.json"
      )
    end

    def status_path
      File.join(
        run_dir,
        "status.json"
      )
    end

    def mutex
      @mutex ||= Mutex.new
    end

    def ring_mutex
      @ring_mutex ||= Mutex.new
    end

    def recent_stderr
      @recent_stderr ||= []
    end

    def install!
      return false unless enabled?
      return true if @installed

      FileUtils.mkdir_p(run_dir)

      @started_at =
        Time.now.utc

      @monotonic_started_at =
        Process.clock_gettime(
          Process::CLOCK_MONOTONIC
        )

      write_json(
        environment_path,
        environment_snapshot
      )

      install_stderr_capture!
      install_thread_capture!
      install_exit_capture!

      record(
        "run_started",
        {
          pid: Process.pid,
          argv: ARGV,
          entrypoint:
            File.expand_path($0.to_s),
          cwd: Dir.pwd,
          report_directory: run_dir
        }
      )

      @installed = true

      original_stderr_write(
        "[CrashReporter] sessão: " \
        "#{run_dir}\n"
      )

      true
    rescue StandardError => e
      original_stderr_write(
        "[CrashReporter] falha ao instalar: " \
        "#{e.class} - #{e.message}\n"
      )
      false
    end

    def install_stderr_capture!
      return if @stderr_reader_thread

      @original_stderr =
        STDERR.dup

      @original_stderr.sync = true

      @stderr_log =
        File.open(
          stderr_path,
          "ab"
        )

      @stderr_log.sync = true

      read_io, write_io = IO.pipe
      write_io.sync = true

      STDERR.reopen(write_io)
      STDERR.sync = true
      write_io.close

      @stderr_reader_thread =
        Thread.new do
          begin
            Thread.current.name =
              "glauco-stderr-capture"
          rescue StandardError
            nil
          end

          buffer = +""

          loop do
            chunk =
              read_io.readpartial(4096)

            @original_stderr.write(chunk)
            @stderr_log.write(chunk)

            buffer << chunk

            while (
              newline =
                buffer.index("\n")
            )
              line =
                buffer.slice!(
                  0,
                  newline + 1
                )

              process_stderr_line(
                line
              )
            end
          end
        rescue EOFError, IOError
          unless buffer.empty?
            process_stderr_line(buffer)
          end
        rescue StandardError => e
          original_stderr_write(
            "[CrashReporter] stderr reader: " \
            "#{e.class} - #{e.message}\n"
          )
        ensure
          read_io.close unless read_io.closed?
        end
    end

    def original_stderr_write(text)
      io =
        @original_stderr ||
        STDERR

      io.write(text.to_s)
      io.flush
    rescue StandardError
      nil
    end

    def process_stderr_line(line)
      text = line.to_s

      ring_mutex.synchronize do
        recent_stderr << text
        recent_stderr.shift while
          recent_stderr.length > 250
      end

      return unless text.match?(
        NATIVE_ERROR_PATTERN
      )

      pid = extract_native_pid(text)

      severity =
        if text.match?(
          FATAL_NATIVE_PATTERN
        )
          "critical"
        else
          "warning"
        end

      signature = [
        severity,
        pid,
        text.strip
      ].join("|")

      now =
        Process.clock_gettime(
          Process::CLOCK_MONOTONIC
        )

      @native_signatures ||= {}

      previous =
        @native_signatures[
          signature
        ]

      return if previous &&
                now - previous < 3.0

      @native_signatures[
        signature
      ] = now

      record(
        "native_process_message",
        {
          severity: severity,
          native_pid: pid,
          line: text.strip,
          recent_stderr:
            stderr_tail(80)
        }
      )

      write_incident!(
        kind: "native_process_message",
        context: {
          severity: severity,
          native_pid: pid,
          line: text.strip
        }
      )

      request_frontend_snapshot(
        reason:
          "native-process-" \
          "#{severity}"
      )

      collect_coredump_async(
        pid
      ) if pid
    rescue StandardError => e
      original_stderr_write(
        "[CrashReporter] parser stderr: " \
        "#{e.class} - #{e.message}\n"
      )
    end

    def extract_native_pid(text)
      patterns = [
        /WebKitWebProcess:(\d+)/,
        /\(process:(\d+)\)/,
        /\bpid[=: ]+(\d+)\b/i
      ]

      patterns.each do |pattern|
        match = text.match(pattern)
        return match[1].to_i if match
      end

      nil
    end

    def stderr_tail(limit = 80)
      ring_mutex.synchronize do
        recent_stderr
          .last(limit)
          .join
      end
    end

    def install_thread_capture!
      Thread.report_on_exception =
        true if Thread.respond_to?(
          :report_on_exception=
        )

      Thread.abort_on_exception =
        false if Thread.respond_to?(
          :abort_on_exception=
        )

      install_java_uncaught_handler!
    end

    def install_java_uncaught_handler!
      interface =
        Java::JavaLang::Thread::
          UncaughtExceptionHandler

      handler_class =
        Class.new do
          include interface

          define_method(
            :uncaughtException
          ) do |thread, throwable|
            Frontend::CrashReporter
              .capture_java_exception(
                throwable,
                context: {
                  java_thread:
                    thread.getName.to_s
                }
              )
          end
        end

      @java_uncaught_handler =
        handler_class.new

      Java::JavaLang::Thread
        .setDefaultUncaughtExceptionHandler(
          @java_uncaught_handler
        )
    rescue StandardError => e
      record(
        "java_uncaught_handler_failed",
        {
          class: e.class.name,
          message: e.message
        }
      )
    end

    def install_exit_capture!
      return if @exit_capture_installed

      @exit_capture_installed = true

      at_exit do
        error = $!

        begin
          if error &&
             !error.is_a?(SystemExit)
            capture_exception(
              error,
              context: {
                source: "at_exit"
              },
              write_incident: true
            )
          end

          duration =
            if @monotonic_started_at
              Process.clock_gettime(
                Process::CLOCK_MONOTONIC
              ) -
                @monotonic_started_at
            end

          status =
            if error.nil?
              "clean"
            elsif error.is_a?(SystemExit)
              error.success? ?
                "clean" :
                "system_exit"
            elsif error.is_a?(Interrupt)
              "interrupted"
            else
              "error"
            end

          payload = {
            status: status,
            pid: Process.pid,
            started_at:
              @started_at&.iso8601,
            finished_at:
              Time.now.utc.iso8601,
            duration_seconds:
              duration,
            exit_error:
              error &&
              exception_hash(error)
          }

          write_json(
            status_path,
            payload
          )

          record(
            "run_finished",
            payload
          )
        rescue StandardError => e
          original_stderr_write(
            "[CrashReporter] at_exit: " \
            "#{e.class} - #{e.message}\n"
          )
        end
      end
    end

    def record(type, payload = {})
      return false unless enabled?

      event = {
        time:
          Time.now.utc.iso8601(6),
        monotonic_seconds:
          monotonic_elapsed,
        type: type.to_s,
        pid: Process.pid,
        ruby_thread:
          Thread.current.object_id,
        java_thread:
          current_java_thread_name,
        payload:
          normalize_json(payload)
      }

      mutex.synchronize do
        File.open(
          events_path,
          "a:UTF-8"
        ) do |file|
          file.puts(
            JSON.generate(event)
          )
        end
      end

      true
    rescue StandardError => e
      original_stderr_write(
        "[CrashReporter] record: " \
        "#{e.class} - #{e.message}\n"
      )
      false
    end

    def capture_exception(
      error,
      context: {},
      write_incident: true
    )
      return false unless error

      signature = [
        error.class.name,
        error.message,
        Array(error.backtrace).first
      ].join("|")

      now =
        Process.clock_gettime(
          Process::CLOCK_MONOTONIC
        )

      @exception_signatures ||= {}

      previous =
        @exception_signatures[
          signature
        ]

      return true if previous &&
                     now - previous < 1.0

      @exception_signatures[
        signature
      ] = now

      payload = {
        context:
          normalize_json(context),
        exception:
          exception_hash(error),
        recent_stderr:
          stderr_tail(100)
      }

      record(
        "ruby_exception",
        payload
      )

      write_incident!(
        kind: "ruby_exception",
        context: payload
      ) if write_incident

      request_frontend_snapshot(
        reason:
          context[:source] ||
          context["source"] ||
          "ruby-exception"
      )

      true
    rescue StandardError => reporter_error
      original_stderr_write(
        "[CrashReporter] capture_exception: " \
        "#{reporter_error.class} - " \
        "#{reporter_error.message}\n"
      )
      false
    end

    def capture_java_exception(
      throwable,
      context: {}
    )
      stack =
        begin
          throwable
            .getStackTrace
            .to_a
            .map(&:to_s)
        rescue StandardError
          []
        end

      payload = {
        context:
          normalize_json(context),
        throwable: {
          class:
            throwable
              .java_class
              .name,
          message:
            throwable
              .getMessage
              .to_s,
          stack: stack
        },
        recent_stderr:
          stderr_tail(100)
      }

      record(
        "java_exception",
        payload
      )

      write_incident!(
        kind: "java_exception",
        context: payload
      )

      request_frontend_snapshot(
        reason: "java-exception"
      )

      true
    rescue StandardError => e
      original_stderr_write(
        "[CrashReporter] java exception: " \
        "#{e.class} - #{e.message}\n"
      )
      false
    end

    def capture_javascript_error(
      payload,
      role:
    )
      data =
        if payload.is_a?(String)
          JSON.parse(payload)
        else
          payload
        end

      event_payload = {
        browser_role:
          role.to_s,
        javascript:
          normalize_json(data)
      }

      record(
        "javascript_error",
        event_payload
      )

      write_incident!(
        kind: "javascript_error",
        context: event_payload
      )

      request_frontend_snapshot(
        reason:
          "javascript-error-" \
          "#{role}"
      )

      true
    rescue JSON::ParserError => e
      record(
        "javascript_error_unparsed",
        {
          browser_role:
            role.to_s,
          raw: payload.to_s,
          parser_error:
            e.message
        }
      )
    end

    def write_incident!(
      kind:,
      context:
    )
      @incident_sequence =
        @incident_sequence.to_i + 1

      name = format(
        "incident-%04d-%s.json",
        @incident_sequence,
        kind
          .to_s
          .gsub(
            /[^A-Za-z0-9_-]/,
            "-"
          )
      )

      path =
        File.join(
          run_dir,
          name
        )

      write_json(
        path,
        {
          time:
            Time.now.utc.iso8601(6),
          kind: kind.to_s,
          pid: Process.pid,
          context:
            normalize_json(context),
          frontend_snapshot:
            safe_frontend_snapshot,
          recent_stderr:
            stderr_tail(150)
        }
      )

      path
    rescue StandardError => e
      original_stderr_write(
        "[CrashReporter] incident: " \
        "#{e.class} - #{e.message}\n"
      )
      nil
    end

    def request_frontend_snapshot(
      reason:
    )
      display =
        Frontend.respond_to?(
          :swt_display
        ) ?
          Frontend.swt_display :
          (
            defined?($display) ?
              $display :
              nil
          )

      return false unless display
      return false if display.isDisposed

      if Display.getCurrent == display
        record(
          "frontend_snapshot",
          {
            reason: reason.to_s,
            snapshot:
              build_frontend_snapshot
          }
        )

        return true
      end

      display.asyncExec do
        begin
          next if display.isDisposed

          record(
            "frontend_snapshot",
            {
              reason: reason.to_s,
              snapshot:
                build_frontend_snapshot
            }
          )
        rescue StandardError => e
          record(
            "frontend_snapshot_failed",
            {
              reason: reason.to_s,
              class: e.class.name,
              message: e.message
            }
          )
        end
      end

      true
    rescue StandardError
      false
    end

    def safe_frontend_snapshot
      display =
        defined?($display) ?
          $display :
          nil

      return {
        available: false,
        reason:
          "display indisponível"
      } unless display &&
               !display.isDisposed

      if Display.getCurrent == display
        build_frontend_snapshot
      else
        {
          available: true,
          pending_ui_thread: true,
          display_disposed:
            display.isDisposed
        }
      end
    rescue StandardError => e
      {
        available: false,
        error:
          "#{e.class}: #{e.message}"
      }
    end

    def build_frontend_snapshot
      shell =
        defined?($shell) ?
          $shell :
          nil

      browser =
        defined?($browser) ?
          $browser :
          nil

      parent =
        defined?($surface_parent) ?
          $surface_parent :
          nil

      surfaces =
        if defined?($embedded_surfaces) &&
           $embedded_surfaces
          $embedded_surfaces
        else
          {}
        end

      registry =
        if Frontend.respond_to?(
          :embedded_browser_registry
        )
          Frontend
            .embedded_browser_registry
        else
          {}
        end

      {
        available: true,
        display: {
          disposed:
            $display.isDisposed,
          thread:
            $display
              .getThread
              .getName
              .to_s
        },
        shell:
          control_snapshot(shell),
        surface_parent:
          control_snapshot(parent),
        main_browser:
          browser_snapshot(browser),
        embedded_registry:
          registry.transform_values do |config|
            {
              url:
                config[:runtime_url] ||
                config[:url],
              visible:
                config.fetch(
                  :visible,
                  true
                ),
              bounds:
                config[:bounds],
              visual_bounds:
                config[:visual_bounds],
              html:
                !config[:html].nil?
            }
          end,
        embedded_surfaces:
          surfaces.transform_values do |surface|
            browser_snapshot(surface)
          end,
        callbacks:
          defined?($callbacks) &&
          $callbacks ?
            $callbacks.length :
            0,
        hmr: {
          enabled:
            Frontend.respond_to?(
              :hmr_enabled?
            ) ?
              Frontend.hmr_enabled? :
              nil,
          reloading:
            Frontend.respond_to?(
              :hmr_reloading?
            ) ?
              Frontend.hmr_reloading? :
              nil
        }
      }
    end

    def control_snapshot(control)
      return {
        present: false
      } unless control

      return {
        present: true,
        disposed: true
      } if control.isDisposed

      bounds =
        control.getBounds

      {
        present: true,
        disposed: false,
        visible:
          control.respond_to?(
            :getVisible
          ) ?
            control.getVisible :
            nil,
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        }
      }
    rescue StandardError => e
      {
        present: true,
        error:
          "#{e.class}: #{e.message}"
      }
    end

    def browser_snapshot(browser)
      base =
        control_snapshot(browser)

      return base unless browser
      return base if browser.isDisposed

      base.merge(
        url:
          browser.getUrl.to_s,
        javascript_enabled:
          begin
            browser.getJavascriptEnabled
          rescue StandardError
            nil
          end,
        loaded_source:
          begin
            browser
              .getData(
                "glauco_loaded_source"
              )
              .to_s
          rescue StandardError
            nil
          end,
        pending_source:
          begin
            browser
              .getData(
                "glauco_pending_source"
              )
              .to_s
          rescue StandardError
            nil
          end
      )
    rescue StandardError => e
      base.merge(
        error:
          "#{e.class}: #{e.message}"
      )
    end

    def attach_browser(
      browser,
      role:
    )
      return false unless browser
      return false if browser.isDisposed

      key =
        "glauco_crash_reporter_attached"

      return true if browser.getData(key)

      browser.setData(key, true)
      browser.setData(
        "glauco_crash_role",
        role.to_s
      )

      install_browser_error_function!(
        browser,
        role: role
      )

      install_browser_progress_listener!(
        browser,
        role: role
      )

      install_browser_location_listener!(
        browser,
        role: role
      )

      browser.addListener(SWT::Dispose) do |_event|
        record(
          "browser_disposed",
          {
            role: role.to_s
          }
        )
      end

      record(
        "browser_attached",
        {
          role: role.to_s
        }
      )

      true
    rescue StandardError => e
      capture_exception(
        e,
        context: {
          source:
            "attach_browser",
          role: role.to_s
        }
      )
      false
    end

    def install_browser_error_function!(
      browser,
      role:
    )
      function_class =
        Class.new(
          Java::OrgEclipseSwtBrowser::
            BrowserFunction
        ) do
          define_method(:function) do |*args|
            raw = args.first

            if raw.is_a?(
              Java::JavaLang::Object[]
            )
              raw = raw[0]
            end

            Frontend::CrashReporter
              .capture_javascript_error(
                raw,
                role: role
              )

            nil
          rescue StandardError => e
            Frontend::CrashReporter
              .capture_exception(
                e,
                context: {
                  source:
                    "browser_error_function",
                  role: role.to_s
                }
              )
            nil
          end
        end

      function =
        function_class.new(
          browser,
          "__glaucoCrashReport"
        )

      browser.setData(
        "glauco_crash_function",
        function
      )

      function
    end

    def install_browser_progress_listener!(
      browser,
      role:
    )
      listener_class =
        Class.new(
          Java::OrgEclipseSwtBrowser::
            ProgressAdapter
        ) do
          define_method(:completed) do |_event|
            begin
              next if browser.isDisposed

              browser.execute(
                Frontend::CrashReporter
                  .javascript_bridge_source(
                    role
                  )
              )

              Frontend::CrashReporter.record(
                "browser_load_completed",
                {
                  role: role.to_s,
                  url:
                    browser.getUrl.to_s
                }
              )
            rescue StandardError => e
              Frontend::CrashReporter
                .capture_exception(
                  e,
                  context: {
                    source:
                      "browser_progress_listener",
                    role: role.to_s
                  }
                )
            end
          end
        end

      listener =
        listener_class.new

      browser.addProgressListener(
        listener
      )

      browser.setData(
        "glauco_crash_progress_listener",
        listener
      )

      listener
    end

    def install_browser_location_listener!(
      browser,
      role:
    )
      listener_class =
        Class.new(
          Java::OrgEclipseSwtBrowser::
            LocationAdapter
        ) do
          define_method(:changing) do |event|
            Frontend::CrashReporter.record(
              "browser_location_changing",
              {
                role: role.to_s,
                location:
                  event.location.to_s
              }
            )
          end

          define_method(:changed) do |event|
            Frontend::CrashReporter.record(
              "browser_location_changed",
              {
                role: role.to_s,
                location:
                  event.location.to_s
              }
            )
          end
        end

      listener =
        listener_class.new

      browser.addLocationListener(
        listener
      )

      browser.setData(
        "glauco_crash_location_listener",
        listener
      )

      listener
    end

    def javascript_bridge_source(role)
      capture_console =
        ENV.fetch(
          "GLAUCO_CRASH_CAPTURE_CONSOLE",
          "0"
        ) == "1"

      <<~JS
        (() => {
          if (
            window.__glaucoCrashBridgeInstalled
          ) return true;

          window.__glaucoCrashBridgeInstalled =
            true;

          const role = #{role.to_s.to_json};

          const serialize = (value) => {
            if (value == null) return null;

            if (value instanceof Error) {
              return {
                name: value.name,
                message: value.message,
                stack: value.stack
              };
            }

            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            ) return value;

            try {
              return JSON.parse(
                JSON.stringify(value)
              );
            } catch (_) {
              return String(value);
            }
          };

          const send = (type, data) => {
            if (
              typeof window.__glaucoCrashReport !==
              "function"
            ) return;

            try {
              window.__glaucoCrashReport(
                JSON.stringify({
                  type,
                  role,
                  time:
                    new Date().toISOString(),
                  url:
                    window.location.href,
                  title:
                    document.title,
                  userAgent:
                    navigator.userAgent,
                  data
                })
              );
            } catch (_) {}
          };

          window.addEventListener(
            "error",
            (event) => {
              send("window.error", {
                message:
                  event.message,
                filename:
                  event.filename,
                lineno:
                  event.lineno,
                colno:
                  event.colno,
                error:
                  serialize(event.error)
              });
            },
            true
          );

          window.addEventListener(
            "unhandledrejection",
            (event) => {
              send(
                "unhandledrejection",
                {
                  reason:
                    serialize(event.reason)
                }
              );
            },
            true
          );

          if (#{capture_console}) {
            const originalConsoleError =
              console.error.bind(console);

            console.error = (...args) => {
              send(
                "console.error",
                {
                  arguments:
                    args.map(serialize)
                }
              );

              return originalConsoleError(
                ...args
              );
            };
          }

          return true;
        })();
      JS
    end

    def collect_coredump_async(pid)
      return false unless pid
      return false unless command_available?(
        "coredumpctl"
      )

      @coredump_pids ||= {}
      return true if @coredump_pids[pid]

      @coredump_pids[pid] = true

      Thread.new do
        begin
          Thread.current.name =
            "glauco-coredump-#{pid}"
        rescue StandardError
          nil
        end

        output = nil

        3.times do |attempt|
          sleep(
            attempt.zero? ?
              0.4 :
              1.0
          )

          stdout, stderr, status =
            Open3.capture3(
              "coredumpctl",
              "info",
              pid.to_s,
              "--no-pager"
            )

          combined =
            [stdout, stderr]
              .reject(&:empty?)
              .join("\n")

          if status.success? ||
             combined.match?(
               /Storage:|Signal:|Stack trace:/i
             )
            output = combined
            break
          end

          output = combined
        end

        path =
          File.join(
            run_dir,
            "coredump-#{pid}.txt"
          )

        File.write(
          path,
          output.to_s,
          mode: "w:UTF-8"
        )

        record(
          "coredump_collected",
          {
            native_pid: pid,
            path: path,
            bytes:
              output.to_s.bytesize
          }
        )
      rescue StandardError => e
        record(
          "coredump_collection_failed",
          {
            native_pid: pid,
            class: e.class.name,
            message: e.message
          }
        )
      end

      true
    end

    def command_available?(name)
      system(
        "sh",
        "-lc",
        "command -v " \
        "#{Shellwords.escape(name)} " \
        ">/dev/null 2>&1"
      )
    rescue StandardError
      false
    end

    def environment_snapshot
      java_properties = {}

      %w[
        java.version
        java.vendor
        java.vm.name
        java.vm.version
        os.name
        os.version
        os.arch
        user.language
        user.timezone
      ].each do |key|
        java_properties[key] =
          Java::JavaLang::System
            .getProperty(key)
            .to_s
      rescue StandardError
        nil
      end

      {
        captured_at:
          Time.now.utc.iso8601(6),
        pid: Process.pid,
        ppid: Process.ppid,
        ruby: {
          description:
            defined?(RUBY_DESCRIPTION) ?
              RUBY_DESCRIPTION :
              RUBY_VERSION,
          version: RUBY_VERSION,
          platform: RUBY_PLATFORM,
          engine:
            defined?(RUBY_ENGINE) ?
              RUBY_ENGINE :
              "ruby",
          jruby_version:
            defined?(JRUBY_VERSION) ?
              JRUBY_VERSION :
              nil
        },
        java: java_properties,
        process: {
          argv: ARGV,
          entrypoint:
            File.expand_path($0.to_s),
          cwd: Dir.pwd
        },
        environment:
          %w[
            XDG_SESSION_TYPE
            XDG_CURRENT_DESKTOP
            WAYLAND_DISPLAY
            DISPLAY
            GDK_BACKEND
            WEBKIT_DISABLE_DMABUF_RENDERER
            WEBKIT_DISABLE_COMPOSITING_MODE
            GST_PLUGIN_PATH
            GST_PLUGIN_SYSTEM_PATH
            GST_REGISTRY
            G_DEBUG
            G_MESSAGES_DEBUG
            GLAUCO_HMR
            GLAUCO_BROWSER_TRACE
          ].to_h do |key|
            [key, ENV[key]]
          end
      }
    end

    def exception_hash(error)
      {
        class: error.class.name,
        message: error.message.to_s,
        backtrace:
          Array(error.backtrace)
            .first(100)
      }
    end

    def normalize_json(value)
      case value
      when Hash
        value.each_with_object({}) do |(key, child), memo|
          memo[key.to_s] =
            normalize_json(child)
        end
      when Array
        value.map do |child|
          normalize_json(child)
        end
      when String, Numeric, TrueClass, FalseClass, NilClass
        value
      when Time
        value.utc.iso8601(6)
      else
        if value.respond_to?(:to_h)
          normalize_json(value.to_h)
        else
          value.inspect
        end
      end
    rescue StandardError
      value.inspect
    end

    def write_json(path, payload)
      FileUtils.mkdir_p(
        File.dirname(path)
      )

      temporary =
        "#{path}.tmp-#{Process.pid}"

      File.write(
        temporary,
        JSON.pretty_generate(
          normalize_json(payload)
        ),
        mode: "w:UTF-8"
      )

      File.rename(
        temporary,
        path
      )

      path
    ensure
      FileUtils.rm_f(
        temporary
      ) if defined?(temporary)
    end

    def monotonic_elapsed
      return nil unless @monotonic_started_at

      Process.clock_gettime(
        Process::CLOCK_MONOTONIC
      ) -
        @monotonic_started_at
    rescue StandardError
      nil
    end

    def current_java_thread_name
      Java::JavaLang::Thread
        .currentThread
        .getName
        .to_s
    rescue StandardError
      nil
    end
  end
end

Frontend::CrashReporter.install!

module Frontend
  class << self
    if method_defined?(
      :ensure_frontend_runtime!
    ) && !method_defined?(
      :__glauco_crash_original_ensure_frontend_runtime!
    )
      alias_method(
        :__glauco_crash_original_ensure_frontend_runtime!,
        :ensure_frontend_runtime!
      )

      def ensure_frontend_runtime!
        result =
          __glauco_crash_original_ensure_frontend_runtime!

        if defined?($browser) &&
           $browser &&
           !$browser.isDisposed
          CrashReporter.attach_browser(
            $browser,
            role: :main
          )
        end

        result
      rescue Exception => e
        CrashReporter.capture_exception(
          e,
          context: {
            source:
              "Frontend.ensure_frontend_runtime!"
          }
        )
        raise
      end
    end

    if method_defined?(
      :ensure_embedded_browser_surface!
    ) && !method_defined?(
      :__glauco_crash_original_ensure_embedded_browser_surface!
    )
      alias_method(
        :__glauco_crash_original_ensure_embedded_browser_surface!,
        :ensure_embedded_browser_surface!
      )

      def ensure_embedded_browser_surface!(
        element_id
      )
        surface =
          __glauco_crash_original_ensure_embedded_browser_surface!(
            element_id
          )

        CrashReporter.attach_browser(
          surface,
          role:
            "embedded:#{element_id}"
        )

        surface
      rescue Exception => e
        CrashReporter.capture_exception(
          e,
          context: {
            source:
              "Frontend.ensure_embedded_browser_surface!",
            element_id:
              element_id.to_s
          }
        )
        raise
      end
    end

    if method_defined?(
      :run_loop
    ) && !method_defined?(
      :__glauco_crash_original_run_loop
    )
      alias_method(
        :__glauco_crash_original_run_loop,
        :run_loop
      )

      def run_loop
        CrashReporter.record(
          "frontend_run_loop_started"
        )

        __glauco_crash_original_run_loop
      rescue Interrupt => e
        CrashReporter.capture_exception(
          e,
          context: {
            source:
              "Frontend.run_loop",
            interrupted: true
          },
          write_incident: false
        )
        raise
      rescue Exception => e
        CrashReporter.capture_exception(
          e,
          context: {
            source:
              "Frontend.run_loop"
          }
        )
        raise
      ensure
        CrashReporter.record(
          "frontend_run_loop_finished"
        )
      end
    end

    if method_defined?(
      :start!
    ) && !method_defined?(
      :__glauco_crash_original_start!
    )
      alias_method(
        :__glauco_crash_original_start!,
        :start!
      )

      def start!
        CrashReporter.record(
          "frontend_start_requested"
        )

        __glauco_crash_original_start!
      rescue Exception => e
        CrashReporter.capture_exception(
          e,
          context: {
            source:
              "Frontend.start!"
          }
        )
        raise
      end
    end

    if method_defined?(
      :on_ui_thread
    ) && !method_defined?(
      :__glauco_crash_original_on_ui_thread
    )
      alias_method(
        :__glauco_crash_original_on_ui_thread,
        :on_ui_thread
      )

      def on_ui_thread(&block)
        __glauco_crash_original_on_ui_thread(
          &block
        )
      rescue Exception => e
        CrashReporter.capture_exception(
          e,
          context: {
            source:
              "Frontend.on_ui_thread"
          }
        )
        raise
      end
    end

    if method_defined?(
      :perform_hmr_reload!
    ) && !method_defined?(
      :__glauco_crash_original_perform_hmr_reload!
    )
      alias_method(
        :__glauco_crash_original_perform_hmr_reload!,
        :perform_hmr_reload!
      )

      def perform_hmr_reload!(
        changed_files
      )
        CrashReporter.record(
          "hmr_reload_started",
          {
            changed_files:
              Array(changed_files)
          }
        )

        result =
          __glauco_crash_original_perform_hmr_reload!(
            changed_files
          )

        CrashReporter.record(
          "hmr_reload_finished",
          {
            changed_files:
              Array(changed_files),
            result: result
          }
        )

        result
      rescue Exception => e
        CrashReporter.capture_exception(
          e,
          context: {
            source:
              "Frontend.perform_hmr_reload!",
            changed_files:
              Array(changed_files)
          }
        )
        raise
      end
    end

    if method_defined?(
      :invoke_callback
    ) && !method_defined?(
      :__glauco_crash_original_invoke_callback
    )
      alias_method(
        :__glauco_crash_original_invoke_callback,
        :invoke_callback
      )

      def invoke_callback(
        callback,
        value = nil
      )
        __glauco_crash_original_invoke_callback(
          callback,
          value
        )
      rescue Exception => e
        CrashReporter.capture_exception(
          e,
          context: {
            source:
              "Frontend.invoke_callback",
            callback_arity:
              callback.respond_to?(:arity) ?
                callback.arity :
                nil,
            value_class:
              value.class.name
          }
        )
        raise
      end
    end
  end
end

module Frontend
  class RootRenderer
    if method_defined?(:render) &&
       !method_defined?(
         :__glauco_crash_original_render
       )
      alias_method(
        :__glauco_crash_original_render,
        :render
      )

      def render
        Frontend::CrashReporter.record(
          "root_render_started",
          {
            component:
              @root_component&.class&.name
          }
        )

        result =
          __glauco_crash_original_render

        Frontend::CrashReporter.record(
          "root_render_finished",
          {
            component:
              @root_component&.class&.name
          }
        )

        result
      rescue Exception => e
        Frontend::CrashReporter
          .capture_exception(
            e,
            context: {
              source:
                "RootRenderer.render",
              component:
                @root_component&.class&.name
            }
          )
        raise
      end
    end
  end
end

module Frontend
  class Component
    if method_defined?(:set_state) &&
       !method_defined?(:__glauco_crash_original_set_state)
      alias_method(:__glauco_crash_original_set_state, :set_state)

      def set_state(path, new_value, replace: false)
        __glauco_crash_original_set_state(path, new_value, replace: replace)
      rescue Exception => e
        Frontend::CrashReporter.capture_exception(
          e,
          context: {
            source: "Component.set_state",
            component: self.class.name,
            path: path.to_s,
            replace: replace
          }
        )
        raise
      end
    end
  end
end


# === GLAUCO FRONTEND CRASH REPORTER END ===


# === GLAUCO SQLITE JRUBY CLASSLOADER BEGIN ===

module Glauco
  module Backend
    class SqlDatabase
      # O JAR carregado por jdbc-sqlite3 entra no classloader do JRuby.
      # Class.forName(String) usa outro caminho de classloader no Java 26
      # e pode não enxergar org.sqlite.JDBC.
      #
      # A conexão passa a:
      # 1. carregar o JAR com require;
      # 2. resolver a classe pelo JRubyClassLoader;
      # 3. instanciar o Driver diretamente;
      # 4. abrir a conexão sem depender do DriverManager.
      def connect
        return @connection if @connection

        driver = sqlite_driver_instance!

        FileUtils.mkdir_p(
          File.dirname(path)
        )

        properties =
          Java::JavaUtil::Properties.new

        @connection =
          driver.connect(
            "jdbc:sqlite:#{path}",
            properties
          )

        unless @connection
          raise(
            "O driver SQLite recusou a URL " \
            "jdbc:sqlite:#{path}"
          )
        end

        @connection
      end

      private

      def load_sqlite_driver!
        sqlite_driver_instance!
        true
      end

      def sqlite_driver_instance!
        return @sqlite_driver if @sqlite_driver

        load_sqlite_jar_into_jruby!

        require "jruby" unless JRuby.respond_to?(:runtime)

        loader =
          JRuby.runtime.jruby_class_loader

        driver_class =
          loader.load_class(
            SQLITE_DRIVER_CLASS
          )

        constructor =
          driver_class.getDeclaredConstructor

        constructor.setAccessible(true)

        @sqlite_driver =
          constructor.newInstance
      rescue Java::JavaLang::ClassNotFoundException => e
        raise LoadError, [
          "org.sqlite.JDBC não foi encontrado no classloader do JRuby.",
          "Gem esperada: jdbc-sqlite3.",
          "Erro original: #{e.message}"
        ].join(" ")
      rescue Java::JavaLang::NoClassDefFoundError => e
        raise LoadError, [
          "Uma dependência Java do sqlite-jdbc não foi encontrada.",
          "Erro original: #{e.message}"
        ].join(" ")
      end

      def load_sqlite_jar_into_jruby!
        begin
          require "jdbc/sqlite3"

          if defined?(Jdbc::SQLite3)
            Jdbc::SQLite3.load_driver(
              :require
            )
            return true
          end
        rescue LoadError
          nil
        end

        jars = sqlite_jdbc_candidates

        raise LoadError, [
          "sqlite-jdbc*.jar não encontrado.",
          "Instale jdbc-sqlite3 ou coloque o JAR em",
          defined?(JARLIBS_DIR) ? JARLIBS_DIR : "jarlibs/"
        ].join(" ") if jars.empty?

        jars.each do |jar|
          require jar
        end

        true
      end

      def sqlite_jdbc_candidates
        roots = [
          (
            defined?(PROJECT_ROOT) ?
              File.join(
                PROJECT_ROOT,
                "jarlibs"
              ) :
              nil
          ),
          (
            defined?(JARLIBS_DIR) ?
              JARLIBS_DIR :
              nil
          )
        ].compact.uniq

        gem_jar =
          begin
            spec =
              Gem::Specification
                .find_by_name(
                  "jdbc-sqlite3"
                )

            Dir.glob(
              File.join(
                spec.full_gem_path,
                "lib",
                "sqlite-jdbc*.jar"
              )
            )
          rescue Gem::LoadError
            []
          end

        local_jars =
          roots.flat_map do |directory|
            next [] unless Dir.exist?(
              directory
            )

            Dir.glob(
              File.join(
                directory,
                "sqlite-jdbc*.jar"
              )
            )
          end

        (gem_jar + local_jars)
          .map { |jar| File.expand_path(jar) }
          .select { |jar| File.file?(jar) }
          .uniq
      end
    end
  end
end

# === GLAUCO SQLITE JRUBY CLASSLOADER END ===


# === GLAUCO MRI NATIVE WEBVIEW TARGET BEGIN ===
#
# MRI target. No Java/JRuby/SWT is loaded. A tiny Wry host owns the native
# window and OS WebViews; Ruby keeps the HTML DSL, HTTP callback bridge,
# state, RLM, Metis and OpenJEV runtimes.
#
# Protocol operations intentionally mirror the framework abstraction instead
# of Electron/SWT names: root navigation/eval + child view lifecycle/bounds.
#
module Frontend
  module NativeWebView
    Rect = Struct.new(:x, :y, :width, :height, keyword_init: true)
    Point = Struct.new(:x, :y, keyword_init: true)

    class Scheduler
      def isDisposed
        false
      end

      def async_exec(&block)
        Frontend.defer(&block)
      end
      alias asyncExec async_exec

      def timerExec(delay, &block)
        Frontend.defer(delay.to_i, &block)
      end
      alias timer_exec timerExec
    end

    class Client
      attr_reader :binary, :wait_thread

      def initialize(
        binary: ENV["GLAUCO_WEBVIEW_HOST_BIN"],
        manifest: ENV["GLAUCO_WEBVIEW_HOST_MANIFEST"]
      )
        @manifest = File.expand_path(
          manifest || File.join(PROJECT_ROOT, "native", "glauco-webview-host", "Cargo.toml")
        )
        @binary = resolve_binary(binary)
        @mutex = Mutex.new
        @started = false
      end

      def start!(title:, width:, height:)
        return self if alive?

        ensure_binary!
        args = [
          @binary,
          "--url", "about:blank",
          "--title", title.to_s,
          "--width", width.to_i.to_s,
          "--height", height.to_i.to_s
        ]

        @stdin, @stdout, @stderr, @wait_thread = Open3.popen3(*args)
        @stdin.sync = true
        @started = true
        start_log_pumps
        self
      end

      def alive?
        @started && @wait_thread && @wait_thread.alive?
      end

      def wait
        @wait_thread&.value
      end

      def close
        command("op" => "quit") if alive?
      rescue StandardError
        nil
      ensure
        @stdin&.close rescue nil
      end

      def command(payload)
        raise "native webview host is not running" unless alive?

        line = JSON.generate(payload)
        @mutex.synchronize do
          @stdin.write(line)
          @stdin.write("\n")
          @stdin.flush
        end
        true
      end

      def root_url(url)
        command("op" => "root_url", "url" => url.to_s)
      end

      def root_html(html)
        command("op" => "root_html", "html" => html.to_s)
      end

      def eval(js)
        command("op" => "eval", "id" => "__root__", "js" => js.to_s)
      end

      def title(value)
        command("op" => "title", "title" => value.to_s)
      end

      def size(width, height)
        command("op" => "size", "width" => width.to_i, "height" => height.to_i)
      end

      def create_view(id)
        command("op" => "create_view", "id" => id.to_s)
      end

      def destroy_view(id)
        command("op" => "destroy_view", "id" => id.to_s)
      end

      def view_url(id, url)
        command("op" => "view_url", "id" => id.to_s, "url" => url.to_s)
      end

      def view_html(id, html)
        command("op" => "view_html", "id" => id.to_s, "html" => html.to_s)
      end

      def view_bounds(id, x, y, width, height)
        command(
          "op" => "view_bounds",
          "id" => id.to_s,
          "x" => x.to_i,
          "y" => y.to_i,
          "width" => [width.to_i, 1].max,
          "height" => [height.to_i, 1].max
        )
      end

      def view_visible(id, visible)
        command("op" => "view_visible", "id" => id.to_s, "visible" => !!visible)
      end

      private

      def resolve_binary(explicit)
        return File.expand_path(explicit) if explicit && !explicit.to_s.strip.empty?

        name = Gem.win_platform? ? "glauco-webview-host.exe" : "glauco-webview-host"
        File.expand_path(
          File.join(File.dirname(@manifest), "target", "release", name)
        )
      end

      def ensure_binary!
        return if File.executable?(@binary)

        unless File.file?(@manifest)
          raise <<~ERROR.strip
            Glauco native WebView host not found.
            Expected #{@binary} or Cargo manifest #{@manifest}.
            Set GLAUCO_WEBVIEW_HOST_BIN to an existing glauco-webview-host binary.
          ERROR
        end

        cargo = ENV.fetch("CARGO", "cargo")
        ok = system(cargo, "build", "--release", "--manifest-path", @manifest)
        raise "failed to build native WebView host from #{@manifest}" unless ok && File.executable?(@binary)
      end

      def start_log_pumps
        @stdout_thread = Thread.new do
          @stdout.each_line do |line|
            puts "[Glauco/WebViewHost] #{line.rstrip}" if ENV["GLAUCO_WEBVIEW_TRACE"] == "1"
          end
        rescue IOError
          nil
        end

        @stderr_thread = Thread.new do
          @stderr.each_line { |line| warn "[Glauco/WebViewHost] #{line.rstrip}" }
        rescue IOError
          nil
        end
      end
    end

    class RootProxy
      def initialize(client, width:, height:)
        @client = client
        @data = {}
        @width = width.to_i
        @height = height.to_i
      end

      def setUrl(url)
        @client.root_url(url)
      end

      def setText(html)
        @client.root_html(html)
      end

      def evaluate(js)
        @client.eval(js)
      end
      alias execute evaluate

      def isDisposed
        !@client.alive?
      end
      alias disposed? isDisposed

      def setData(key, value)
        @data[key.to_s] = value
      end

      def getData(key)
        @data[key.to_s]
      end

      def setBounds(_x, _y, width, height)
        @width = width.to_i
        @height = height.to_i
        @client.size(@width, @height)
        true
      end

      def getBounds
        Rect.new(x: 0, y: 0, width: @width, height: @height)
      end

      def toDisplay(x, y)
        Point.new(x: x.to_i, y: y.to_i)
      end

      def equal(other)
        equal?(other)
      end

      def addListener(*)
        true
      end

      def dispose
        @client.close
      end
    end

    class SurfaceProxy
      def initialize(client, id)
        @client = client
        @id = id.to_s
        @data = {}
        @visible = false
        @disposed = false
        @scheduler = Scheduler.new
        @bounds = Rect.new(x: 0, y: 0, width: 1, height: 1)
        @client.create_view(@id)
      end

      def isDisposed
        @disposed || !@client.alive?
      end

      def dispose
        return if @disposed
        @client.destroy_view(@id) if @client.alive?
        @disposed = true
      end

      def setData(key, value)
        @data[key.to_s] = value
      end

      def getData(key)
        @data[key.to_s]
      end

      def setBounds(x, y, width, height)
        @bounds = Rect.new(x: x.to_i, y: y.to_i, width: width.to_i, height: height.to_i)
        @client.view_bounds(@id, x, y, width, height)
        true
      end

      def getBounds
        @bounds
      end

      def setVisible(value)
        @visible = !!value
        @client.view_visible(@id, @visible)
        true
      end

      def getVisible
        @visible
      end

      def setUrl(url)
        @client.view_url(@id, url)
      end

      def setText(html)
        @client.view_html(@id, html)
      end

      def getDisplay
        @scheduler
      end

      def moveAbove(*)
        true
      end

      def addListener(*)
        true
      end

      def addLocationListener(*)
        true
      end
    end
  end

  class << self
    attr_reader :native_webview_client

    # The BrowserFunction bridge is SWT-specific. Native WebView pages use the
    # existing /__glauco/callback HTTP fallback instead.
    def install_browser_dispatch!(browser)
      return true if webview?
      super
    end if false # documentation marker; legacy implementation remains above
  end
end

if Frontend.webview?
  module Frontend
    class << self
      def swt_display
        nil
      end

      def swt_ui_thread?
        false
      end

      def assert_ui_thread!
        true
      end

      def on_ui_thread(&block)
        block.call
      end

      def install_browser_dispatch!(_browser)
        true
      end

      def browserFunctionFac(_browser, _callback_name = nil)
        true
      end

      def native_webview_client
        @native_webview_client
      end

      def ensure_frontend_runtime!
        if @native_webview_client&.alive? && defined?($browser) && $browser && !$browser.isDisposed
          $root = RootRenderer.new($browser) unless defined?($root) && $root && $root.browser.equal?($browser)
          return true
        end

        @server_thread ||= Thread.new { server.start }
        wait_for_server!

        width = ENV.fetch("GLAUCO_WINDOW_WIDTH", "1200").to_i
        height = ENV.fetch("GLAUCO_WINDOW_HEIGHT", "760").to_i
        title = ENV.fetch("GLAUCO_WINDOW_TITLE", "Glauco")

        @native_webview_client = NativeWebView::Client.new
        @native_webview_client.start!(title: title, width: width, height: height)

        $embedded_surfaces = {}
        $browser = NativeWebView::RootProxy.new(@native_webview_client, width: width, height: height)
        $root = RootRenderer.new($browser)
        true
      end

      def schedule_embedded_browser_sync(element_id)
        defer { sync_embedded_browser_surface(element_id.to_s) }
        true
      end

      def ensure_embedded_browser_surface!(element_id)
        ensure_frontend_runtime!
        id = element_id.to_s
        config = embedded_browser_registry[id]
        raise "embedded browser não registrado: #{id}" unless config

        $embedded_surfaces ||= {}
        current = $embedded_surfaces[id]
        return current if current && !current.isDisposed

        surface = NativeWebView::SurfaceProxy.new(@native_webview_client, id)
        surface.setData("glauco_embedded_id", id)
        surface.setData("glauco_loaded_source", "")
        surface.setData("glauco_pending_source", "")
        surface.setData("glauco_navigation_token", 0)
        $embedded_surfaces[id] = surface
        surface
      end

      def sync_frontend_layout!
        embedded_browser_registry.each_key { |id| sync_embedded_browser_surface(id) }
        true
      end

      def start!
        return if defined?(Glauco::Framework) && Glauco::Framework.maybe_build_msi_installer!(component: defined?($root) ? $root.root_component : nil)

        ensure_frontend_runtime!
        @native_webview_client.wait
      end

      def run_loop
        ensure_frontend_runtime!
        @native_webview_client.wait
      end

      def start(component, title: nil, width: nil, height: nil)
        ensure_frontend_runtime!
        component.parent_renderer = $root if component.respond_to?(:parent_renderer=)
        $root.root_component = component
        $root.render
        apply_window_title(title) if title
        apply_window_size(width, height) if width && height
        start!
      end
    end
  end
end
# === GLAUCO MRI NATIVE WEBVIEW TARGET END ===

# === GLAUCO METIS MEMORY + OPENJEV MACHINE BEGIN ===
#
# Metis upstream does not expose a dedicated persistent-memory HTTP contract.
# Its documented runtime lifecycle is model.reset(), a forward pass with
# commit_memory=True, and later model.generate() calls that read the native
# memory state without replaying the original text.  This core therefore owns
# a tiny local bridge that maps HTTP operations to that lifecycle.
#
# Application DSL intentionally does NOT expose a Metis model declaration.
# Memory is an opinionated framework capability:
#
#   memory "the work is waiting for a dependency" do
#     when_enter { |memory| Work.command memory.text }
#   end
#
#   remember "the asphalt crew stopped because aggregate has not arrived"
#
# OpenJEV is exposed as a machine-state command router:
#
#   machine :Work do
#     state :idle
#     method(:start)  { state :working }
#     method(:wait)   { state :waiting }
#     method(:finish) { state :finished }
#   end
#
#   Work.command "the crew has started"
#   Work.wait # deterministic direct transition, no model call
#

module Glauco
  module CognitionHTTP
    module_function

    def request_json(method, url, payload: nil, headers: {}, open_timeout: 5, read_timeout: 120)
      uri = URI.parse(url.to_s)
      klass = case method.to_s.upcase
              when "GET" then Net::HTTP::Get
              when "POST" then Net::HTTP::Post
              when "PUT" then Net::HTTP::Put
              when "DELETE" then Net::HTTP::Delete
              else
                raise ArgumentError, "Unsupported HTTP method: #{method.inspect}"
              end

      request = klass.new(uri.request_uri)
      request["Accept"] = "application/json"
      headers.each { |key, value| request[key.to_s] = value.to_s }

      unless payload.nil?
        request["Content-Type"] = "application/json"
        request.body = JSON.generate(payload)
      end

      response = Net::HTTP.start(
        uri.host,
        uri.port,
        use_ssl: uri.scheme == "https",
        open_timeout: open_timeout,
        read_timeout: read_timeout
      ) { |http| http.request(request) }

      body = response.body.to_s
      parsed = body.empty? ? {} : JSON.parse(body)

      unless response.is_a?(Net::HTTPSuccess)
        raise RuntimeError,
              "HTTP #{response.code} for #{uri}: #{parsed.inspect}"
      end

      parsed
    rescue JSON::ParserError => e
      raise RuntimeError, "Invalid JSON from #{url}: #{e.message}"
    end
  end

  module Memory
    Match = Struct.new(
      :phrase,
      :present,
      :text,
      :event,
      :raw,
      :evaluated_at,
      keyword_init: true
    ) do
      def present?
        !!present
      end

      def to_h
        {
          "phrase" => phrase,
          "present" => present?,
          "text" => text,
          "event" => event,
          "raw" => raw,
          "evaluated_at" => evaluated_at
        }
      end
    end

    class ConditionDefinition
      attr_reader :phrase, :callbacks
      attr_accessor :last_present

      def initialize(phrase)
        @phrase = phrase.to_s.strip
        raise ArgumentError, "memory phrase cannot be empty" if @phrase.empty?

        @callbacks = {
          enter: [],
          present: [],
          leave: [],
          event: []
        }
        @last_present = nil
      end

      def when_enter(&block)
        register(:enter, block)
      end

      def when_present(&block)
        register(:present, block)
      end

      def when_leave(&block)
        register(:leave, block)
      end

      # Runs for every memory commit before the condition is re-evaluated.
      # Useful when the concrete incoming memory event matters independently
      # from the condition's persistent truth value.
      def on_event(&block)
        register(:event, block)
      end

      private

      def register(kind, block)
        raise ArgumentError, "#{kind} requires a block" unless block

        @callbacks.fetch(kind) << block
        self
      end
    end

    class MetisBridgeLauncher
      DEFAULT_HOST = ENV.fetch("GLAUCO_METIS_HOST", "127.0.0.1")
      DEFAULT_PORT = Integer(ENV.fetch("GLAUCO_METIS_PORT", "8768"))
      DEFAULT_MODEL = ENV.fetch("GLAUCO_METIS_MODEL", "IAAR-Shanghai/Metis-4B")

      PYTHON_SOURCE = <<~'PYTHON'
        import json
        import os
        import re
        import threading
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        HOST = os.environ.get("GLAUCO_METIS_HOST", "127.0.0.1")
        PORT = int(os.environ.get("GLAUCO_METIS_PORT", "8768"))
        MODEL_ID = os.environ.get("GLAUCO_METIS_MODEL", "IAAR-Shanghai/Metis-4B")
        MAX_QUERY_TOKENS = int(os.environ.get("GLAUCO_METIS_QUERY_MAX_TOKENS", "128"))

        print(f"[glauco-metis] loading {MODEL_ID}", flush=True)

        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
        if tokenizer.pad_token_id is None and tokenizer.eos_token_id is not None:
            tokenizer.pad_token = tokenizer.eos_token

        load_kwargs = {
            "trust_remote_code": True,
            "device_map": os.environ.get("GLAUCO_METIS_DEVICE_MAP", "auto"),
        }

        dtype_name = os.environ.get("GLAUCO_METIS_DTYPE", "auto").lower()
        if dtype_name in ("bf16", "bfloat16"):
            load_kwargs["torch_dtype"] = torch.bfloat16
        elif dtype_name in ("fp16", "float16"):
            load_kwargs["torch_dtype"] = torch.float16
        elif dtype_name in ("fp32", "float32"):
            load_kwargs["torch_dtype"] = torch.float32
        else:
            load_kwargs["torch_dtype"] = "auto"

        model = AutoModelForCausalLM.from_pretrained(MODEL_ID, **load_kwargs)
        model.eval()
        lock = threading.RLock()

        def model_device():
            try:
                return model.device
            except Exception:
                return next(model.parameters()).device

        def chat_text(messages, add_generation_prompt):
            kwargs = {
                "tokenize": False,
                "add_generation_prompt": add_generation_prompt,
            }
            try:
                return tokenizer.apply_chat_template(
                    messages,
                    enable_thinking=False,
                    **kwargs,
                )
            except TypeError:
                return tokenizer.apply_chat_template(messages, **kwargs)

        def encode(messages, add_generation_prompt=False):
            text = chat_text(messages, add_generation_prompt)
            encoded = tokenizer(
                text,
                return_tensors="pt",
                add_special_tokens=False,
            )
            device = model_device()
            return {
                "input_ids": encoded["input_ids"].to(device),
                "attention_mask": encoded["attention_mask"].to(device),
            }

        def reset_memory():
            if hasattr(model, "reset"):
                model.reset()
                return
            if hasattr(model, "reset_memory"):
                model.reset_memory()
                return
            blocks = getattr(getattr(model, "model", None), "metis_blocks", None)
            if blocks is None:
                raise RuntimeError("Loaded model exposes no Metis memory reset method")
            for block in blocks:
                local = getattr(block, "local_memory", None)
                if local is not None and hasattr(local, "reset"):
                    local.reset()

        @torch.no_grad()
        def commit(text, role="user"):
            inputs = encode([{"role": role, "content": str(text)}], False)
            # This is the documented Metis runtime write operation.  The
            # custom model forward updates native memory without gradients.
            model(
                **inputs,
                commit_memory=True,
                use_cache=False,
                logits_to_keep=1,
            )

        @torch.no_grad()
        def query(prompt, max_new_tokens=None):
            inputs = encode([{"role": "user", "content": str(prompt)}], True)
            limit = int(max_new_tokens or MAX_QUERY_TOKENS)
            output = model.generate(
                **inputs,
                max_new_tokens=limit,
                do_sample=False,
                eos_token_id=tokenizer.eos_token_id,
                pad_token_id=tokenizer.pad_token_id,
            )
            generated = output[0, inputs["input_ids"].shape[1]:]
            return tokenizer.decode(generated, skip_special_tokens=True).strip()

        class Handler(BaseHTTPRequestHandler):
            server_version = "GlaucoMetisBridge/1.0"

            def log_message(self, fmt, *args):
                print("[glauco-metis] " + (fmt % args), flush=True)

            def json_body(self):
                length = int(self.headers.get("content-length", "0") or "0")
                raw = self.rfile.read(length) if length else b"{}"
                return json.loads(raw.decode("utf-8"))

            def send_json(self, status, payload):
                raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(status)
                self.send_header("content-type", "application/json; charset=utf-8")
                self.send_header("content-length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

            def do_GET(self):
                if self.path == "/health":
                    self.send_json(200, {"ready": True, "model": MODEL_ID})
                    return
                self.send_json(404, {"error": "not_found"})

            def do_POST(self):
                try:
                    body = self.json_body()
                    with lock:
                        if self.path == "/v1/memory/commit":
                            text = str(body.get("text", "")).strip()
                            if not text:
                                self.send_json(422, {"error": "text_required"})
                                return
                            commit(text, str(body.get("role", "user")))
                            self.send_json(200, {"committed": True})
                            return

                        if self.path == "/v1/memory/query":
                            prompt = str(body.get("prompt", "")).strip()
                            if not prompt:
                                self.send_json(422, {"error": "prompt_required"})
                                return
                            text = query(prompt, body.get("max_new_tokens"))
                            self.send_json(200, {"text": text})
                            return

                        if self.path == "/v1/memory/reset":
                            reset_memory()
                            self.send_json(200, {"reset": True})
                            return

                    self.send_json(404, {"error": "not_found"})
                except Exception as exc:
                    self.send_json(500, {
                        "error": exc.__class__.__name__,
                        "message": str(exc),
                    })

        reset_memory()
        print(f"[glauco-metis] ready on http://{HOST}:{PORT}", flush=True)
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
      PYTHON

      class << self
        def ensure_running!(base_url)
          return true if healthy?(base_url)

          unless GlaucoEnv.truthy?(ENV.fetch("GLAUCO_METIS_AUTO_START", "1"))
            raise RuntimeError,
                  "Metis bridge is not reachable at #{base_url} and auto-start is disabled"
          end

          script = materialize_script!
          python = ENV.fetch("GLAUCO_METIS_PYTHON", "python3")
          log_path = File.join(runtime_dir, "metis-bridge.log")
          log = File.open(log_path, "a")

          bridge_uri = URI.parse(base_url.to_s)
          env = {
            "GLAUCO_METIS_HOST" => (bridge_uri.host || DEFAULT_HOST),
            "GLAUCO_METIS_PORT" => (bridge_uri.port || DEFAULT_PORT).to_s,
            "GLAUCO_METIS_MODEL" => DEFAULT_MODEL,
            "PYTHONUNBUFFERED" => "1"
          }

          @pid = Process.spawn(
            env,
            python,
            script,
            out: log,
            err: log
          )
          log.close

          at_exit do
            begin
              Process.kill("TERM", @pid) if @pid
            rescue Errno::ESRCH, Errno::ECHILD
              nil
            end
          end

          timeout = Float(ENV.fetch("GLAUCO_METIS_START_TIMEOUT", "600"))
          deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + timeout

          until healthy?(base_url)
            if Process.clock_gettime(Process::CLOCK_MONOTONIC) >= deadline
              raise Timeout::Error,
                    "Metis did not become ready. See #{log_path}"
            end

            begin
              finished_pid = Process.waitpid(@pid, Process::WNOHANG)
              if finished_pid
                raise RuntimeError,
                      "Metis bridge exited during startup. See #{log_path}"
              end
            rescue Errno::ECHILD
              nil
            end

            sleep 0.5
          end

          true
        end

        def healthy?(base_url)
          response = Glauco::CognitionHTTP.request_json(
            :get,
            "#{base_url.to_s.sub(%r{/$}, '')}/health",
            open_timeout: 0.5,
            read_timeout: 1
          )
          response["ready"] != false
        rescue StandardError
          false
        end

        private

        def runtime_dir
          root = defined?(PROJECT_ROOT) ? PROJECT_ROOT : Dir.pwd
          path = File.join(root, ".glauco", "runtime")
          FileUtils.mkdir_p(path)
          path
        end

        def materialize_script!
          path = File.join(runtime_dir, "metis_bridge.py")
          unless File.file?(path) && File.read(path, encoding: "UTF-8") == PYTHON_SOURCE
            File.write(path, PYTHON_SOURCE, mode: "w", encoding: "UTF-8")
          end
          path
        end
      end
    end

    class MetisClient
      DEFAULT_BASE_URL = ENV.fetch(
        "GLAUCO_METIS_ENDPOINT",
        "http://127.0.0.1:#{MetisBridgeLauncher::DEFAULT_PORT}"
      )

      attr_reader :base_url

      def initialize(base_url: DEFAULT_BASE_URL)
        @base_url = base_url.to_s.sub(%r{/$}, "")
        @booted = false
      end

      def boot!
        return self if @booted && healthy?

        MetisBridgeLauncher.ensure_running!(@base_url)
        @booted = true
        self
      end

      def healthy?
        MetisBridgeLauncher.healthy?(@base_url)
      end

      def commit(text, role: "user")
        boot!
        CognitionHTTP.request_json(
          :post,
          "#{@base_url}/v1/memory/commit",
          payload: { "text" => text.to_s, "role" => role.to_s },
          read_timeout: memory_timeout
        )
      end

      def query(prompt, max_new_tokens: 96)
        boot!
        result = CognitionHTTP.request_json(
          :post,
          "#{@base_url}/v1/memory/query",
          payload: {
            "prompt" => prompt.to_s,
            "max_new_tokens" => max_new_tokens.to_i
          },
          read_timeout: memory_timeout
        )
        result["text"].to_s
      end

      def reset!
        boot!
        CognitionHTTP.request_json(
          :post,
          "#{@base_url}/v1/memory/reset",
          payload: {},
          read_timeout: memory_timeout
        )
      end

      private

      def memory_timeout
        Float(ENV.fetch("GLAUCO_METIS_REQUEST_TIMEOUT", "300"))
      end
    end

    class Runtime
      attr_reader :owner_class, :conditions, :client, :event_log_path

      def initialize(owner_class:, client: nil, event_log_path: nil)
        @owner_class = owner_class
        @conditions = []
        @client = client || MetisClient.new
        @owner = nil
        @booted = false
        @mutex = Mutex.new

        root = defined?(PROJECT_ROOT) ? PROJECT_ROOT : Dir.pwd
        app_name = owner_class.name.to_s.gsub(/[^A-Za-z0-9_.-]+/, "_")
        app_name = "application" if app_name.empty?
        @event_log_path = event_log_path || File.join(
          root,
          ".glauco",
          "memory",
          "#{app_name}.jsonl"
        )
      end

      def bind(owner)
        @owner = owner
        self
      end

      def register(definition)
        @conditions << definition unless @conditions.include?(definition)
        definition
      end

      def boot!
        @mutex.synchronize do
          return self if @booted

          @client.boot!
          @client.reset!
          replay_persisted_events!
          @booted = true
        end

        evaluate_all!
        self
      end

      def remember(text, **metadata)
        normalized = text.to_s.strip
        raise ArgumentError, "remember requires non-empty text" if normalized.empty?

        boot!
        @client.commit(normalized)

        event = {
          "text" => normalized,
          "metadata" => stringify_keys(metadata),
          "time" => Time.now.utc.iso8601
        }
        persist_event!(event)
        dispatch_event_callbacks(event)
        evaluate_all!(event: event)
        event
      end

      alias commit remember

      def refresh!
        boot!
        evaluate_all!
      end

      def reset!(clear_persisted: false)
        @client.boot!
        @client.reset!
        @conditions.each { |condition| condition.last_present = nil }

        if clear_persisted && File.file?(@event_log_path)
          File.delete(@event_log_path)
        elsif !clear_persisted
          replay_persisted_events!
        end

        evaluate_all!
        true
      end

      def present?(phrase)
        result = evaluate_phrase(phrase.to_s)
        result.present?
      end

      private

      def replay_persisted_events!
        return unless File.file?(@event_log_path)

        File.foreach(@event_log_path, encoding: "UTF-8") do |line|
          next if line.strip.empty?

          row = JSON.parse(line)
          text = row["text"].to_s.strip
          @client.commit(text) unless text.empty?
        rescue JSON::ParserError
          next
        end
      end

      def persist_event!(event)
        FileUtils.mkdir_p(File.dirname(@event_log_path))
        File.open(@event_log_path, "a", encoding: "UTF-8") do |file|
          file.write(JSON.generate(event))
          file.write("\n")
        end
      end

      def dispatch_event_callbacks(event)
        @conditions.each do |condition|
          match = Match.new(
            phrase: condition.phrase,
            present: condition.last_present,
            text: event["text"],
            event: event,
            raw: nil,
            evaluated_at: Time.now.utc.iso8601
          )
          condition.callbacks[:event].each { |callback| invoke_callback(callback, match) }
        end
      end

      def evaluate_all!(event: nil)
        @conditions.map do |condition|
          match = evaluate_phrase(condition.phrase, event: event)
          previous = condition.last_present
          current = match.present?

          if current && previous != true
            condition.callbacks[:enter].each { |callback| invoke_callback(callback, match) }
          end

          if current
            condition.callbacks[:present].each { |callback| invoke_callback(callback, match) }
          end

          if !current && previous == true
            condition.callbacks[:leave].each { |callback| invoke_callback(callback, match) }
          end

          condition.last_present = current
          match
        end
      end

      def evaluate_phrase(phrase, event: nil)
        prompt = <<~PROMPT
          Evaluate one predicate using ONLY your persistent native memory state.
          Do not infer facts merely because they are plausible.

          Predicate:
          #{phrase}

          Return exactly one JSON object and no prose:
          {"present":true}
          or
          {"present":false}
        PROMPT

        raw = @client.query(prompt, max_new_tokens: 48)
        present = parse_present(raw)

        Match.new(
          phrase: phrase,
          present: present,
          text: event && event["text"],
          event: event,
          raw: raw,
          evaluated_at: Time.now.utc.iso8601
        )
      end

      def parse_present(raw)
        text = raw.to_s.strip

        begin
          parsed = JSON.parse(text)
          value = parsed["present"] if parsed.is_a?(Hash)
          return !!value if value == true || value == false
        rescue JSON::ParserError
          object = text[/\{.*?\}/m]
          if object
            begin
              parsed = JSON.parse(object)
              value = parsed["present"] if parsed.is_a?(Hash)
              return !!value if value == true || value == false
            rescue JSON::ParserError
              nil
            end
          end
        end

        return true if text.match?(/\bpresent\b\s*[:=]\s*true\b/i)
        return false if text.match?(/\bpresent\b\s*[:=]\s*false\b/i)
        return true if text.match?(/\btrue\b/i) && !text.match?(/\bfalse\b/i)
        return false if text.match?(/\bfalse\b/i)

        raise RuntimeError, "Metis condition response is not boolean JSON: #{text.inspect}"
      end

      def invoke_callback(callback, match)
        if @owner
          @owner.instance_exec(match, &callback)
        else
          @owner_class.instance_exec(match, &callback)
        end
      end

      def stringify_keys(hash)
        hash.each_with_object({}) { |(key, value), out| out[key.to_s] = value }
      end
    end
  end

  module SystemOne
    class Client
      DEFAULT_ENDPOINT = ENV.fetch(
        "GLAUCO_OPENJEV_ENDPOINT",
        "http://127.0.0.1:8090/v1/systemone"
      )

      attr_reader :endpoint

      def initialize(endpoint: DEFAULT_ENDPOINT, api_key: ENV["GLAUCO_OPENJEV_API_KEY"])
        @endpoint = endpoint.to_s
        @api_key = api_key.to_s.empty? ? nil : api_key.to_s
      end

      def decide(state:, questions:, model: nil, options: nil)
        payload = {
          "state" => state,
          "questions" => questions
        }
        payload["model"] = model if model
        payload["options"] = options if options

        result = CognitionHTTP.request_json(
          :post,
          @endpoint,
          payload: payload,
          headers: authorization_headers,
          read_timeout: Float(ENV.fetch("GLAUCO_OPENJEV_TIMEOUT", "120"))
        )

        # Some Jev-compatible APIs wrap the response in {code,message,data}.
        if result["data"].is_a?(Hash) && result["data"]["answers"].is_a?(Hash)
          result["data"]
        else
          result
        end
      end

      private

      def authorization_headers
        return {} unless @api_key

        { "Authorization" => "Bearer #{@api_key}" }
      end
    end
  end

  module Machine
    UNSET = Object.new.freeze

    Operation = Struct.new(:name, :description, :block, keyword_init: true)

    class Builder
      attr_reader :name, :operations, :initial_state

      def initialize(name)
        @name = name.to_s
        @initial_state = :idle
        @operations = {}
      end

      def state(value = UNSET)
        return @initial_state if value.equal?(UNSET)

        @initial_state = normalize_state(value)
      end

      def method(name, description: nil, &block)
        raise ArgumentError, "machine method requires a block" unless block

        key = name.to_sym
        @operations[key] = Operation.new(
          name: key,
          description: (description || key.to_s.tr("_", " ")).to_s,
          block: block
        )
        self
      end

      private

      def normalize_state(value)
        value.respond_to?(:to_sym) ? value.to_sym : value
      end
    end

    class Runtime
      attr_reader :name, :operations, :history, :last_decision

      def initialize(builder, client: nil)
        @name = builder.name
        @state = builder.initial_state
        @operations = builder.operations.dup.freeze
        @client = client || SystemOne::Client.new
        @history = []
        @last_decision = nil
        @mutex = Mutex.new
      end

      def state(value = UNSET)
        return @state if value.equal?(UNSET)

        @state = normalize_state(value)
      end

      def command(text)
        command_text = text.to_s.strip
        raise ArgumentError, "machine command cannot be empty" if command_text.empty?
        raise RuntimeError, "machine #{name} has no methods" if @operations.empty?

        criteria = @operations.each_with_object({}) do |(method_name, operation), out|
          out[method_name.to_s] = operation.description
        end
        criteria["__keep__"] = "Keep the current machine state and invoke no method."

        machine_state = {
          "machine" => @name,
          "current_state" => serializable_state(@state),
          "command" => command_text,
          "available_methods" => criteria.keys,
          "recent_transitions" => @history.last(8)
        }

        response = @client.decide(
          state: machine_state,
          questions: {
            "transition" => {
              "type" => "choice",
              "instructions" => (
                "Choose the machine method that best applies the command to the " \
                "current state. Choose __keep__ when no registered transition " \
                "should run."
              ),
              "criteria" => criteria
            }
          }
        )

        answer = response.dig("answers", "transition") || {}
        choice = answer["choice"].to_s
        @last_decision = answer

        return @state if choice.empty? || choice == "__keep__"

        invoke(choice.to_sym, command: command_text, decision: answer)
      end

      def invoke(name, *args, command: nil, decision: nil, **kwargs)
        operation = @operations[name.to_sym]
        raise NoMethodError, "unknown machine method #{name.inspect} for #{@name}" unless operation

        @mutex.synchronize do
          before = @state
          instance_exec(*args, **kwargs, &operation.block)
          after = @state

          @history << {
            "time" => Time.now.utc.iso8601,
            "method" => operation.name.to_s,
            "from" => serializable_state(before),
            "to" => serializable_state(after),
            "command" => command,
            "decision" => decision
          }
          @state
        end
      end

      def to_h
        {
          "name" => @name,
          "state" => serializable_state(@state),
          "methods" => @operations.keys.map(&:to_s),
          "last_decision" => @last_decision,
          "history" => @history.dup
        }
      end

      def method_missing(name, *args, **kwargs, &block)
        if @operations.key?(name.to_sym) && block.nil?
          return invoke(name, *args, **kwargs)
        end

        super
      end

      def respond_to_missing?(name, include_private = false)
        @operations.key?(name.to_sym) || super
      end

      private

      def normalize_state(value)
        value.respond_to?(:to_sym) ? value.to_sym : value
      end

      def serializable_state(value)
        case value
        when Symbol
          value.to_s
        when Hash
          value.each_with_object({}) do |(key, child), out|
            out[key.to_s] = serializable_state(child)
          end
        when Array
          value.map { |child| serializable_state(child) }
        else
          value
        end
      end
    end
  end

  module Cognition
    @memory_definitions = Hash.new { |hash, key| hash[key] = [] }
    @memory_runtimes = {}
    @machines = Hash.new { |hash, key| hash[key] = {} }

    class << self
      def register_memory(owner_class, definition)
        @memory_definitions[owner_class] << definition
        @memory_runtimes[owner_class]&.register(definition)
        definition
      end

      def memory_runtime(owner_class)
        @memory_runtimes[owner_class] ||= begin
          runtime = Memory::Runtime.new(owner_class: owner_class)
          @memory_definitions[owner_class].each { |definition| runtime.register(definition) }
          runtime
        end
      end

      def has_memory?(owner_class)
        !@memory_definitions[owner_class].empty?
      end

      def bind(owner)
        owner_class = owner.class
        memory_runtime(owner_class).bind(owner) if has_memory?(owner_class)
        owner
      end

      def boot_for(owner)
        owner_class = owner.is_a?(Class) ? owner : owner.class
        bind(owner) unless owner.is_a?(Class)
        memory_runtime(owner_class).boot! if has_memory?(owner_class)
        true
      end

      def register_machine(owner_class, name, &block)
        builder = Machine::Builder.new(name)
        builder.instance_eval(&block) if block
        runtime = Machine::Runtime.new(builder)
        key = name.to_sym
        @machines[owner_class][key] = runtime
        expose_machine_constant(owner_class, name, runtime)
        runtime
      end

      def machine(owner_class, name)
        @machines.fetch(owner_class, {})[name.to_sym]
      end

      def machines(owner_class)
        @machines.fetch(owner_class, {}).dup
      end

      private

      def expose_machine_constant(owner_class, name, runtime)
        raw = name.to_s
        const_name = raw.match?(/\A[A-Z][A-Za-z0-9_]*\z/) ? raw : raw.split(/[^A-Za-z0-9]+/).map(&:capitalize).join
        return if const_name.empty?

        owner_class.const_set(const_name, runtime) unless owner_class.const_defined?(const_name, false)

        # Preserve the compact DSL shown by the framework: Work.command(...).
        unless Object.const_defined?(const_name, false)
          Object.const_set(const_name, runtime)
        end
      end
    end
  end
end

# === GLAUCO METIS MEMORY + OPENJEV MACHINE END ===


if __FILE__ == $PROGRAM_NAME
  command = ARGV.shift

  case command
  when "twa", "bubblewrap", "generate-twa"
    port = (ARGV.shift || ENV.fetch("GLAUCO_TWA_PORT", Frontend.server_port)).to_i
    output = Frontend.generate_twa_for_port!(port: port, public_url: ENV["GLAUCO_TWA_PUBLIC_URL"])
    puts "[Glauco] TWA Bubblewrap gerado em: #{output}"
    manifest_url_file = File.join(output, "manifest-url.txt")
    manifest_url = File.file?(manifest_url_file) ? File.read(manifest_url_file).strip : "https://SEU_HOST/manifest.webmanifest"
    puts "[Glauco] Execute dentro da pasta: bubblewrap init --manifest=#{manifest_url} && bubblewrap build"
    $stdout.flush
    $stderr.flush
    exit! 0
  when "ngrok"
    port = (ARGV.shift || ENV.fetch("GLAUCO_NGROK_PORT", Frontend.server_port)).to_i
    tunnel = Frontend.ensure_ngrok_tunnel_for_port!(port: port)
    puts tunnel[:public_url]
    sleep
  when nil
  else
    warn "Comando desconhecido: #{command}"
    warn "Uso: ruby core/framework/glauco_asked_ruby.rb [ngrok PORT|twa PORT]"
    exit 1
  end
end

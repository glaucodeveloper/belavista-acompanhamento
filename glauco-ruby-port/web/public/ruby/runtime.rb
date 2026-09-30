# frozen_string_literal: true

# Browser-safe runtime used by ruby.wasm in both Wry desktop WebViews and
# Capacitor's Android WebView. It intentionally does not require Net::HTTP,
# Open3, RubyLLM, Java or native Ruby extensions.
require "js"
require "json"

module Ruby
  module Application
    class Manifest
      attr_reader :name, :target_list, :frontend_name, :capability_list, :metadata, :loading_window_block, :loading_window_options

      def initialize(name)
        @name = name.to_s
        @target_list = []
        @frontend_name = nil
        @capability_list = []
        @metadata = {}
        @loading_window_block = nil
        @loading_window_options = {}
      end

      def targets(*values)
        @target_list |= values.flatten.compact.map(&:to_sym)
        self
      end

      def frontend(value = :__ruby_not_set)
        return @frontend_name if value == :__ruby_not_set
        @frontend_name = value&.to_sym
        self
      end

      def capabilities(*values)
        @capability_list |= values.flatten.compact.map(&:to_sym)
        self
      end

      # Optional Ruby-authored pre-main window. The desktop native window stays
      # hidden during framework bootstrap unless this block is declared. The
      # block is evaluated as a Frontend::LoadingWindowComponent while System
      # One loads, then replaced by Application after onstart completes.
      def loading_window(**options, &block)
        raise ArgumentError, "loading_window requires a block" unless block
        @loading_window_options = options.transform_keys(&:to_sym)
        @loading_window_block = block
        self
      end

      def loading_window? = !@loading_window_block.nil?

      def option(key, value = :__ruby_not_set)
        return @metadata[key.to_sym] if value == :__ruby_not_set
        @metadata[key.to_sym] = value
        self
      end

      def target?(value) = @target_list.include?(value.to_sym)
      def capability?(value) = @capability_list.include?(value.to_sym)

      def to_h
        {
          name: @name,
          targets: @target_list.dup,
          frontend: @frontend_name,
          capabilities: @capability_list.dup,
          loading_window: loading_window?,
          loading_window_options: @loading_window_options.dup,
          metadata: @metadata.dup
        }
      end
    end
  end

  class << self
    def application(name = nil, &block)
      return @application_manifest if name.nil? && !block
      manifest = Application::Manifest.new(name || "Ruby application")
      manifest.instance_eval(&block) if block
      @application_manifest = manifest
    end

    def application_manifest = @application_manifest
  end

  module Platform
    module_function

    def bridge
      JS.global[:RubyPlatform]
    end

    def target
      bridge[:target].to_s.to_sym
    end

    def capability?(name)
      value = bridge.call(:hasCapability, name.to_s.to_js)
      value == true || value.to_s == "true"
    end

    def camera = Service.new(bridge[:camera])
    def filesystem = Service.new(bridge[:filesystem])
    def location = Service.new(bridge[:location])
    def model = Service.new(bridge[:model])
    def memory = Service.new(bridge[:memory])
    def client_gov = Service.new(bridge[:clientGov])

    def system_one(state:, question:, criteria:, on_error: nil, &block)
      payload = {
        state: state,
        question: question,
        criteria: criteria.transform_keys(&:to_s)
      }

      promise = bridge[:systemOne].call(:decide, JSON.generate(payload))
      promise.then do |json|
        block.call(JSON.parse(json.to_s)) if block
      end
      promise.catch do |error|
        on_error.call(error.to_s) if on_error
      end
      promise
    end

    def onstart(&block)
      promise = bridge.call(:onstart)
      promise.then do |json|
        block.call(JSON.parse(json.to_s)) if block
      end
      promise
    end

    def system_one_status
      raw = bridge[:systemOne].call(:status)
      JSON.parse(raw.to_s)
    rescue StandardError
      {}
    end

    def system_model
      SystemModelSnapshot.new(system_one_status)
    end


    def browser_jev(id)
      BrowserJevController.new(bridge[:browserJev], id)
    end

    def show_loading_window
      bridge[:window].call(:showLoading)
    end

    def show_main_window
      bridge[:window].call(:showMain)
    end

    def show_error_window
      bridge[:window].call(:showError)
    end

    class SystemModelSnapshot
      def initialize(data)
        @data = (data || {}).transform_keys(&:to_s)
      end

      def [](key) = @data[key.to_s]
      def to_h = @data.dup
      def state = @data["state"]
      def model = @data["model"]
      def progress = @data.fetch("progress", 0).to_f
      def loaded = @data["loaded"]
      def total = @data["total"]
      def error = @data["error"]
      def runtime = @data["runtime"]
      def last_decision = @data["lastDecision"]

      def progress_percent
        (progress * 100).round
      end

      def method_missing(name, *args)
        return @data[name.to_s] if args.empty? && @data.key?(name.to_s)
        super
      end

      def respond_to_missing?(name, private = false)
        @data.key?(name.to_s) || super
      end
    end


    class BrowserJevController
      def instagram_leads_autopilot(
        policy: {},
        auto_send: true,
        max_conversations: 25,
        open_settle_ms: 700,
        send_settle_ms: 600,
        on_error: nil,
        &block
      )
        options = {
          autoSend: !!auto_send,
          maxConversations: max_conversations.to_i,
          openSettleMs: open_settle_ms.to_i,
          sendSettleMs: send_settle_ms.to_i
        }

        promise = @object.call(
          :runInstagramLeadAutopilot,
          @id.to_js,
          JSON.generate(policy || {}).to_js,
          JSON.generate(options).to_js
        )

        handled = promise.then do |json|
          result = JSON.parse(json.to_s)
          block.call(result) if block
          json
        end

        handled = handled.catch do |error|
          on_error.call(error.to_s) if on_error
          nil
        end

        handled
      end


      def initialize(object, id)
        @object = object
        @id = id.to_s
      end

      def command(text, max_steps: 8, settle_ms: 650, decision_timeout_ms: 30_000, on_error: nil, &block)
        command_text = text.to_s.strip
        raise ArgumentError, "browser semantic command cannot be empty" if command_text.empty?

        options = {
          maxSteps: max_steps.to_i,
          settleMs: settle_ms.to_i,
          decisionTimeoutMs: decision_timeout_ms.to_i
        }

        promise = @object.call(
          :command,
          @id.to_js,
          command_text.to_js,
          JSON.generate(options).to_js
        )

        handled = promise.then do |json|
          block.call(JSON.parse(json.to_s)) if block
          json
        end

        handled = handled.catch do |error|
          on_error.call(error.to_s) if on_error
          nil
        end

        handled
      end

      def fill_credential(
        text,
        client_id:,
        field:,
        decision_timeout_ms: 30_000,
        on_error: nil,
        &block
      )
        command_text = text.to_s.strip
        raise ArgumentError, "browser credential command cannot be empty" if command_text.empty?

        options = {
          decisionTimeoutMs: decision_timeout_ms.to_i
        }

        promise = @object.call(
          :fillCredential,
          @id.to_js,
          command_text.to_js,
          client_id.to_s.to_js,
          field.to_s.to_js,
          JSON.generate(options).to_js
        )

        handled = promise.then do |json|
          block.call(JSON.parse(json.to_s)) if block
          json
        end

        handled = handled.catch do |error|
          on_error.call(error.to_s) if on_error
          nil
        end

        handled
      end

      def advance_govbr(
        client_id:,
        settle_ms: 900,
        decision_timeout_ms: 30_000,
        on_error: nil,
        &block
      )
        options = {
          settleMs: settle_ms.to_i,
          decisionTimeoutMs: decision_timeout_ms.to_i
        }

        promise = @object.call(
          :advanceGovBr,
          @id.to_js,
          client_id.to_s.to_js,
          JSON.generate(options).to_js
        )

        handled = promise.then do |json|
          block.call(JSON.parse(json.to_s)) if block
          json
        end

        handled = handled.catch do |error|
          on_error.call(error.to_s) if on_error
          nil
        end

        handled
      end

      def reply_instagram_direct(
        text,
        send: false,
        settle_ms: 450,
        decision_timeout_ms: 30_000,
        on_error: nil,
        &block
      )
        reply_text = text.to_s.strip
        raise ArgumentError, "Instagram reply cannot be empty" if reply_text.empty?

        options = {
          send: !!send,
          settleMs: settle_ms.to_i,
          decisionTimeoutMs: decision_timeout_ms.to_i
        }

        promise = @object.call(
          :replyInstagramDirect,
          @id.to_js,
          reply_text.to_js,
          JSON.generate(options).to_js
        )

        handled = promise.then do |json|
          block.call(JSON.parse(json.to_s)) if block
          json
        end

        handled = handled.catch do |error|
          on_error.call(error.to_s) if on_error
          nil
        end

        handled
      end

      def reply_instagram_unread_directs(
        text,
        max_conversations: 50,
        open_settle_ms: 650,
        send_settle_ms: 550,
        on_error: nil,
        &block
      )
        reply_text = text.to_s.strip
        raise ArgumentError, "Instagram reply cannot be empty" if reply_text.empty?

        options = {
          maxConversations: max_conversations.to_i,
          openSettleMs: open_settle_ms.to_i,
          sendSettleMs: send_settle_ms.to_i
        }

        promise = @object.call(
          :replyInstagramUnreadDirects,
          @id.to_js,
          reply_text.to_js,
          JSON.generate(options).to_js
        )

        handled = promise.then do |json|
          block.call(JSON.parse(json.to_s)) if block
          json
        end

        handled = handled.catch do |error|
          on_error.call(error.to_s) if on_error
          nil
        end

        handled
      end

      def status
        raw = @object.call(:status, @id.to_js)
        JSON.parse(raw.to_s)
      rescue StandardError
        {}
      end
    end

    class Service
      def initialize(object)
        @object = object
      end

      def method_missing(name, *args, **kwargs, &block)
        payload = kwargs.empty? ? args : [*args, kwargs]
        js_args = payload.map { |value| ruby_to_js(value) }
        result = @object.call(name, *js_args)
        block ? result.then { |value| block.call(value) } : result
      end

      def respond_to_missing?(_name, _private = false) = true

      private

      def ruby_to_js(value)
        case value
        when Hash, Array
          JS.global[:JSON].parse(JSON.generate(value))
        else
          value.respond_to?(:to_js) ? value.to_js : value
        end
      end
    end
  end

  module Machine
    COMMAND_GRAMMAR = <<~GRAMMAR.freeze
      machine-command = goal, { "; ", field } ;
      goal            = "GOAL: ", clause ;
      field           = object | constraints | facts ;
      object          = "OBJECT: ", clause ;
      constraints     = "CONSTRAINTS: ", clause ;
      facts           = "FACTS: ", clause ;
      clause          = concise-English-text ;

      Rules:
      - exactly one desired outcome in GOAL;
      - use concrete domain nouns and avoid ambiguous pronouns;
      - do not put a registered Ruby method name in GOAL unless the user explicitly named it;
      - FACTS describe current evidence, not the desired action;
      - CONSTRAINTS restrict the outcome but do not choose a method;
      - keep the payload short and literal;
      - use English for the System One payload because the current kev models are English-only.
    GRAMMAR

    SYSTEM_ONE_QUESTION = (
      "Select exactly one registered Ruby machine method whose described effect " \
      "best satisfies COMMAND given CURRENT_STATE. Choose only among the supplied " \
      "methods. Do not invent a method and do not generate an explanation."
    ).freeze

    Operation = Struct.new(:name, :description, :block, keyword_init: true)

    class Builder
      attr_reader :name, :initial_state, :operations

      def initialize(name)
        @name = name.to_sym
        @initial_state = :idle
        @operations = {}
      end

      def state(value)
        @initial_state = normalize(value)
      end

      def method(name, description = nil, &block)
        raise ArgumentError, "machine method requires a block" unless block
        key = name.to_sym
        @operations[key] = Operation.new(
          name: key,
          description: (description || key.to_s.tr("_", " ")).to_s,
          block: block
        )
      end

      private

      def normalize(value)
        value.respond_to?(:to_sym) ? value.to_sym : value
      end
    end

    class Runtime
      attr_reader :name, :history, :decision_status, :decision_progress,
                  :last_decision, :last_error, :last_command, :last_formal_command

      def initialize(builder)
        @name = builder.name
        @state = builder.initial_state
        @operations = builder.operations
        @history = []
        @listeners = []
        @decision_status = :idle
        @decision_progress = 0.0
        @last_decision = nil
        @last_error = nil
        @last_command = nil
        @last_formal_command = nil
      end

      def on_change(&block)
        @listeners << block if block
        self
      end

      def state(value = :__ruby_read)
        return @state if value == :__ruby_read
        @state = value.respond_to?(:to_sym) ? value.to_sym : value
      end

      def command_grammar
        COMMAND_GRAMMAR
      end

      def command(text)
        raw = text.to_s.strip
        raise ArgumentError, "machine command cannot be empty" if raw.empty?
        raise RuntimeError, "machine #{@name} has no methods" if @operations.empty?

        @last_command = raw
        @last_formal_command = normalize_command(raw)

        criteria = @operations.each_with_object({}) do |(name, operation), out|
          out[name.to_s] = operation.description
        end

        @decision_status = :deciding
        @last_error = nil
        notify_change

        Ruby::Platform.system_one(
          state: system_one_state(@last_formal_command),
          question: SYSTEM_ONE_QUESTION,
          criteria: criteria,
          on_error: proc do |error|
            @decision_status = :error
            @last_error = error.to_s
            notify_change
          end
        ) do |decision|
          @last_decision = decision
          choice = decision["choice"].to_s

          if choice.empty?
            @decision_status = :error
            @last_error = "System One returned an empty machine method"
            notify_change
          else
            @decision_status = :ready
            invoke(choice.to_sym, command: @last_formal_command, decision: decision)
          end
        end
      end

      def invoke(name, *args, command: nil, decision: nil, **kwargs)
        operation = @operations[name.to_sym]
        raise NoMethodError, "unknown machine method #{name.inspect} for #{@name}" unless operation

        before = serializable(@state)
        instance_exec(*args, **kwargs, &operation.block)
        @history << {
          "method" => operation.name.to_s,
          "from" => before,
          "to" => serializable(@state),
          "command" => command,
          "decision" => decision
        }
        notify_change
        @state
      end

      def method_missing(name, *args, **kwargs, &block)
        return invoke(name, *args, **kwargs) if @operations.key?(name.to_sym) && block.nil?
        super
      end

      def respond_to_missing?(name, private = false)
        @operations.key?(name.to_sym) || super
      end

      private

      def normalize_command(text)
        stripped = text.to_s.strip
        return stripped if stripped.match?(/\AGOAL\s*:/i)
        "GOAL: #{stripped}"
      end

      def system_one_state(formal_command)
        lines = [
          "MACHINE: #{@name}",
          "CURRENT_STATE: #{serializable(@state)}",
          "COMMAND: #{formal_command}"
        ]

        recent = @history.last(4)
        unless recent.empty?
          lines << "RECENT_TRANSITIONS:"
          recent.each do |entry|
            lines << "- #{entry["from"]} -> #{entry["method"]} -> #{entry["to"]}"
          end
        end

        lines.join("\n")
      end

      def notify_change
        @listeners.each { |listener| listener.call(self) }
      end

      def serializable(value)
        case value
        when Symbol then value.to_s
        when Hash then value.transform_keys(&:to_s).transform_values { |v| serializable(v) }
        when Array then value.map { |v| serializable(v) }
        else value
        end
      end
    end
  end

  module Memory
    class Condition
      attr_reader :phrase

      def initialize(phrase)
        @phrase = phrase.to_s
        @enter = []
        @present = []
        @leave = []
        @last = false
      end

      def when_enter(&block) = (@enter << block; self)
      def when_present(&block) = (@present << block; self)
      def when_leave(&block) = (@leave << block; self)

      def evaluate(owner)
        Ruby::Platform.memory.match(phrase: @phrase) do |result|
          parsed = JSON.parse(result.to_s) rescue {}
          now = !!parsed["present"]
          event = MemoryEvent.new(@phrase, parsed["text"].to_s, parsed)
          @enter.each { |cb| owner.instance_exec(event, &cb) } if now && !@last
          @present.each { |cb| owner.instance_exec(event, &cb) } if now
          @leave.each { |cb| owner.instance_exec(event, &cb) } if !now && @last
          @last = now
        end
      end
    end

    MemoryEvent = Struct.new(:phrase, :text, :raw)
  end
end

module Kernel
  private

  def application(name, &block)
    Ruby.application(name, &block)
  end
end

module Frontend
  class State
    def initialize(owner, defaults = {})
      @owner = owner
      @data = defaults.transform_keys(&:to_sym)
    end

    def [](key) = @data[key.to_sym]
    def []=(key, value)
      write(key, value)
    end
    def to_h = @data.dup

    def method_missing(name, *args)
      text = name.to_s
      return write(text.delete_suffix("="), args.first) if text.end_with?("=")
      return @data[name] if args.empty? && @data.key?(name)
      super
    end

    def respond_to_missing?(name, private = false)
      key = name.to_s.delete_suffix("=").to_sym
      @data.key?(key) || super
    end

    private

    def write(key, value)
      @data[key.to_sym] = value
      @owner.rerender!
      value
    end
  end

  class Component
    TAGS = %i[
      main section article aside header footer nav div span p h1 h2 h3 h4 h5 h6 figure figcaption
      button input textarea label form ul ol li img a strong small pre code canvas progress details summary
    ].freeze

    class << self
      def state(defaults = nil)
        @state_defaults = defaults.transform_keys(&:to_sym) if defaults
        @state_defaults || (superclass.respond_to?(:state) ? superclass.state : {})
      end

      def ui(&block)
        @render_block = block if block
        @render_block || (superclass.respond_to?(:ui) ? superclass.ui : nil)
      end
      alias render ui

      def machine(name, &block)
        builder = Ruby::Machine::Builder.new(name)
        builder.instance_eval(&block) if block
        runtime = Ruby::Machine::Runtime.new(builder)
        const_name = name.to_s.split(/[^A-Za-z0-9]/).map(&:capitalize).join
        const_set(const_name, runtime) unless const_defined?(const_name, false)
        Object.const_set(const_name, runtime) unless Object.const_defined?(const_name, false)
        machines[name.to_sym] = runtime
      end

      def machines = (@machines ||= {})

      def memory(phrase, &block)
        condition = Ruby::Memory::Condition.new(phrase)
        condition.instance_eval(&block) if block
        memories << condition
        condition
      end

      def memories = (@memories ||= [])
    end

    attr_reader :state

    def initialize(root: nil, render_block: nil)
      @root = root || JS.global[:document].querySelector("#ruby-root")
      @state = State.new(self, self.class.state || {})
      @instance_render_block = render_block
      @node_stack = []
      @rerendering = false
    end

    def platform = Ruby::Platform
    def system_model = platform.system_model

    def mount!
      manifest = Ruby.application_manifest
      if manifest && !manifest.target_list.empty? && !manifest.target?(platform.target)
        raise "application #{manifest.name.inspect} does not target #{platform.target.inspect}"
      end
      validate_capabilities!(manifest) if manifest
      self.class.machines.each_value { |machine| machine.on_change { rerender! } }
      rerender!
      refresh_memory!
      self
    end

    def rerender!
      return self if @rerendering
      @rerendering = true
      @root[:innerHTML] = ""
      @node_stack = [@root]
      block = @instance_render_block || self.class.ui
      instance_eval(&block) if block
      self
    ensure
      @node_stack = []
      @rerendering = false
    end

    def remember(text, **metadata)
      Ruby::Platform.memory.remember(text: text.to_s, metadata: metadata) do |_result|
        refresh_memory!
      end
    end

    def refresh_memory!
      self.class.memories.each { |condition| condition.evaluate(self) }
    end

    TAGS.each do |tag|
      define_method(tag) do |*children, **attrs, &block|
        element(tag, *children, **attrs, &block)
      end
    end

    def text(value)
      current_parent.appendChild(JS.global[:document].createTextNode(value.to_s))
    end

    def element(tag, *children, **attrs, &block)
      node = JS.global[:document].createElement(tag.to_s)
      apply_attributes(node, attrs)
      current_parent.appendChild(node)
      children.each { |child| append_child(node, child) }
      if block
        @node_stack << node
        instance_eval(&block)
        @node_stack.pop
      end
      node
    end


    # Embedded web document rendered inside the application's WebView.
    #
    # Sources are mutually exclusive:
    #   webview_content(id: "site", url: "https://...")
    #   webview_content(id: "page", html: "<!doctype html>...")
    #   webview_content(id: "page") { ...Ruby UI DSL... }
    #
    # The block form is serialized into iframe srcdoc. It is intended for
    # document/UI content; event callbacks inside the block are not transported
    # into the isolated document. Put controlling Ruby callbacks in the parent
    # component, or use html: when the embedded document owns its own JS.

    # Web content surface.
    #
    # Desktop url: creates a native Wry child WebView whose geometry follows
    # this DOM host element. This avoids iframe X-Frame-Options/CSP embedding
    # restrictions.
    #
    # Android/browser url: uses iframe fallback until the Capacitor native
    # child-WebView plugin is installed.
    #
    # html:/block: uses iframe srcdoc because the content is local.
    def webview_content(
      id:,
      url: nil,
      html: nil,
      visible: true,
      title: nil,
      sandbox: nil,
      allow: nil,
      document_style: nil,
      **attrs,
      &block
    )
      sources = [!url.nil?, !html.nil?, !block.nil?].count(true)
      raise ArgumentError, "webview_content accepts only one of url:, html:, or block content" if sources > 1

      if url && JS.global[:RubyNativeWebViewContent].to_s == "true"
        return native_webview_url_host(
          id: id,
          url: url,
          visible: visible,
          title: title,
          **attrs
        )
      end

      iframe_webview_content(
        id: id,
        url: url,
        html: html,
        visible: visible,
        title: title,
        sandbox: sandbox,
        allow: allow,
        document_style: document_style,
        **attrs,
        &block
      )
    end

    alias webviewcontent webview_content
    alias web_contents_view webview_content

    def native_webview_url_host(id:, url:, visible:, title: nil, **attrs)
      node = JS.global[:document].createElement("div")
      node[:id] = id.to_s
      node.setAttribute("data-native-webview-content", "true")
      node.setAttribute("data-webview-content-id", id.to_s)
      node.setAttribute("data-webview-url", url.to_s)
      node.setAttribute("data-webview-visible", visible ? "true" : "false")
      node.setAttribute("aria-label", title.to_s) unless title.nil?

      custom_style = attrs.delete(:style)
      base_style = {
        "display" => visible ? "block" : "none",
        "position" => "relative",
        "width" => "100%",
        "height" => "100%",
        "minWidth" => "1px",
        "minHeight" => "1px",
        "overflow" => "hidden",
        "background" => "transparent"
      }

      if custom_style.is_a?(Hash)
        custom_style.each { |property, value| base_style[property.to_s] = value }
        attrs[:style] = base_style
      else
        attrs[:style] = base_style
      end

      apply_attributes(node, attrs)

      if custom_style && !custom_style.is_a?(Hash)
        node.setAttribute(
          "style",
          [
            "display:#{visible ? 'block' : 'none'}",
            "position:relative",
            "width:100%",
            "height:100%",
            "min-width:1px",
            "min-height:1px",
            "overflow:hidden",
            "background:transparent",
            custom_style.to_s
          ].join(";")
        )
      end

      current_parent.appendChild(node)
      node
    end

    def iframe_webview_content(
      id:,
      url: nil,
      html: nil,
      visible: true,
      title: nil,
      sandbox: nil,
      allow: nil,
      document_style: nil,
      **attrs,
      &block
    )
      frame = JS.global[:document].createElement("iframe")
      frame[:id] = id.to_s
      frame[:title] = title.to_s unless title.nil?
      frame.setAttribute("data-webview-content", "iframe")
      frame.setAttribute("sandbox", sandbox.to_s) unless sandbox.nil?
      frame.setAttribute("allow", allow.to_s) unless allow.nil?

      custom_style = attrs.delete(:style)
      base_style = {
        "display" => visible ? "block" : "none",
        "position" => "relative",
        "width" => "100%",
        "height" => "100%",
        "minWidth" => "1px",
        "minHeight" => "1px",
        "border" => "0",
        "overflow" => "hidden",
        "background" => "transparent"
      }

      if custom_style.is_a?(Hash)
        custom_style.each { |property, value| base_style[property.to_s] = value }
        attrs[:style] = base_style
      else
        attrs[:style] = base_style
      end

      apply_attributes(frame, attrs)

      if custom_style && !custom_style.is_a?(Hash)
        frame.setAttribute(
          "style",
          [
            "display:#{visible ? 'block' : 'none'}",
            "position:relative",
            "width:100%",
            "height:100%",
            "min-width:1px",
            "min-height:1px",
            "border:0",
            "overflow:hidden",
            "background:transparent",
            custom_style.to_s
          ].join(";")
        )
      end

      current_parent.appendChild(frame)

      if block
        container = JS.global[:document].createElement("div")
        @node_stack << container
        begin
          instance_eval(&block)
        ensure
          @node_stack.pop
        end

        inner = container[:innerHTML].to_s
        style_tag =
          if document_style.to_s.empty?
            ""
          else
            "<style>#{document_style}</style>"
          end

        frame[:srcdoc] = (
          "<!doctype html>" \
          "<html><head><meta charset=\"UTF-8\">" \
          "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" \
          "#{style_tag}</head><body>#{inner}</body></html>"
        )
      elsif !html.nil?
        frame[:srcdoc] = html.to_s
      elsif !url.nil?
        frame[:src] = url.to_s
      else
        frame[:src] = "about:blank"
      end

      frame
    end


    def browser_jev(id)
      Ruby::Platform.browser_jev(id)
    end

    private

    def current_parent = @node_stack.last || @root

    def append_child(node, child)
      return if child.nil?
      if child.respond_to?(:to_js) && child.class.name.start_with?("JS")
        node.appendChild(child)
      else
        node.appendChild(JS.global[:document].createTextNode(child.to_s))
      end
    end

    def apply_attributes(node, attrs)
      attrs.each do |key, value|
        name = key.to_s
        if name.start_with?("on") && value.respond_to?(:call)
          event = name.sub(/^on_?/, "")
          node.addEventListener(event, &value)
        elsif name == "class" || name == "class_name"
          node[:className] = value.to_s
        elsif name == "style" && value.is_a?(Hash)
          value.each { |property, v| node[:style][property.to_s] = v.to_s }
        elsif name.start_with?("data_")
          node.setAttribute(name.tr("_", "-"), value.to_s)
        elsif value == true
          node.setAttribute(name.tr("_", "-"), "")
        elsif !value.nil? && value != false
          node.setAttribute(name.tr("_", "-"), value.to_s)
        end
      end
    end

    def validate_capabilities!(manifest)
      missing = manifest.capability_list.reject { |capability| platform.capability?(capability) }
      raise "missing host capabilities: #{missing.join(', ')}" unless missing.empty?
    end
  end

  class LoadingWindowComponent < Component
    STARTUP_EVENT = "ruby:system-one-startup-status".freeze

    def initialize(render_block:, root: nil)
      super(root: root, render_block: render_block)
      @system_one_listener = nil
      @mounted = false
    end

    def mount!
      @mounted = true

      # The loading window observes startup/model-installation progress only.
      # Runtime System One decisions use a different event and therefore can
      # never redraw the pre-main loading component.
      @system_one_listener = proc do |_event|
        rerender! if @mounted
      end

      JS.global.addEventListener(STARTUP_EVENT, &@system_one_listener)
      rerender!
      self
    end

    def unmount!
      # Set this first. Even if WebAssembly/JS callback identity prevents
      # removeEventListener from matching, a stale callback becomes inert and
      # cannot clear the main application's #ruby-root.
      @mounted = false

      if @system_one_listener
        begin
          JS.global.removeEventListener(STARTUP_EVENT, &@system_one_listener)
        rescue StandardError
          # Mounted guard above is the lifecycle authority.
        end
        @system_one_listener = nil
      end

      @root[:innerHTML] = "" if @root
      self
    end

    def rerender!
      return self unless @mounted
      super
    end
  end
end

module Ruby
  module Boot
    module_function

    def loading_window?
      manifest = Ruby.application_manifest
      !!(manifest && manifest.loading_window?)
    end

    def prepare_loading!
      return false unless loading_window?

      manifest = Ruby.application_manifest
      @loading_component&.unmount!
      @loading_component = Frontend::LoadingWindowComponent.new(
        render_block: manifest.loading_window_block
      )
      @loading_component.mount!
      Ruby::Platform.show_loading_window
      true
    end

    def mount_application!
      @loading_component&.unmount!
      @loading_component = nil

      @application = ::Application.new
      @application.mount!


      Ruby::Platform.show_main_window
      @application
    rescue StandardError
      Ruby::Platform.show_error_window
      raise
    end
  end
end

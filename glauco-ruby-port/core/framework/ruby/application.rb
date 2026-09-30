# frozen_string_literal: true

# Public application manifest for the glauco-infused Ruby distribution.
# The public vocabulary remains Ruby; platform-specific implementation names
# (Capacitor, Wry, WebView2, etc.) stay behind the runtime.
module Ruby
  module Application
    class Manifest
      attr_reader :name, :target_list, :frontend_name, :capability_list, :metadata

      def initialize(name)
        @name = name.to_s
        @target_list = []
        @frontend_name = nil
        @capability_list = []
        @metadata = {}
      end

      def targets(*values)
        @target_list |= values.flatten.compact.map { |value| value.to_sym }
        self
      end

      def frontend(value = :__ruby_not_set)
        return @frontend_name if value == :__ruby_not_set

        @frontend_name = value&.to_sym
        self
      end

      def capabilities(*values)
        @capability_list |= values.flatten.compact.map { |value| value.to_sym }
        self
      end

      def option(key, value = :__ruby_not_set)
        return @metadata[key.to_sym] if value == :__ruby_not_set

        @metadata[key.to_sym] = value
        self
      end

      def target?(name)
        @target_list.include?(name.to_sym)
      end

      def capability?(name)
        @capability_list.include?(name.to_sym)
      end

      def to_h
        {
          name: @name,
          targets: @target_list.dup,
          frontend: @frontend_name,
          capabilities: @capability_list.dup,
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

    def application_manifest
      @application_manifest
    end
  end
end

module Kernel
  private

  def application(name, &block)
    Ruby.application(name, &block)
  end
end

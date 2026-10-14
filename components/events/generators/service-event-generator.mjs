const reportEventFailure = (onError, error, context) => {
  try {
    onError(error, context);
  } catch (reportingError) {
    console.error("Event service error reporter failed.", reportingError);
  }
};

export const createServiceEventGenerator = ({
  service,
  onError = (error, context) =>
    console.error(`[event:${context.service}/${context.action}]`, error),
}) => {
  let active = true;
  const program = (function* () {
    while (true) {
      const message = yield { type: "waiting", service };
      if (!message?.handler) continue;
      try {
        yield {
          type: "handled",
          service,
          action: message.action,
          result: message.handler(message),
        };
      } catch (error) {
        yield { type: "failed", service, action: message.action, error };
      }
    }
  })();
  program.next();

  const consume = (step) => {
    const value = step?.value;
    if (value?.type === "failed") {
      reportEventFailure(onError, value.error, {
        service: value.service,
        action: value.action,
      });
    } else if (
      value?.type === "handled" &&
      typeof value.result?.then === "function"
    ) {
      void value.result.catch((error) =>
        reportEventFailure(onError, error, {
          service: value.service,
          action: value.action,
        }),
      );
    }
    return value;
  };

  return {
    service,
    program,
    dispatch(message) {
      if (!active) return;
      const result = consume(program.next(message));
      program.next();
      return result;
    },
    dispose() {
      if (!active) return;
      active = false;
      program.return();
    },
  };
};

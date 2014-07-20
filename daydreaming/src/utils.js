define (function() {
  "use strict";

  function result(input, args, context) {
    if (typeof(input) === "function") {
      return input.apply(context, args||[]);
    }
    return input;
  }

  function noop() {
  }

  return {
    result: result,
    noop: noop
  };

});

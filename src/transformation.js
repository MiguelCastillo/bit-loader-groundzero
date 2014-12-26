(function() {
  "use strict";

  function Transformation(manager) {
    this.manager = manager;
  }

  Transformation.prototype.transform = function(mod) {
    return mod;
  };

  module.exports = Transformation;
})();

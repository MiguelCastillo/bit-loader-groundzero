(function(root) {
  "use strict";

  var storage = {};
  root.MLoaderGlobalModule = null;

  function Registry() {
  }

  Registry.getById = function(id) {
    if (!id) {
      id = (new Date()).getTime().toString();
    }

    return storage[id] || (storage[id] = {
      _id       : id,
      loaded    : {},
      modules   : {}, // Modules being resolved or already resolved
      anonymous : []  // Anonymous modules not yet used.  Only used when a modules is being defined
    });
  };

  Registry.clearById = function(id) {
    var _item;
    if (storage.hasOwnProperty(id)) {
      _item = storage[id];
      delete storage[id];
    }
    return _item;
  };

  Registry.getGlobalModule = function() {
    if (!root.MLoaderGlobalModule) {
      root.MLoaderGlobalModule = {
        modules: {},
        anonymous: []
      };
    }

    return root.MLoaderGlobalModule;
  };

  Registry.clearGlobalModule = function() {
    var _module = root.MLoaderGlobalModule;
    root.MLoaderGlobalModule = null;
    return _module;
  };

  module.exports = Registry;
})(window || this);

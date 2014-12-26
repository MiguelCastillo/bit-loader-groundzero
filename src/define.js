(function() {
  "use strict";

  var Module   = require('./module'),
      Registry = require('./registry');

  function Define(manager) {
    this.manager = manager;
    this.context = (manager && manager.context) || Registry.getById();
  }

  /**
   * AMD compliant define interface
   * Defines a module to be loaded and consumed by other modules.  Two types of modules
   * come through here, named and anonymous.
   */
  Define.prototype.define = function () {
    var _module = Define.adapters.apply({}, arguments),
        context = Registry.getGlobalModule();

    if (_module.name) {
      // Do no allow modules to override other modules...
      if (context.modules.hasOwnProperty(_module.name)) {
        throw new Error("Module " + _module.name + " is already defined");
      }
      else {
        context.modules[_module.name] = _module;
      }
    }
    else {
      context.anonymous.push(_module);
    }
  };

  /**
   * Adapter interfaces to define modules
   */
  Define.adapters = function (name, deps, factory) {
    var signature = ["", typeof name, typeof deps, typeof factory].join("/");
    var adapter   = Define.adapters[signature];

    if (!adapter) {
      throw new TypeError("Module define signature isn't valid: " + signature);
    }

    return adapter.apply(this, arguments);
  };

  Define.adapters.create = function (name, deps, factory) {
    var _module = {
      type: Module.Type.AMD,
      cjs: [],
      name: name,
      deps: deps,
      factory: factory
    };

    if (typeof(factory) !== "function") {
      _module.code = factory;
    }

    return new Module(_module);
  };

  Define.adapters["/string/object/function"]        = function (name, deps, factory) { return Define.adapters.create(name, deps, factory); };
  Define.adapters["/string/function/undefined"]     = function (name, factory)       { return Define.adapters.create(name, [], factory); };
  Define.adapters["/object/function/undefined"]     = function (deps, factory)       { return Define.adapters.create(undefined, deps, factory); };
  Define.adapters["/object/undefined/undefined"]    = function (data)                { return Define.adapters.create(undefined, [], data); };
  Define.adapters["/string/object/undefined"]       = Define.adapters["/string/function/undefined"];
  Define.adapters["/function/undefined/undefined"]  = Define.adapters["/object/undefined/undefined"];
  Define.adapters["/string/undefined/undefined"]    = Define.adapters["/object/undefined/undefined"];
  Define.adapters["/number/undefined/undefined"]    = Define.adapters["/object/undefined/undefined"];
  Define.adapters["/undefined/undefined/undefined"] = Define.adapters["/object/undefined/undefined"];

  module.exports = Define;
})();

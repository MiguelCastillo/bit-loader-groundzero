(function (root) {
  "use strict";

  var File           = require('./file'),
      Utils          = require('./utils'),
      Loader         = require('./loader'),
      Define         = require('./define'),
      Import         = require('./import'),
      Require        = require('./require'),
      Resolver       = require('./resolver'),
      Registry       = require('./registry'),
      Fetch          = require('./fetchscript'),
      Transformation = require('./transformation'),
      Promise        = require('spromise');

  function MLoader(options) {
    this.settings = Utils.extend({}, MLoader.defaults, options);
    this.context  = Registry.getById();

    var providers = {
      loader         : MLoader.Loader(this),
      resolver       : MLoader.Resolver(this),
      import         : MLoader.Import(this),
      require        : MLoader.Require(this),
      define         : MLoader.Define(this),
      transformation : MLoader.Transformation(this)
    };

    // Expose interfaces
    this.fetch     = Fetch;
    this.providers = providers;
    this.define    = providers.define.define.bind(providers.define);
    this.load      = providers.loader.load.bind(providers.loader);
    this.resolve   = providers.resolver.resolve.bind(providers.resolver);
    this.import    = providers.import.import.bind(providers.import);
    this.require   = providers.require.require.bind(providers.require);
  }

  MLoader.prototype.clear = function() {
    return Registry.clearById(this.context._id);
  };

  MLoader.prototype.configure = function(options) {
    Utils.merge(this.settings, options);
  };

  MLoader.configure = function (options) {
    Utils.merge(mloader.settings, options);
    return new MLoader(options);
  };

  MLoader.defaults = {
    global: this,
    baseUrl: "",
    cache: true,
    deps: [],
    paths: {},
    shim: {},
    packages: []
  };

  // Expose constructors and utilities
  MLoader.File           = File;
  MLoader.Utils          = Utils;
  MLoader.Promise        = Promise;
  MLoader.Registry       = Registry;
  MLoader.Loader         = factory(Loader);
  MLoader.Resolver       = factory(Resolver);
  MLoader.Import         = factory(Import);
  MLoader.Require        = factory(Require);
  MLoader.Define         = factory(Define);
  MLoader.Transformation = factory(Transformation);

  function factory(Constructor) {
    return function(context) {
      return new Constructor(context || mloader);
    };
  }

  var mloader     = new MLoader(root.require);
  MLoader.require = mloader.require;
  MLoader.import  = mloader.import;
  MLoader.define  = mloader.define;

  // Expose `amd` for modules to properly detect support for `amd`
  mloader.define.amd = {};

  module.exports  = MLoader;
})(typeof(window) !== 'undefined' ? window : this);

(function (root) {
  "use strict";

  var File           = require('./file'),
      Utils          = require('./utils'),
      Loader         = require('./loader'),
      Module         = require('./module'),
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

    this._fetch          = Fetch;
    this._loader         = new Loader(this);
    this._resolver       = new Resolver(this);
    this._import         = new Import(this);
    this._require        = new Require(this);
    this._define         = new Define(this);
    this._transformation = new Transformation(this);

    // Expose interfaces
    this.define  = this._define.define.bind(this._define);
    this.load    = this._loader.load.bind(this._loader);
    this.resolve = this._resolver.resolve.bind(this._resolver);
    this.import  = this._import.import.bind(this._import);
    this.require = this._require.require.bind(this._require);
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
  MLoader.File     = File;
  MLoader.Utils    = Utils;
  MLoader.Promise  = Promise;
  MLoader.Registry = Registry;
  MLoader.Loader   = factory(Loader);
  MLoader.Import   = factory(Import);
  MLoader.Module   = factory(Module);
  MLoader.Define   = factory(Define);
  MLoader.Resolver = factory(Resolver);

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
})(window || this);

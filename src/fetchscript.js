(function() {
  "use strict";

  var Promise  = require("spromise"),
      Registry = require("./registry");

  function Fetch(_module) {
    var deferred = Promise.defer();
    var head     = document.getElementsByTagName("head")[0] || document.documentElement;
    var script   = document.createElement("script");
    var _url     = _module.file.toUrl();

    if (_module.urlArgs) {
      _url += "?" + _module.urlArgs;
    }

    script.setAttribute("async",   "true");
    script.setAttribute("charset", "utf-8");
    script.setAttribute("type",    "text/javascript");
    script.setAttribute("src",     _url);

    //
    // Code for detecting when the script is done loading was extracted from:
    // http://stackoverflow.com/questions/4845762/onload-handler-for-script-tag-in-internet-explorer
    // http://stevesouders.com/efws/script-onload.php
    //

    // Handle Script loading
    var done = false;

    // Attach handlers for all browsers
    script.onload = script.onreadystatechange = function() {
      if (!done && (!this.readyState ||
            this.readyState === "loaded" ||
            this.readyState === "complete")) {

        // We are done...
        done = true;

        // Collect module information and clear it from the registry.
        var globalModule = Registry.clearGlobalModule();
        var mod = globalModule.modules[_module.name];

        // Check if the module was loaded as a named module or an anonymous module.
        // If it was loaded as an anonymous module, then we need to manually add it
        // the list of named modules
        if (!mod && globalModule.anonymous.length) {
          mod      = globalModule.anonymous.shift();
          mod.name = _module.name;

          // Make module available as pending resolution so that it can be loaded
          // whenever it is requested as dependency.
          globalModule.modules[mod.name] = mod;
        }

        // Resolve with emtpty string so that moduleMeta can be processed
        deferred.resolve(globalModule);

        // Handle memory leak in IE
        script.onload = script.onreadystatechange = null;
        if (head && script.parentNode) {
          head.removeChild(script);
        }
      }
    };

    head.appendChild(script);
    return deferred.promise;
  }

  module.exports = Fetch;
})();

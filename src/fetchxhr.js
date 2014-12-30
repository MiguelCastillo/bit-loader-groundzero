(function() {
  "use strict";

  var Ajax   = require('./ajax'),
      Define = require('./define');

  function Fetch(moduleMeta) {
    var _url = moduleMeta.file.toUrl();

    return (new Ajax(_url)).then(function(source) {
      moduleMeta.source  = source;
      moduleMeta.compile = function() {
        var __header = "",
            __footer = "",
            __module = {exports: {}};

        //__header += "'use strict';"; // Make this optional
        //__header += "debugger;";     // Make this optional
        __footer += ";//# sourceURL=" + _url;

        /* jshint -W061, -W054 */
        (new Function("module", __header + source + __footer))(__module);
        //(new Function("module", "exports", __header + source + __footer))(__module, __module.exports);
        /* jshint +W061, +W054 */

        moduleMeta.loaded = Define.clearGlobalModule();
        return Define.compile(moduleMeta);
      };

      return moduleMeta;
    });
  }

  module.exports = Fetch;
})();

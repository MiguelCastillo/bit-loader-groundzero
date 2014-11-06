// Load up rjasmine
define(["rjasmine"], function (RJasmine) {
  // Create instance of jasmine
  var rjasmine = new RJasmine({
    reporters: {
      console: true,
      html: true
    }
  });

  // Make api global and jasmine itself so that reporters can have an easy
  // way to register themeselves
  RJasmine.extend(window, rjasmine.api);
  window.jasmine = RJasmine.jasmine;

  rjasmine.ready(function() {
    require([
      "specs/module",
      "specs/file"
    ], rjasmine.execute);
  });
});

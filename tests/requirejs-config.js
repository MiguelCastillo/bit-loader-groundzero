// Configure requirejs all the tests are going to get their resources from
require.config({
  "paths": {
    "dist": "../dist",
    "src": "../src",
    "underscore": "lib/underscore/underscore",
    "jquery": "lib/jquery/dist/jquery",
    "rjasmine": "lib/rjasmine/dist/rjasmine-debug"
  },
  "shim": {
    "dist/module": {
      "exports": "Module"
    }
  }
});

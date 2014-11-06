var page    = require('webpage').create();
var system  = require('system');
var url     = "http://localhost:8000/tests/SpecRunner.html";

page.onConsoleMessage = function (msg) {
  console.log(msg);
};

page.open(system.args[1] || url, function (status) {
  //Page is loaded!
  if (status !== 'success') {
    console.log('Unable to load the address!');
  }
  else {
    //Using a delay to make sure the JavaScript is executed in the browser
    window.setTimeout(function () {
      phantom.exit();
    }, 10000);
  }
});

var Browser = require("zombie");
var assert = require("assert");

// Load the page from localhost
browser = new Browser();
//browser.visit("file://" + __dirname + "/tests.html", { silent: false });
browser.visit("http://localhost:8000/tests/SpecRunner.html", { silent: false });

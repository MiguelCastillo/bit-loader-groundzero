var global = this;

define(["dist/module"], function(Module) {
  Module = global.Module;


  Module.configure({
    "baseUrl": "../"
  });


  describe("Modules with simple dependencies", function() {
    it("empty object", function() {
      return Module.import("tests/js/empty").done(function(result) {
        expect(typeof result).toBe("object");
      });
    });

    it("undefined", function() {
      return Module.import("tests/js/undefined").done(function(result) {
        expect(result).toBeUndefined();
      });
    });

    it("null", function() {
      return Module.import("tests/js/null").done(function(result) {
        expect(result).toBe(null);
      });
    });

    it("number", function() {
      return Module.import("tests/js/number").done(function(result) {
        expect(typeof result).toBe("number");
        expect(result).toBe(3.14);
      });
    });

    it("string", function() {
      return Module.import("tests/js/string").done(function(result) {
        expect(result).toBe("Just some string value");
      });
    });

    it("function return object with funciton and property", function() {
      return Module.import("tests/js/simple").done(function(result) {
        expect(result.init()).toBe("initialized!");
        expect(result.hello).toBe("world");
      });
    });

    it("Multiple dependencies", function() {
      return Module.import(["tests/js/number", "tests/js/string", "tests/js/number"]).done(function(number, string, number2) {
        expect(number).toBe(3.14);
        expect(string).toBe("Just some string value");
        expect(number2).toBe(3.14);
      });
    });
  });


  describe("Modules with nested dependencies", function() {
    it("One dependency", function() {
      return Module.import("tests/js/onedependency").done(function(result) {
        expect(typeof result).toBe("object");
        expect(typeof result.onedependency).toBe("object");
        expect(typeof result.onedependency.init).toBe("function");
        expect(result.onedependency.init()).toBe("initialized!");
        expect(result.onedependency.hello).toBe("world");
      });
    });


    it("Two dependencies", function() {
      return Module.import("tests/js/twodependencies").done(function(result) {
        expect(typeof result).toBe("object");
        expect(typeof result.one).toBe("object");
        expect(result.one.init()).toBe("initialized!");
        expect(result.one.hello).toBe("world");
        expect(result.two).toBe(3.14);
      });
    });


    it("Three dependencies with several levels deep", function() {
      return Module.import("tests/js/threedependencies").done(function(result) {
        expect(typeof result).toBe("object");
        expect(typeof result.one).toBe("object");
        expect(result.one.init()).toBe("initialized!");
        expect(result.one.hello).toBe("world");
        expect(result.two).toBe(3.14);
        expect(typeof result.three.one.init).toBe("function");
        expect(result.three.one.hello).toBe("world");
        expect(result.three.two).toBe(3.14);
      });
    });


    it("Deep dependencies", function() {
      return Module.import("tests/js/deepdependencies").done(function(result) {
        expect(typeof result).toBe("object");
        expect(typeof result.one).toBe("object");
        expect(result.one.init()).toBe("initialized!");
        expect(result.one.hello).toBe("world");
        expect(result.two).toBe(3.14);
        expect(typeof result.three.one.init).toBe("function");
        expect(result.three.one.hello).toBe("world");
        expect(result.three.two).toBe(3.14);
        expect(result.four.one).toBe(1900);
        expect(result.four.two.deep2.onedependency.hello).toBe("world");
        expect(result.four.three.deep3.deep2.onedependency.hello).toBe("world");
      });
    });

  });


  describe("Modules paths", function() {
    Module.configure({
      "baseUrl": "../",
      "paths": {
        "deepdependencies": "tests/js/deepdependencies",
        "string": "tests/js/string",
        "pathconfig": "tests/js/pathconfig",
        "1": "tests/js/deep1",
        "2": "tests/js/deep2",
        "3": "tests/js/deep3"
      }
    });


    it("string", function() {
      return Module.import("string").done(function(result) {
        expect(result).toBe("Just some string value");
      });
    });

    it("deepdependencies", function() {
      return Module.import("deepdependencies").done(function(result) {
        expect(typeof result).toBe("object");
        expect(typeof result.one).toBe("object");
        expect(result.one.init()).toBe("initialized!");
        expect(result.one.hello).toBe("world");
        expect(result.two).toBe(3.14);
        expect(result.three.one.init()).toBe("initialized!");
        expect(result.three.one.hello).toBe("world");
        expect(result.three.two).toBe(3.14);
        expect(result.four.one).toBe(1900);
        expect(result.four.two.deep2.onedependency.hello).toBe("world");
        expect(result.four.three.deep3.deep2.onedependency.hello).toBe("world");
      });
    });

    it("all paths", function() {
      return Module.import("pathconfig").done(function(result) {
        expect(typeof result).toBe("object");
        expect(typeof result.one).toBe("number");
        expect(result.one).toBe(1900);
        expect(typeof result.two).toBe("object");
        expect(result.two.deep2.onedependency.hello).toBe("world");
        expect(result.two.deep2.onedependency.init()).toBe("initialized!");
        expect(typeof result.three).toBe("object");
        expect(result.three.deep3.deep2.onedependency.hello).toBe("world");
        expect(result.three.deep3.deep2.onedependency.init()).toBe("initialized!");
      });
    });
  });


});

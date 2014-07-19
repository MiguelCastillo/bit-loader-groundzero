var global = this;

define(["dist/module"], function(Module) {
  Module = global.Module;

  Module.configure({
    "baseUrl": "../"
  });

  describe("Module", function() {

    it("require rawModule", function() {
      return Module.import("tests/js/rawModule").done(function(result) {
        expect(typeof result.init).toBe("function");
        expect(result.hello).toBe("world");
      });
    });

  });

});

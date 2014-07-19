var global = this;

define(["dist/module"], function(Module) {
  "use strict";

  Module = global.Module;

  describe("File", function() {
    describe("object", function() {
      it("simple path, no base", function() {
        var file = new Module.File("/path", "");
        expect(file.protocol).toBeUndefined();
        expect(file.name).toBe("path");
        expect(file.path).toBe("/");
      });

      it("simple path with simple base", function() {
        var file = new Module.File("path", "baseuri");
        expect(file.protocol).toBeUndefined();
        expect(file.name).toBe("path");
        expect(file.path).toBe("baseuri/");
      });

      it("module with leading double dot and a longer path", function() {
        var file = new Module.File("../module1", "baseuri/path1/path2");
        expect(file.protocol).toBeUndefined();
        expect(file.name).toBe("module1");
        expect(file.path).toBe("baseuri/path1/");
      });
    });


    describe("parseFileName", function() {
      it("Simple file", function() {
        var fileName = Module.File.parseFileName("/mortarjs.html");
        expect(fileName.name).toBe("mortarjs.html");
        expect(fileName.path).toBe("/");
      });

      it("Starting dot directory", function() {
        var fileName = Module.File.parseFileName("./mortarjs.html");
        expect(fileName.name).toBe("mortarjs.html");
        expect(fileName.path).toBe("./");
      });

      it("Just file", function() {
        var fileName = Module.File.parseFileName("mortarjs.html");
        expect(fileName.name).toBe("mortarjs.html");
        expect(fileName.path).toBe("");
      });

      it("Starting dot file", function() {
        var fileName = Module.File.parseFileName(".mortarjs.html");
        expect(fileName.name).toBe(".mortarjs.html");
        expect(fileName.path).toBe("");
      });

      it("Deep path file", function() {
        var fileName = Module.File.parseFileName("/this/is/a/looong/path/to/the/file/mortarjs.html");
        expect(fileName.name).toBe("mortarjs.html");
        expect(fileName.path).toBe("/this/is/a/looong/path/to/the/file/");
      });

      it("Deep path with dot leading file", function() {
        var fileName = Module.File.parseFileName("/this/is/a/looong/path/to/the/file/.mortarjs.html");
        expect(fileName.name).toBe(".mortarjs.html");
        expect(fileName.path).toBe("/this/is/a/looong/path/to/the/file/");
      });
    });


    describe("Merge path", function() {
      it("simple path, no base", function() {
        var path = Module.File.mergePaths("/path", "");
        expect(path).toBe("/path");
      });

      it("simple path, simple base", function() {
        var path = Module.File.mergePaths("/path", "/");
        expect(path).toBe("/path");
      });

      it("relative path, simple base", function() {
        var path = Module.File.mergePaths("./path", "/");
        expect(path).toBe("/path");
      });

      it("skip path with base", function() {
        var path = Module.File.mergePaths("../path", "/");
        expect(path).toBe("/path");
      });

      it("skip path with dotted base", function() {
        var path = Module.File.mergePaths("../path", "./");
        expect(path).toBe("./path");
      });

      it("skip more path with base", function() {
        var path = Module.File.mergePaths("../../../path", "/");
        expect(path).toBe("/path");
      });

      it("skip more path with dotted base", function() {
        var path = Module.File.mergePaths("../../../path", "./");
        expect(path).toBe("./path");
      });

      it("skip path with more base", function() {
        var path = Module.File.mergePaths("../path", "/container/of my/child");
        expect(path).toBe("/container/of my/path");
      });

      it("skip more path with more base", function() {
        var path = Module.File.mergePaths("../../../path", "/container/of my/child/part1/part2/part3");
        expect(path).toBe("/container/of my/child/path");
      });

      it("skip more path with more dotted base", function() {
        var path = Module.File.mergePaths("../../../path", "./container/of my/child/part1/part2/part3");
        expect(path).toBe("./container/of my/child/path");
      });
    });


    describe("parseUri", function() {
      describe("HTTP", function() {
        it("Simple url", function() {
          var urlo = Module.File.parseUri("http://hoistedjs.com");
          expect(urlo.origin).toBe("http://hoistedjs.com");
          expect(urlo.protocol).toBe("http:");
          expect(urlo.protocolmark).toBe("//");
          expect(urlo.hostname).toBe("hoistedjs.com");
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBeUndefined();
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("url with hash", function() {
          var urlo = Module.File.parseUri("http://hoistedjs.com#migration/topic/data");
          expect(urlo.origin).toBe("http://hoistedjs.com");
          expect(urlo.protocol).toBe("http:");
          expect(urlo.protocolmark).toBe("//");
          expect(urlo.hostname).toBe("hoistedjs.com");
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBeUndefined();
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBe("#migration/topic/data");
        });

        it("url with search", function() {
          var urlo = Module.File.parseUri("http://hoistedjs.com?topic=data");
          expect(urlo.origin).toBe("http://hoistedjs.com");
          expect(urlo.protocol).toBe("http:");
          expect(urlo.protocolmark).toBe("//");
          expect(urlo.hostname).toBe("hoistedjs.com");
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBeUndefined();
          expect(urlo.search).toBe("?topic=data");
          expect(urlo.hash).toBeUndefined();
        });

        it("url with search and hash", function() {
          var urlo = Module.File.parseUri("http://hoistedjs.com?topic=data#migration/path");
          expect(urlo.origin).toBe("http://hoistedjs.com");
          expect(urlo.protocol).toBe("http:");
          expect(urlo.protocolmark).toBe("//");
          expect(urlo.hostname).toBe("hoistedjs.com");
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBeUndefined();
          expect(urlo.search).toBe("?topic=data");
          expect(urlo.hash).toBe("#migration/path");
        });

        it("url with search and hash and empty path", function() {
          var urlo = Module.File.parseUri("http://hoistedjs.com/?topic=data#migration/path");
          expect(urlo.origin).toBe("http://hoistedjs.com");
          expect(urlo.protocol).toBe("http:");
          expect(urlo.protocolmark).toBe("//");
          expect(urlo.hostname).toBe("hoistedjs.com");
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("/");
          expect(urlo.search).toBe("?topic=data");
          expect(urlo.hash).toBe("#migration/path");
        });

        it("url with search and hash and simple path", function() {
          var urlo = Module.File.parseUri("http://hoistedjs.com/moretesting?topic=data#migration/path");
          expect(urlo.origin).toBe("http://hoistedjs.com");
          expect(urlo.protocol).toBe("http:");
          expect(urlo.protocolmark).toBe("//");
          expect(urlo.hostname).toBe("hoistedjs.com");
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("/moretesting");
          expect(urlo.search).toBe("?topic=data");
          expect(urlo.hash).toBe("#migration/path");
        });

        it("url with search and hash and simple path with port", function() {
          var urlo = Module.File.parseUri("http://hoistedjs.com:599/moretesting?topic=data#migration/path");
          expect(urlo.origin).toBe("http://hoistedjs.com:599");
          expect(urlo.protocol).toBe("http:");
          expect(urlo.protocolmark).toBe("//");
          expect(urlo.hostname).toBe("hoistedjs.com");
          expect(urlo.port).toBe('599');
          expect(urlo.path).toBe("/moretesting");
          expect(urlo.search).toBe("?topic=data");
          expect(urlo.hash).toBe("#migration/path");
        });
      });


      describe("FILE", function() {
        it("Empty string", function() {
          var urlo, _ex;
          try {
            urlo = Module.File.parseUri("");
          }
          catch (ex) {
            _ex = ex;
            expect(ex.message).toBe("Must provide a string to parse");
          }
          finally {
            expect(_ex).toBeDefined();
            expect(urlo).toBeUndefined();
          }
        });

        it("Single forward slash", function() {
          var urlo = Module.File.parseUri("/");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBeUndefined();
          expect(urlo.protocolmark).toBeUndefined();
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("/");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("Single dot with forward slash", function() {
          var urlo = Module.File.parseUri("./");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBeUndefined();
          expect(urlo.protocolmark).toBeUndefined();
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("./");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("Single dot with multiple back slashes", function() {
          var urlo = Module.File.parseUri(".\\\\\\");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBeUndefined();
          expect(urlo.protocolmark).toBeUndefined();
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("./");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("with c: drive", function() {
          var urlo = Module.File.parseUri("file:///c:/program files");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBe("file:");
          expect(urlo.protocolmark).toBe("///");
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("c:/program files");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("with c: drive and path", function() {
          var urlo = Module.File.parseUri("file:///c:/program files/mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBe("file:");
          expect(urlo.protocolmark).toBe("///");
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("c:/program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("with with no drive letter and path", function() {
          var urlo = Module.File.parseUri("file:////program files/mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBe("file:");
          expect(urlo.protocolmark).toBe("///");
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("/program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("with with no drive letter and path starting with a single dot", function() {
          var urlo = Module.File.parseUri("file:///./program files/mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBe("file:");
          expect(urlo.protocolmark).toBe("///");
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("./program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("with with no drive letter with back slashes in the path starting with a single leading dot", function() {
          var urlo = Module.File.parseUri("file:///.\\program files\\mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBe("file:");
          expect(urlo.protocolmark).toBe("///");
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("./program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("with with no drive letter with back slashes in the path starting with a two leading dot", function() {
          var urlo = Module.File.parseUri("file:///..\\program files\\mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBe("file:");
          expect(urlo.protocolmark).toBe("///");
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("../program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("leading forward slash", function() {
          var urlo = Module.File.parseUri("/program files/mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBeUndefined();
          expect(urlo.protocolmark).toBeUndefined();
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("/program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("leading back slash", function() {
          var urlo = Module.File.parseUri("\\program files/mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBeUndefined();
          expect(urlo.protocolmark).toBeUndefined();
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("/program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("mixed slashes", function() {
          var urlo = Module.File.parseUri("\\/program files//\\/mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBeUndefined();
          expect(urlo.protocolmark).toBeUndefined();
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("/program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("leading dot with forward slash", function() {
          var urlo = Module.File.parseUri("./program files/mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBeUndefined();
          expect(urlo.protocolmark).toBeUndefined();
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("./program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("two leading dots with forward slash", function() {
          var urlo = Module.File.parseUri("../program files/mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBeUndefined();
          expect(urlo.protocolmark).toBeUndefined();
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("../program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });

        it("two leading dots with back slash", function() {
          var urlo = Module.File.parseUri("..\\program files/mortarjs");
          expect(urlo.origin).toBeUndefined();
          expect(urlo.protocol).toBeUndefined();
          expect(urlo.protocolmark).toBeUndefined();
          expect(urlo.hostname).toBeUndefined();
          expect(urlo.port).toBeUndefined();
          expect(urlo.path).toBe("../program files/mortarjs");
          expect(urlo.search).toBeUndefined();
          expect(urlo.hash).toBeUndefined();
        });
      });
    });


    describe("normalizeSlashes", function() {
      it("2 leading forward  slashes", function() {
        expect(Module.File.normalizeSlashes("//test")).toBe("/test");
      });

      it("2 leading back slashes", function() {
        expect(Module.File.normalizeSlashes("\\\\test")).toBe("/test");
      });

      it("2 ending forward slashes", function() {
        expect(Module.File.normalizeSlashes("test//")).toBe("test/");
      });

      it("2 ending back slashes", function() {
        expect(Module.File.normalizeSlashes("test\\\\")).toBe("test/");
      });

      it("2 leading and 2 middle forward slashes", function() {
        expect(Module.File.normalizeSlashes("//test//this")).toBe("/test/this");
      });

      it("2 leading, 2 middle, and 2 ending forward slashes", function() {
        expect(Module.File.normalizeSlashes("//test//this//")).toBe("/test/this/");
      });

      it("Just mixed", function() {
        expect(Module.File.normalizeSlashes("//test//\\\\///this\\//")).toBe("/test/this/");
      });
    });


    describe("hasProtocol", function() {
      it("Path with forward slash", function() {
        expect(Module.File.hasProtocol("/test")).toBe(true);
      });

      it("Leading back slash", function() {
        expect(Module.File.hasProtocol("\\test")).toBe(true);
      });

      it("Path with leading dot", function() {
        expect(Module.File.hasProtocol("./test")).toBe(true);
      });

      it("Path with 2 leading dot", function() {
        expect(Module.File.hasProtocol("..\\test")).toBe(true);
      });

      it("Path with no leading slash or dot", function() {
        expect(Module.File.hasProtocol("test")).toBe(true);
      });

      it("Path with leading http protocol", function() {
        expect(Module.File.hasProtocol("http://")).toBe(false);
      });

      it("Path with leading https protocol", function() {
        expect(Module.File.hasProtocol("https://")).toBe(false);
      });

      it("Path with leading file protocol", function() {
        expect(Module.File.hasProtocol("file:///")).toBe(false);
      });
    });

  });

});

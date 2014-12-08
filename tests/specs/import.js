define(["dist/mloader"], function(MLoader) {

  describe("Import", function() {
    describe("when importing a module called `no`", function() {
      var no;
      beforeEach(function() {
        var options = {"modules": {"no": {"item": "hello"}}};

        return MLoader.Import().import("no", options)
          .done(function(_no) {
            no = _no;
          });
      });

      it("then `no` is an object", function() {
        expect(no).to.be.an("object");
      });

      it("the `no.item` is a string", function() {
        expect(no.item).to.be.a("string");
      });

      it("then `no.item` is `hello`", function() {
        expect(no.item).to.equal("hello");
      });
    });


    describe("when importing module `no` and `yes`", function() {
      var no, yes, date;
      beforeEach(function() {
        date = new Date();
        var options = {"modules": {"no": {"item": "hello"}, "yes": {"item": date}}};

        return MLoader.Import().import(["no", "yes"], options)
          .done(function(_no, _yes) {
            no = _no;
            yes = _yes;
          });
      });

      describe("and module `no` is loaded", function() {
        it("then module `no` is an object", function() {
          expect(no).to.be.an("object");
        });

        it("then module `no` has a string property `item`", function() {
          expect(no.item).to.be.a("string");
        });

        it("then module `no.item` is `hello`", function() {
          expect(no.item).to.equal("hello");
        });
      });

      describe("and module `yes` is loaded", function() {
        it("then `yes` is an object", function() {
          expect(yes).to.be.an("object");
        });

        it("then `yes.item` is a Date", function() {
          expect(yes.item).to.be.a("date");
        });

        it("then `yes.item` equals date", function() {
          expect(yes.item).to.equal(date);
        });
      });
    });


    describe("when importing modules `no` and `yes` with pre loaded context", function() {
      var context, importer, date, no, yes;
      beforeEach(function() {
        date = new Date();
        context = {"modules": {"no": {"item": "hello"}, "yes": {"item": date}}};
        importer = MLoader.Import({context: context});

        return importer.import(["no", "yes"])
          .done(function(_no, _yes) {
            no = _no;
            yes = _yes;
          });
      });

      describe("and module `no` is loaded", function() {
        it("then `no` is an object", function() {
          expect(no).to.be.an("object");
        });

        it("then `no.item` is a string", function() {
          expect(no.item).to.be.a("string");
        });

        it("then `no.item` is `hello`", function() {
          expect(no.item).to.equal("hello");
        });
      });

      describe("and module `yes` is loaded", function() {
        it("then `yes` is an object", function() {
          expect(yes).to.be.an("object");
        });

        it("then `yes.item` is a Date", function() {
          expect(yes.item).to.be.a("date");
        });

        it("then `yes.item` is date", function() {
          expect(yes.item).to.equal(date);
        });
      });


      describe("and overriding module `no` in the context", function() {
        var options, no, yes;
        beforeEach(function() {
          options = {"modules": {"no": {"item": "overriden"}}};
          return importer.import(["no", "yes"], options)
            .done(function(_no, _yes) {
              no = _no;
              yes = _yes;
            });
        });

        describe("and module `no` is loaded", function() {
          it("then `no` is an object", function() {
            expect(no).to.be.an("object");
          });

          it("then `no.item` is a string", function() {
            expect(no.item).to.be.a("string");
          });

          it("then `no.item` is `overriden`", function() {
            expect(no.item).to.equal("overriden");
          });
        });

        describe("and module `yes` is loaded", function() {
          it("then `yes` is an object", function() {
            expect(yes).to.be.an("object");
          });

          it("then `yes.item` is a Date", function() {
            expect(yes.item).to.be.a("date");
          });

          it("then `yes.item` is date", function() {
            expect(yes.item).to.equal(date);
          });
        });
      });
    });
  });
});

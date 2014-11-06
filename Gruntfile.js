//
// http://24ways.org/2013/grunt-is-not-weird-and-hard/
//
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    connect: {
      test: {
        options: {
          port: 8000,
          hostname: 'localhost'
        }
      },
      keepalive: {
        options: {
          port: 8000,
          host: "*",
          keepalive: true
        }
      }

    }
  });

  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.registerTask("default", ["connect:keepalive"]);
};

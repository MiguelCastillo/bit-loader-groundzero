define([
  "js/circularDependencyB"
], function(circularDependencyB) {
  return {
    "circularDependencyB": circularDependencyB,
    "circularDependencyA": "circularDependencyA"
  };
});

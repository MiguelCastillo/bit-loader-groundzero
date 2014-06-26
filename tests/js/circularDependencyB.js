define([
  "js/circularDependencyA"
], function(circularDependencyA) {
  return {
    "circularDependencyA": circularDependencyA,
    "circularDependencyB": "circularDependencyB"
  };
});

var underscore = require('underscore');

var helpers = underscore;
module.exports = helpers;

var primitiveTypes = {
  undefined: true,
  boolean: true,
  number: true,
  string: true
}
var isPrimitiveValue = function(object) {
  return primitiveTypes[typeof object];
}
helpers.mixin({ isPrimitiveValue: isPrimitiveValue });

var subtype = function(obj) {
  if (obj === null) return "null";

  var type = typeof obj;
  if (helpers.isPrimitiveValue(obj)) return null;

  if (helpers.isArray(obj)) return "array";
  if (helpers.isRegExp(obj)) return "regexp";
  if (helpers.isDate(obj)) return "date";

  // FireBug's array detection.
  try {
    if (Object.prototype.toString.call(obj) === "[object Arguments]" &&
        isFinite(obj.length)) {
      return "array";
     }
  } catch (e) {
  }

  return null;
}
helpers.mixin({ subtype: subtype });

var describe = function(obj) {
  if (helpers.isPrimitiveValue(obj)) return null;

  var subtype = helpers.subtype(obj);

  if (subtype === "regexp") return '' + obj;
  if (subtype === "date") return '' + obj;

  if (subtype === "array") {
    var className = 'array ';
      if (typeof obj.length === "number")
          className += "[" + obj.length + "]";
      return className;
  }

  if (typeof obj === "function") return "" + obj;

  if (helpers.isObject(obj)) {
      // In Chromium DOM wrapper prototypes will have Object as their constructor name,
      // get the real DOM wrapper name from the constructor property.
      var constructorName = obj.constructor && obj.constructor.name;
      if (constructorName)
          return constructorName;
  }
  return '' + obj;
}
helpers.mixin({ describe: describe });

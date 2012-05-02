var helpers = require('./helpers');

function RuntimeAgent() {
  this.objects = {};
}

module.exports = RuntimeAgent;

var RemoteObject = function(object) {
  this.type = typeof object;
  if (helpers.isPrimitiveValue(object) || object === null) {
    // We don't send undefined values over JSON.
    if (typeof object !== "undefined") this.value = object;

    // Null object is object with 'null' subtype'
    if (object === null) this.subtype = "null";

    // Provide user-friendly number values.
    if (typeof object === "number") this.description = object + "";
    return;
  }

  this.objectId = helpers.uniqueId('object_');
  var subtype = helpers.subtype(object)
  if (subtype) this.subtype = subtype;
  this.className = '';
  this.description = helpers.describe(object);
}


RuntimeAgent.prototype.evaluate = function(params, cb) {
  var err = null, result;

  try {
    result = eval.call(global, "with ({}) {\n" + params.expression + "\n}");
  } catch (e) {
    return cb(null, this.createThrownValue(e));
  }

  cb(null, {
    result: this.wrapObject(result, params.objectGroup),
    wasThrown: err ? true : false
  });
};

var getPropertyDescriptors = function(object, ownProperties) {
  var descriptors = [];
  var nameProcessed = {};
  nameProcessed.__proto__ = null;

  for (var o = object; helpers.isObject(o); o = o.__proto__) {
    var names = Object.getOwnPropertyNames(o);
    for (var i = 0; i < names.length; ++i) {
      var name = names[i];
      if (nameProcessed[name]) continue;

      try {
        nameProcessed[name] = true;
        var descriptor = Object.getOwnPropertyDescriptor(object, name);
        if (!descriptor) {

          try {
            descriptors.push({
              name: name,
              value: object[name],
              writable: false,
              configurable: false,
              enumerable: false
            });
          } catch (e) {
            // Silent catch.
          }
          continue;
        }
      } catch (e) {
        var descriptor = {};
        descriptor.value = e;
        descriptor.wasThrown = true;
      }

      descriptor.name = name;
      descriptors.push(descriptor);
    }
    if (ownProperties) {
      if (object.__proto__)
        descriptors.push({
          name: "__proto__",
          value: object.__proto__,
          writable: true,
          configurable: true,
          enumerable: false
        });
      break;
    }
  }
  return descriptors;
}

RuntimeAgent.prototype.wrapObject = function(object, objectGroup) {
  var remoteObject;

  try {
    remoteObject = new RemoteObject(object);
  } catch (e) {
    try {
      var description = helpers.describe(e);
    } catch (ex) {
      var description = "<failed to convert exception to string>";
    }
    remoteObject = new RemoteObject(description);
  }

  this.objects[remoteObject.objectId] = {
    objectGroup: objectGroup,
    value: object
  }

  return remoteObject;
}


RuntimeAgent.prototype.getProperties = function(params, cb) {
  var object = this.objects[params.objectId];

  if (helpers.isUndefined(object)) return cb(new Error('Unknown object'));

  var object = object.value;

  var descriptors = getPropertyDescriptors(object, params.ownProperties);

  if (descriptors.length === 0 && "arguments" in object) {
    for (var key in object) {
      descriptors.push({
        name: key,
        value: object[key],
        writable: false,
        configurable: false,
        enumerable: true
      });
    }
  }

  for (var i = 0; i < descriptors.length; ++i) {
    var descriptor = descriptors[i];
    if ("get" in descriptor)
        descriptor.get = this.wrapObject(descriptor.get);
    if ("set" in descriptor)
        descriptor.set = this.wrapObject(descriptor.set);
    if ("value" in descriptor)
        descriptor.value = this.wrapObject(descriptor.value);
    if (!("configurable" in descriptor))
        descriptor.configurable = false;
    if (!("enumerable" in descriptor))
        descriptor.enumerable = false;
  }

  cb(null, {
    result: descriptors
  });
};

RuntimeAgent.prototype.createThrownValue = function(value) {
  var remoteObject = this.wrapObject(value);
  try {
    remoteObject.description = '' + value;
  } catch (e) {}
  return { wasThrown: true, result: remoteObject };
}

RuntimeAgent.prototype.callFunctionOn = function(params, cb) {
  var object = this.objects[params.objectId];

  if (helpers.isUndefined(object)) return cb(new Error('Unknown object'));

  var object = object.value;

  if (params.arguments) {
    var resolvedArgs = [];
    for (var i = 0; i < params.arguments.length; ++i) {
      var objectId = params.arguments[i].objectId;
      if (objectId) {
        var resolvedArg = this.objects[objectId];
        if (!resolvedArg) return cb(new Error('Unknown object'));;
        resolvedArgs.push(resolvedArg.value);
      } else if ("value" in params.arguments[i]) {
        resolvedArgs.push(params.arguments[i].value);
      } else {
        resolvedArgs.push(undefined);
      }
    }
  }

  try {
    var func = eval("(" + expression + ")");
    if (typeof func !== "function") {
      return cb(new Error("Expression does not evaluate to a function"));
    }

    return { wasThrown: false,
             result: this.wrapObject(func.apply(object, resolvedArgs)) };
  } catch (e) {
    return cb(null, this.createThrownValue(e));
  }
};

RuntimeAgent.prototype.releaseObjectGroup = function(params, cb) {
  for (var key in this.objects) {
    var value = this.objects[key];
    if (value.objectGroup === params.objectGroup) delete this.objects[key];
  }
  cb();
}

RuntimeAgent.prototype.releaseObject = function(params, cb) {
  delete this.objects[params.objectId];
  cb();
}

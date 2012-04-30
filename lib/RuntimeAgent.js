function RuntimeAgent() {
  this.objects = {};
}

module.exports = RuntimeAgent;

RuntimeAgent.prototype.evaluate = function(params, sendResult, sendEvent) {
  var err, result;

  console.log(params);

  try {
    result = eval('(' + params.expression + ')');
  } catch (e) {
    err = e;
    result = undefined;
  }

  var remoteObject = {
    value: err ? err : result,
    objectId: '' + Math.random()
  }
  remoteObject.type = typeof remoteObject.value;

  this.objects[remoteObject.objectId] = remoteObject;

  sendResult(null, {
    result: remoteObject,
    wasThrown: err ? true : false
  });
};


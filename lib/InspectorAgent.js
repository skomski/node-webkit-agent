function InspectorAgent() {
  this.enabled = false;
}

module.exports = InspectorAgent;

InspectorAgent.prototype.enable = function(params, sendResult) {
  this.enabled = true;
  sendResult(null);
}

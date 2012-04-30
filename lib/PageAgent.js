function PageAgent() {
  this.enabled = false;
}

module.exports = PageAgent;

PageAgent.prototype.enable = function(params, sendResult) {
  this.enabled = true;
  sendResult(null);
};

PageAgent.prototype.canOverrideDeviceMetrics = function(params, sendResult) {
  sendResult(null, {result: false});
};


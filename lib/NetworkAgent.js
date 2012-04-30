function NetworkAgent() {
  this.enabled = false;
}

module.exports = NetworkAgent;

NetworkAgent.prototype.enable = function(params, sendResult) {
  sendResult(null);
};

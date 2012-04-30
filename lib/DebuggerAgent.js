function DebuggerAgent() {
  this.enabled = false;
}

module.exports = DebuggerAgent;

DebuggerAgent.prototype.enable = function(params, sendResult) {
  sendResult(null);
};

DebuggerAgent.prototype.causesRecompilation = function(params, sendResult) {
  sendResult(null, {result: true});
};

DebuggerAgent.prototype.supportsNativeBreakpoints = function(params, sendResult) {
  sendResult(null, {result: true});
};

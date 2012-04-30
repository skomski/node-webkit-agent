function TimelineAgent() {
  this.enabled = false;
  this.maxCallStackDepth = 5;
}

module.exports = TimelineAgent;

TimelineAgent.prototype.timeStamp = function(message) {
  var memory = process.memoryUsage();
  this.notify('Timeline.eventRecorded', {
    record: {
      startTime: Date.now(),
      endTime: Date.now(),
      data: { 'message': message || '' },
      type: 'TimeStamp',
      usedHeapSize: memory.heapUsed,
      totalHeapSize: memory.heapTotal
    }
  });
}

TimelineAgent.prototype.start = function(params, sendResult, sendEvent) {
  this.maxCallStackDepth = params.maxCallStackDepth;
  this.enabled = true;
  sendResult(null);
};

TimelineAgent.prototype.stop = function(params, sendResult) {
  this.enabled = false;
  sendResult(null);
};

function TimelineAgent() {
  this.enabled = false;
  this.maxCallStackDepth = 5;
  this.includeMemoryDetails = true;
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

TimelineAgent.prototype.start = function(params, cb, sendEvent) {
  this.maxCallStackDepth = params.maxCallStackDepth;
  this.enabled = true;
  cb(null);
};

TimelineAgent.prototype.stop = function(params, cb) {
  this.enabled = false;
  cb(null);
};

TimelineAgent.prototype.setIncludeMemoryDetails = function(params, cb) {
  this.includeMemoryDetails = params.enabled;
  cb(null);
};

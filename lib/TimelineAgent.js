var helpers = require('./helpers');

function TimelineAgent() {
  this.enabled = false;
  this.maxCallStackDepth = 5;
  this.includeMemoryDetails = true;

  this.orgEmit = process.EventEmitter.prototype.emit;
  this.orgSetTimeout = setTimeout;
  this.orgClearTimeout = clearTimeout;
  this.orgSetInterval = setInterval;
  this.orgClearTimeout = clearTimeout;
}

module.exports = TimelineAgent;

var RecordType = {
  EventDispatch: "EventDispatch",

  TimerInstall: "TimerInstall",
  TimerRemove: "TimerRemove",
  TimerFire: "TimerFire",

  TimeStamp: "TimeStamp",

  FunctionCall: "FunctionCall",
  GCEvent: "GCEvent"
}

var TimelineEvent = function(options) {
  var options = options || {};

  this.startTime = Date.now(),
  this.endTime   = null;
  this.data      = options.data;
  this.type      = options.type;
  this.children  = [];

  var memory = process.memoryUsage();
  this.usedHeapSize  = memory.heapUsed;
  this.totalHeapSize = memory.heapTotal;
}

TimelineEvent.prototype.addChild = function(child) {
  this.children.push(child);
}

TimelineEvent.prototype.end = function(data) {
  this.endTime = Date.now();
  helpers.extend(this.data, data);
}

TimelineAgent.prototype.recordEvent = function(timelineEvent) {
  this.notify('Timeline.eventRecorded', { record: timelineEvent });
}

TimelineAgent.prototype.timeStamp = function(message) {
  var timelineEvent = new TimelineEvent({
    type: RecordType.TimeStamp,
    data: { message: message }
  });
  timelineEvent.end();
  this.recordEvent(timelineEvent);
}

TimelineAgent.prototype.getStack = function(){
  var orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack){ return stack; };
  var err = new Error;
  Error.captureStackTrace(err, arguments.callee);
  var stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
};

TimelineAgent.prototype.start = function(params, cb) {
  this.maxCallStackDepth = params.maxCallStackDepth;
  this.enabled = true;
  var self = this;

  process.EventEmitter.prototype.emit = function(type) {
    var timelineEvent = new TimelineEvent({
      type: RecordType.EventDispatch,
      data: { type: type }
    });
    var result = self.orgEmit.apply(this, arguments);
    if (result) {
      timelineEvent.end();
      var stack = self.getStack();

      var functionEvent = new TimelineEvent({
        type: RecordType.FunctionCall,
        data: {
          scriptName: stack[1].getFileName(),
          scriptLine: stack[1].getLineNumber() }
      });
      functionEvent.stackTrace = [];
      for (var i = 2; i < stack.length; i++) {
        var callsite = stack[i];
        functionEvent.stackTrace.push({
          functionName: callsite.getFunctionName(),
          url: callsite.getFileName(),
          lineNumber: callsite.getLineNumber(),
          columnNumber: callsite.getColumnNumber()
        });
      }
      functionEvent.end();
      timelineEvent.addChild(functionEvent);
      self.recordEvent(timelineEvent);
    }
    return result;
  }

  var timerCounter = 0;
  var timers = {};

  setTimeout = function(cb, after) {
    var orgCb = arguments[0];
    var timerId = ++timerCounter;
    arguments[0] = function() {
      delete timers[this];

      var timelineEvent = new TimelineEvent({
        type: RecordType.TimerFire,
        data: { timerId: timerId }
      });
      orgCb(arguments);
      timelineEvent.end();
      self.recordEvent(timelineEvent);
    }

    var timelineEvent = new TimelineEvent({
      type: RecordType.TimerInstall,
      data: { timerId: timerId, timeout: after, singleShot: true }
    });

    var stack = self.getStack();

    var functionEvent = new TimelineEvent({
      type: RecordType.FunctionCall,
      data: {
        scriptName: stack[1].getFileName(),
        scriptLine: stack[1].getLineNumber() }
    });
    functionEvent.end();
    timelineEvent.addChild(functionEvent);

    var timer = self.orgSetTimeout.apply(this, arguments);
    timers[timer] = timerId;

    timelineEvent.end();
    self.recordEvent(timelineEvent);

    return timer;
  }

  setInterval = function(cb, after) {
    var orgCb = arguments[0];
    var timerId = ++timerCounter;
    arguments[0] = function() {
      delete timers[this];

      var timelineEvent = new TimelineEvent({
        type: RecordType.TimerFire,
        data: { timerId: timerId }
      });
      orgCb(arguments);
      timelineEvent.end();
      self.recordEvent(timelineEvent);
    }

    var timelineEvent = new TimelineEvent({
      type: RecordType.TimerInstall,
      data: { timerId: timerId, timeout: after, singleShot: false }
    });

    var timer = self.orgSetInterval.apply(this, arguments);
    timers[timer] = timerId;

    timelineEvent.end();
    self.recordEvent(timelineEvent);

    return timer;
  }

  clearTimeout = function(timer) {
    var timelineEvent = new TimelineEvent({
      type: RecordType.TimerRemove,
      data: { timerId: timers[timer] }
    });

    var result = self.orgClearTimeout.apply(this, arguments);

    timelineEvent.end();
    self.recordEvent(timelineEvent);

    return result;
  }

  clearInterval = function(timer) {
    var timelineEvent = new TimelineEvent({
      type: RecordType.TimerRemove,
      data: { timerId: timers[timer] }
    });

    var result = self.orgClearInterval.apply(this, arguments);

    timelineEvent.end();
    self.recordEvent(timelineEvent);

    return result;
  }

  cb(null);
};

TimelineAgent.prototype.stop = function(params, cb) {
  this.enabled = false;
  process.EventEmitter.prototype.emit = this.orgEmit;
  setInterval = this.orgSetInterval;
  clearInterval = this.orgClearInterval;
  setTimeout = this.orgSetTimeout;
  clearTimeout = this.orgClearTimeout;
  cb(null);
};

TimelineAgent.prototype.setIncludeMemoryDetails = function(params, cb) {
  this.includeMemoryDetails = params.enabled;
  cb(null);
};

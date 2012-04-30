var profiler = require('v8-profiler');

var HeapProfileType = 'HEAP';
var CPUProfileType  = 'CPU';

function ProfilerAgent() {
  this.profiles = {
    HEAP: {},
    CPU: {}
  };

  this.enabled = false;
  this.isProfilingCPU = false;
}

module.exports = ProfilerAgent;

ProfilerAgent.prototype.enable = function(params, sendResult) {
  sendResult(null);
};

ProfilerAgent.prototype.causesRecompilation = function(params, sendResult) {
  sendResult(null, { result: false });
};

ProfilerAgent.prototype.isSampling = function(params, sendResult) {
  sendResult(null, { result: this.isProfilingCPU });
};

ProfilerAgent.prototype.hasHeapProfiler = function(params, sendResult) {
  sendResult(null, { result: true });
};

ProfilerAgent.prototype.getProfileHeaders = function(params, sendResult) {
  var headers = [];

  for (var type in this.profiles) {
    for (var profileId in this.profiles[type]) {
      var profile = this.profiles[type][profileId];
      headers.push({
        title: profile.title,
        uid: profile.uid,
        typeId: type
      });
    }
  }

  sendResult(null, {
    headers: headers
  });
};

ProfilerAgent.prototype.takeHeapSnapshot = function(params, sendResult, sendEvent) {
  var snapshot = profiler.takeSnapshot(function(done, total) {
    sendEvent({
      method: 'Profiler.reportHeapSnapshotProgress',
      params:{
        done: done,
        total: total
      }
    });
  });

  this.profiles[HeapProfileType][snapshot.uid] = snapshot;

  sendEvent({
    method: 'Profiler.addProfileHeader',
    params: {
      header: {
        title: snapshot.title,
        uid: snapshot.uid,
        typeId: HeapProfileType
      }
    }
  });

  sendResult(null, {});
};

ProfilerAgent.prototype.getProfile = function(params, sendResult, sendEvent) {
  if (params.type == HeapProfileType) {
    var snapshot = this.profiles[params.type][params.uid];

    snapshot.serialize({
      onData: function(chunk, size) {
        chunk = chunk + '';
          sendEvent({
            method: 'Profiler.addHeapSnapshotChunk',
            params: {
              uid: snapshot.uid,
              chunk: chunk
            }
          });
      },
      onEnd: function() {
        sendEvent({
          method: 'Profiler.finishHeapSnapshot',
          params: {uid: snapshot.uid}
        });

        sendResult(null, {
          profile: {
            title: snapshot.title,
            uid: snapshot.uid,
            typeId: HeapProfileType
          }
        });
      }
    });
  } else if (params.type == CPUProfileType) {
    var profile = this.profiles[params.type][params.uid];
    profile.typeId = CPUProfileType;

    sendResult(null, {
      profile: {
        title: profile.title,
        uid: profile.uid,
        typeId: CPUProfileType,
        head: profile.getTopDownRoot(),
        bottomUpHead: profile.getBottomUpRoot()
      }
    });
  }
};

ProfilerAgent.prototype.clearProfiles = function(params, sendResult, sendEvent) {
  this.profiles.HEAP = {};
  this.profiles.CPU = {};
  profiler.deleteAllSnapshots();
  profiler.deleteAllProfiles();
};

ProfilerAgent.prototype.start = function(params, sendResult, sendEvent) {
  profiler.startProfiling();

  sendEvent({
    method: 'Profiler.setRecordingProfile',
    params: {
      isProfiling: true
    }
  });

  sendResult(null, {});
};

ProfilerAgent.prototype.stop = function(params, sendResult, sendEvent) {
  var profile = profiler.stopProfiling();

  this.profiles[CPUProfileType][profile.uid] = profile;

  sendEvent({
    method: 'Profiler.addProfileHeader',
    params: {
        header: {
        title: profile.title,
        uid: profile.uid,
        typeId: CPUProfileType
      }
    }
  });

  sendEvent({
    method: 'Profiler.setRecordingProfile',
    params: {
      isProfiling: false
    }
  });

   sendResult(null, {});
};

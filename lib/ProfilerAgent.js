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

ProfilerAgent.prototype.enable = function(params, cb) {
  cb(null);
};

ProfilerAgent.prototype.causesRecompilation = function(params, cb) {
  cb(null, { result: false });
};

ProfilerAgent.prototype.isSampling = function(params, cb) {
  cb(null, { result: this.isProfilingCPU });
};

ProfilerAgent.prototype.hasHeapProfiler = function(params, cb) {
  cb(null, { result: true });
};

ProfilerAgent.prototype.getProfileHeaders = function(params, cb) {
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

  cb(null, {
    headers: headers
  });
};

ProfilerAgent.prototype.takeHeapSnapshot = function(params, cb) {
  var self = this;

  var snapshot = profiler.takeSnapshot(function(done, total) {
    self.notify('Profiler.reportHeapSnapshotProgress', {
      done: done,
      total: total
    });
  });

  this.profiles[HeapProfileType][snapshot.uid] = snapshot;

  this.notify('Profiler.addProfileHeader', {
    header: {
      title: snapshot.title,
      uid: snapshot.uid,
      typeId: HeapProfileType
    }
  });

  cb(null, {});
};

ProfilerAgent.prototype.getProfile = function(params, cb) {
  var self = this;

  if (params.type == HeapProfileType) {
    var snapshot = this.profiles[params.type][params.uid];

    snapshot.serialize({
      onData: function(chunk, size) {
        chunk = chunk + '';
          self.notify('Profiler.addHeapSnapshotChunk', {
            uid: snapshot.uid,
            chunk: chunk
          });
      },
      onEnd: function() {
        self.notify('Profiler.finishHeapSnapshot', {
          uid: snapshot.uid
        });

        cb(null, {
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

    cb(null, {
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

ProfilerAgent.prototype.clearProfiles = function(params, cb) {
  this.profiles.HEAP = {};
  this.profiles.CPU = {};
  profiler.deleteAllSnapshots();
  profiler.deleteAllProfiles();
};

ProfilerAgent.prototype.start = function(params, cb) {
  profiler.startProfiling();

  this.notify('Profiler.setRecordingProfile', {
    isProfiling: true
  });

  cb();
};

ProfilerAgent.prototype.stop = function(params, cb) {
  var profile = profiler.stopProfiling();

  this.profiles[CPUProfileType][profile.uid] = profile;

  this.notify('Profiler.addProfileHeader', {
    header: {
      title: profile.title,
      uid: profile.uid,
      typeId: CPUProfileType
    }
  });

  this.notify('Profiler.setRecordingProfile', {
    isProfiling: false
  });

   cb();
};

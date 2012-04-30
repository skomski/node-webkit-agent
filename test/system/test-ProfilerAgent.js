var assert = require('assert');
var WebSocket = require('ws');
var agent = require('../..');

agent.start({ host: '127.0.0.1', port: '9000' });
var websocket = new WebSocket('ws://127.0.0.1:9000');

var addProfilerHeaderCalled = false;
var takeHeapSnapshotAnswer  = false;

websocket.on('message', function(data, flags) {
  var message = JSON.parse(data);

  if (message.method) {
    switch(message.method) {
      case 'Profiler.addProfileHeader':
        assert.equal(message.params.header.title,
                     'org.nodejs.profiles.heap.user-initiated.1');
        addProfilerHeaderCalled = true;
        break;

      default:
        throw new Error('Unknown method');
    }
  } else {
    switch(message.id) {
      case 1:
        assert.equal(message.error, undefined);
        assert.equal(message.id, 1);
        takeHeapSnapshotAnswer = true;
        agent.close();
        break;
      default:
        throw new Error('Unknown id');
    }
  }
});

websocket.on('open', function() {
  websocket.send(JSON.stringify({
    method: 'Profiler.takeHeapSnapshot',
    id: 1
  }));
});

process.on('exit', function() {
  assert(takeHeapSnapshotAnswer);
  assert(addProfilerHeaderCalled);
});

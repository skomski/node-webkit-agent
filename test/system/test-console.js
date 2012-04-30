var assert = require('assert');
var WebSocket = require('ws');
var agent = require('../..');

agent.start({ host: '127.0.0.1', port: '9000' });
var websocket = new WebSocket('ws://127.0.0.1:9000');

var testFinished = false;

websocket.on('message', function(data, flags) {
  var answer = JSON.parse(data);
  switch(answer.id) {
    case 1:
      assert.equal(answer.error, undefined);
      assert.equal(answer.id, 1);
      testFinished = true;
      agent.close();
      break;
    default:
      throw new Error('Unknown id');
  }
});

websocket.on('open', function() {
  websocket.send(JSON.stringify({
    method: 'Console.clearMessages',
    id: 1
  }));
});

process.on('exit', function() {
  assert(testFinished);
});

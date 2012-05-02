var WebSocketServer = require('ws').Server;
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var agents = require('./lib');

function WebkitDevAgent() {
  this.websocket = null;
}

util.inherits(WebkitDevAgent, EventEmitter);

module.exports = new WebkitDevAgent();
module.exports.console = agents.Console;
module.exports.timeline = agents.Timeline;

WebkitDevAgent.prototype.start = function(options) {
  var self = this;
  this.websocket = new WebSocketServer({
    port: options.port,
    host: options.host
  });

  for (var key in agents) {
    var agent = agents[key];
    agent.notify = function(method, params) {
    };
  }

  this.websocket.on('connection', function(socket) {
    for (var key in agents) {
      var agent = agents[key];
      agent.notify = function(method, params) {

        socket.send(JSON.stringify({
          method: method,
          params: params
        }));
      };
    }

    socket.on('message', function(message) {
      try {
        message = JSON.parse(message);
      } catch(err) {
        return self.emit('error', err);
      }

      var id = message.id;
      var command = message.method.split('.');
      var domain = agents[command[0]];
      var method = command[1];
      var params = message.params;

      if (!domain || !domain[method]) {
        return self.emit('error',
                         new Error(message.method + ' is not implemented'));
      }

      domain[method](params, function(err, result) {
        if (err) {
          return socket.send(JSON.stringify({
            id: id,
            error: err.message
          }));
        }
        socket.send(JSON.stringify({
          id: id,
          result: result
        }));
      });
    });
  });
}

WebkitDevAgent.prototype.close = function(){
  if (this.websocket) {
    this.websocket.close();
  }
}

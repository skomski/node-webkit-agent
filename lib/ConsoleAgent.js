var util = require('util');

function ConsoleAgent() {
  this.enabled = false;
  this.messages = [];
  this.formatRegExp = /%[sdj]/g;
}

module.exports = ConsoleAgent;

ConsoleAgent.prototype.format = function format(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(util.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var str = String(f).replace(this.formatRegExp, function(x) {
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for (var len = args.length, x = args[i]; i < len; x = args[++i]) {
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + util.inspect(x);
    }
  }
  return str;
}

ConsoleAgent.prototype.notifyMessageAdded = function(level, args) {
  var message = this.format.apply(this, args) + '\n';

  if (this.enabled) {
    this.notify('Console.messageAdded', {
      message: {
        text: message,
        level: level,
        source: 'console-api'
      }
    });
  } else {
    this.messages.push({ level: level, args: args });
  }
};

ConsoleAgent.prototype.info = ConsoleAgent.prototype.tip = function() {
  this.notifyMessageAdded('tip', arguments);
}
ConsoleAgent.prototype.log = function() {
  this.notifyMessageAdded('log', arguments);
}
ConsoleAgent.prototype.error = function() {
  this.notifyMessageAdded('error', arguments);
}
ConsoleAgent.prototype.warn = ConsoleAgent.prototype.warning = function() {
  this.notifyMessageAdded('warning', arguments);
}

ConsoleAgent.prototype.enable = function(params, cb, notify) {
  this.enabled = true;
  for (var i = 0, _len = this.messages.length; i < _len; i++) {
    var value = this.messages[i];
    this.notifyMessageAdded(value.level, value.args);
  }
  cb(null);
}

ConsoleAgent.prototype.disable = function(params, cb) {
  this.enabled = false;
  cb(null);
}

ConsoleAgent.prototype.clearMessages = function(params, cb) {
  this.messages = [];
  cb(null);
}

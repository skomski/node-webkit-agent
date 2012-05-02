This is a fork of c4milo's node-webkit-agent. Added timeline and console. Changed other stuff like module exports and coding style.

# node-webkit-agent
This module is an implementation of the
[Chrome Remote Debugging Protocol](http://code.google.com/chrome/devtools/docs/protocol/1.0/index.html).

WIP

## Features
This module allows you to remotely debug and profile your node.js applications.

* Debugging (WIP)
* Heap and CPU profiling
* Console
* Timeline

## Usage
```javascript
var agent = require('webkit-devtools-agent');
agent.start({ host: '127.0.0.1', port: '9222' });

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(8080, '127.0.0.1');

console.log('[%s] Server running at http://127.0.0.1:8080/', process.pid);
```
### Connecting to the agent

Using your browser, go to http://trac.webkit.org/export/head/trunk/Source/WebCore/inspector/front-end/inspector.html?ws=localhost:9222. It's important to make sure
your browser supports websockets, otherwise the front-end won't be able to connect to the node agent whatsoever.

For more documentation about how to use and interpret devtools, please go to the [Devtools official documentation](http://code.google.com/chrome/devtools/docs/overview.html)

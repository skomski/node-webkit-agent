var agent = require('../..');
agent.on('error', function(err) {
  console.error(err);
});
agent.start({ host: '127.0.0.1', port: '9000' });

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  agent.timeline.timeStamp('New request');
  res.end('Hello World\n');
}).listen(8080, '127.0.0.1');

agent.console.log('[%s] Server running at http://127.0.0.1:8080/', process.pid);

var agent = require('../..');
agent.on('error', function(err) {
  console.error(err);
});
agent.start({ host: 'localhost', port: '9003' });

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});

  setTimeout(function() {
    agent.timeline.timeStamp('timeout: new request');
  }, 1000);

  setInterval(function() {
    agent.timeline.timeStamp('interval: new request');
  }, 1000);

  res.end('Hello World\n');
}).listen(9000, '127.0.0.1');

agent.console.log('[%s] Server running at http://127.0.0.1:8080/', process.pid);

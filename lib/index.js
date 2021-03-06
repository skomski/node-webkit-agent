var DebuggerAgent  = require('./DebuggerAgent');
var NetworkAgent   = require('./NetworkAgent');
var PageAgent      = require('./PageAgent');
var ConsoleAgent   = require('./ConsoleAgent');
var ProfilerAgent  = require('./ProfilerAgent');
var RuntimeAgent   = require('./RuntimeAgent');
var TimelineAgent  = require('./TimelineAgent');
var InspectorAgent = require('./InspectorAgent');

var agents = {
  Profiler  : new ProfilerAgent(),
  Page      : new PageAgent(),
  Console   : new ConsoleAgent(),
  Network   : new NetworkAgent(),
  Runtime   : new RuntimeAgent(),
  Timeline  : new TimelineAgent(),
  Inspector : new InspectorAgent()
};

agents.Debugger = new DebuggerAgent(agents.Runtime);

module.exports = agents;

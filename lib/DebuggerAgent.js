function DebuggerAgent(runtimeAgent) {
  this.enabled = false;
  this.pauseOnExceptions = 'none';
  this.debugger = debug.Debug;
  this.execState = null;
  this.callFrames = {};
  this.runtimeAgent = runtimeAgent;
}

module.exports = DebuggerAgent;

var ScopeType = { Global: 0,
                    Local: 1,
                    With: 2,
                    Closure: 3,
                    Catch: 4,
                    Block: 5 };



DebuggerAgent.prototype.debugListener = function(event, execState, eventData, data) {
  console.log(event);

  switch(event) {
    case this.debugger.DebugEvent.Break:
      if (!eventData.breakPointsHit()) return;

      this.execState = execState;

      var callFrame = this.currentCallFrame();

      this.notify('Debugger.paused', {
        reason: 'other',
        callFrames: this.wrapCallFrames(callFrame)
      });

      this.notify('Debugger.breakpointResolved', {
        breakpointId: eventData.breakPointsHit()[0].script_break_point().number().toString(),
        location: {
          columnNumber: eventData.sourceColumn(),
          lineNumber: eventData.sourceLine(),
          scriptId: eventData.func().script().id().toString()
        }
      });
      break;
    case this.debugger.DebugEvent.Exception:
      break;
    default:
      throw new Error('Unknown debugger event');
  }
}

DebuggerAgent.prototype._formatScript = function(script) {
  var lineEnds = script.line_ends;
  var lineCount = lineEnds.length;
  var endLine = script.line_offset + lineCount - 1;
  var endColumn;
  // V8 will not count last line if script source ends with \n.
  if (script.source[script.source.length - 1] === '\n') {
    endLine += 1;
    endColumn = 0;
  } else {
    if (lineCount === 1)
        endColumn = script.source.length + script.column_offset;
    else
        endColumn = script.source.length - (lineEnds[lineCount - 2] + 1);
  }

  return {
    scriptId: script.id.toString(),
    url: script.nameOrSourceURL(),
    startLine: script.line_offset,
    startColumn: script.column_offset,
    endLine: endLine,
    endColumn: endColumn,
    isContentScript: false
  };
}

DebuggerAgent.prototype.enable = function(params, cb) {
  this.enabled = true;
  var scripts = this.debugger.scripts();

  for (var key = 0, _i = 0, _len = scripts.length; _i < _len; key = ++_i) {
    var script = scripts[key];

    if (!script.name) continue;

    this.notify('Debugger.scriptParsed', this._formatScript(script));
  }

//  this.debugger.setListener(this.debugListener.bind(this));

  cb(null);
};

DebuggerAgent.prototype.disable = function(params, cb) {
  this.enabled = false;
  this.debugger.setListener(null);
  cb(null);
};

DebuggerAgent.prototype.causesRecompilation = function(params, cb) {
  cb(null, {result: false});
};

DebuggerAgent.prototype.supportsNativeBreakpoints = function(params, cb) {
  cb(null, {result: true});
};

DebuggerAgent.prototype.canSetScriptSource= function(params, cb) {
  cb(null, {result: true});
};

DebuggerAgent.prototype.setPauseOnExceptions = function(params, cb) {
  this.pauseOnExceptions = params.state;
  if (this.pauseOnExceptions === 'all')
    this.debugger.setBreakOnException();
  else
    this.debugger.clearBreakOnException();

  if (this.pauseOnExceptions === 'uncaught')
    this.debugger.setBreakOnUncaughtException();
  else
    this.debugger.clearBreakOnUncaughtException();
  cb();
};

DebuggerAgent.prototype.removeBreakpoint = function(params, cb) {
  var result = this.debugger.findBreakPoint(params.breakpointId, true);
  if (result) return cb();
  cb(new Error('Unknown breakpoint'));
};

DebuggerAgent.prototype.setBreakpointsActive = function(params, cb) {
  this.debugger.debuggerFlags().breakPointsActive.setValue(params.active);
  cb();
}


DebuggerAgent.prototype.setBreakpointByUrl = function(params, cb) {
  var breakId = this.debugger.setScriptBreakPointByName(
                        params.url,
                        params.lineNumber,
                        params.columnNumber,
                        params.condition,
                        1);
  var locations = this.debugger.findBreakPointActualLocations(breakId);
  if (!locations.length) return cb(new Error('Unkown location'));

  cb(null, { breakpointId: breakId.toString(), locations: [{
    lineNumber: locations[0].line,
    columnNumber: locations[0].column,
    scriptId: locations[0].script_id.toString()
  }]});
};

DebuggerAgent.prototype.getScriptSource = function(params, cb) {
  var scripts = this.debugger.scripts();
  for (var key = 0, _i = 0, _len = scripts.length; _i < _len; key = ++_i) {
    var script = scripts[key];
    if (params.scriptId == script.id) {
      return cb(null, { scriptSource: script.source });
    }
  }
  cb(new Error('Unknown script_id'));
}

DebuggerAgent.prototype.setScriptSource = function(params, cb) {
  var scripts = this.debugger.scripts();
  var scriptToEdit = null;
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].id == params.scriptId) {
      scriptToEdit = scripts[i];
      break;
    }
  }
  if (!scriptToEdit) return cb(new Error('Unknown script'));

  var changeLog = [];
  this.debugger.LiveEdit.SetScriptSource(
      scriptToEdit,
      params.scriptSource,
      false,
      changeLog);
  cb(null);
}

DebuggerAgent.prototype.pause = function(params, cb) {
  this.debugger.breakExecution();
  cb();
}

DebuggerAgent.prototype.resume = function(params, cb) {
  this.execState.prepareStep(this.debugger.StepAction.Continue, 1);
  cb();
}

DebuggerAgent.prototype.currentCallFrame = function() {
  var frameCount = this.execState.frameCount();
  if (frameCount === 0)
      return undefined;

  var topFrame;
  for (var i = frameCount - 1; i >= 0; i--) {
    var frameMirror = this.execState.frame(i);
    topFrame = this._frameMirrorToJSCallFrame(frameMirror, topFrame);
  }
  return topFrame;
}

DebuggerAgent.prototype.stepInto = function(params, cb) {
  this.execState.prepareStep(this.debugger.StepAction.StepIn, 1);
  cb();
}

DebuggerAgent.prototype.stepOver = function(params, cb) {
  this.execState.prepareStep(this.debugger.StepAction.StepNext, 1);
  cb();
}

DebuggerAgent.prototype.stepOut = function(params, cb) {
  this.execState.prepareStep(this.debugger.StepAction.StepOut, 1);
  cb();
}

var CallFrameProxy = function(ordinal, callFrame, runtimeAgent) {
  this.callFrameId = '' + ordinal;
  this.functionName = (callFrame.type === "function" ? callFrame.functionName : "");
  this.location = {
    scriptId: String(callFrame.sourceID),
    lineNumber: callFrame.line,
    columnNumber: callFrame.column
  };
  this.scopeChain = this._wrapScopeChain(callFrame, runtimeAgent);
  this.this = runtimeAgent.wrapObject(callFrame.thisObject, "backtrace");
}

CallFrameProxy.prototype._wrapScopeChain = function(callFrame, runtimeAgent) {
  const GLOBAL_SCOPE = 0;
  const LOCAL_SCOPE = 1;
  const WITH_SCOPE = 2;
  const CLOSURE_SCOPE = 3;
  const CATCH_SCOPE = 4;

  var scopeTypeNames = {};
  scopeTypeNames[GLOBAL_SCOPE] = "global";
  scopeTypeNames[LOCAL_SCOPE] = "local";
  scopeTypeNames[WITH_SCOPE] = "with";
  scopeTypeNames[CLOSURE_SCOPE] = "closure";
  scopeTypeNames[CATCH_SCOPE] = "catch";

  var scopeChain = callFrame.scopeChain;
  var scopeChainProxy = [];
  var foundLocalScope = false;
  for (var i = 0; i < scopeChain.length; i++) {
    var scope = {};
    scope.object = runtimeAgent.wrapObject(scopeChain[i], "backtrace");

    var scopeType = callFrame.scopeType;
    scope.type = scopeTypeNames[scopeType];
    scopeChainProxy.push(scope);
  }
  return scopeChainProxy;
}


DebuggerAgent.prototype.wrapCallFrames = function(callFrame) {
  if (!callFrame) return false;

  var result = [];
  var depth = 0;
  do {
    result.push(new CallFrameProxy(depth++, callFrame, this.runtimeAgent));
    callFrame = callFrame.caller;
  } while (callFrame);
  return result;
}

DebuggerAgent.prototype._frameMirrorToJSCallFrame = function(frameMirror, callerFrame) {
  // Get function name.
  var func;
  try {
    func = frameMirror.func();
  } catch(e) {
  }
  var functionName;
  if (func)
    functionName = func.name() || func.inferredName();

  // Get script ID.
  var script = func.script();
  var sourceID = script && script.id();

  // Get location.
  var location  = frameMirror.sourceLocation();

  // Get this object.
  var thisObject = frameMirror.details_.receiver();

  // Get scope chain array in format: [<scope type>, <scope object>, <scope type>, <scope object>,...]
  var scopeChain = [];
  var scopeType = [];
  for (var i = 0; i < frameMirror.scopeCount(); i++) {
    var scopeMirror = frameMirror.scope(i);
    var scopeObjectMirror = scopeMirror.scopeObject();

    var scopeObject;
    switch (scopeMirror.scopeType()) {
      case ScopeType.Local:
      case ScopeType.Closure:
        // For transient objects we create a "persistent" copy that contains
        // the same properties.
        scopeObject = {};
        // Reset scope object prototype to null so that the proto properties
        // don't appear in the local scope section.
        scopeObject.__proto__ = null;
        var properties = scopeObjectMirror.properties();
        for (var j = 0; j < properties.length; j++) {
          var name = properties[j].name();
          if (name.charAt(0) === ".")
            continue; // Skip internal variables like ".arguments"
          scopeObject[name] = properties[j].value_;
        }
        break;
      case ScopeType.Global:
      case ScopeType.With:
      case ScopeType.Catch:
        scopeObject = scopeMirror.details_.object();
        break;
    }

    scopeType.push(scopeMirror.scopeType());
    scopeChain.push(scopeObject);
  }

  function evaluate(expression) {
    return frameMirror.evaluate(expression, false).value();
  }


  return {
    "sourceID": sourceID,
    "line": location ? location.line : 0,
    "column": location ? location.column : 0,
    "functionName": functionName,
    "thisObject": thisObject,
    "scopeChain": scopeChain,
    "scopeType": scopeType,
    "evaluate": evaluate,
    "caller": callerFrame
  };
}



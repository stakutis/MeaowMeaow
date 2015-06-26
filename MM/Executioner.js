/**
 * Created by cstakutis on 6/12/2015.
 */
"use strict";

function MM_Executioner() {
    var env = {
        advanceOnTimer: true,
        advanceProgram: advanceProgram,
        abort : false
    };  // Shared with call-outs
    var state;

    var log=function(str) {
        //console.log("Executioner: "+str);
    };


    function initializeStep(number) {
        log("SSSSSSSSSSSSSSSSSSSSSSSSS    START Step "+state.program.steps[number].name+" SSSSSSSSSSSSSSSSSSS");
        log("initializeStep: name:"+state.program.steps[number].name);
        state.stepNumber = number;
        state.stepPhase = "commands";
        state.commandIdx = 0;
        state.stepStartTime = new Date();
    }

    function setStep(stepName) {
        var idx;
        for (idx = 0; idx < state.program.steps.length; idx++)
            if (state.program.steps[idx].name == stepName) {
                log("setStep: Setting to step "+stepName);
                initializeStep(idx);
                return true;
            }
        log("setStep: FAILED...aborting program");
        env.abort = true;
        state.stepPhase="abort";
        env.advanceOnTimer = false;
        completeTheProgram();
        return false;
    }

    function completeTheProgram() {
        if (state.programDone) state.programDone(this);
    }

    function processCommand(step, command) {
        state.commandIdx++;
        var result;
        if (command.program) {
            log("processCommand: Will execute a new program");
            env.advanceOnTimer=false;
            result=startProgram(command.program);
        }
        else {
            log("processCommand: executing function");
            result = command.func(env, step, command);
        }
        log("processCommand: result:"+result);
        if (command.ifTrue && result) {
            log("processCommand: Setting true step:"+command.ifTrue);
            if (typeof command.ifTrue == "string") setStep(command.ifTrue );
            else {
                env.advanceOnTimer=false;
                result=startProgram(command.ifTrue);
            }
        }
        if (command.ifFalse && !result) {
            log("processCommand: Setting false step:"+command.ifFalse);
            setStep(command.ifFalse );
        }
    }


    function advanceProgram() {
        var command;
        env.advanceOnTimer=true;
        log("advanceProgram: Program:"+state.program.name+" stepPhase:"+state.stepPhase+" idx:"+state.commandIdx);
        if (env.updateFunction) env.updateFunction(getDisplayStatus());
        if (env.abort) {
            log("ABORTING");
            completeTheProgram();
            return;
        }

        var step = state.program.steps[state.stepNumber];
        if (state.stepPhase == "commands") {
            if (!step.commands ||
                step.commands.length <= state.commandIdx) {
                log("advanceProgram: Finished 'commands' phase");
                state.stepPhase="repeat";
                state.commandIdx = 0;
            } else {
                log("advanceProgram: running command");
                command = step.commands[state.commandIdx];
                processCommand(step, command);
            }
        }
        if (state.stepPhase=="repeat") {
            log("advanceProgram: phase: repeat");
            if (step.repeat) {
                log("advanceProgram: running REPEAT command");
                if (state.commandIdx >= step.repeat.length) state.commandIdx = 0; // I think happens if chaining to a program and return
                command = step.repeat[state.commandIdx];
                processCommand(step, command);
                if (state.commandIdx >= step.repeat.length) state.commandIdx = 0;
            }
            else {
                log("^^^^^^^^^^^^^^^^^^^^ Program '"+state.program.name+"' is done.  Unwinding... stepPhase:"+state.stepPhase+" idx:"+state.commandIdx+" ^^^^^^^^^^^^^^^^^^^^^^");
                if (state.programDone) state.programDone(this);
                if (state.next) {
                    state=state.next;
                    log("Resuming program:"+state.program.name);
                }
                else {
                    log("COMPLETELY DONE");
                    env.complete = true;
                    env.advanceOnTimer = false;
                }
            }
        }
        log("advanceProgram: advanceOnTimer:"+env.advanceOnTimer);
        if (env.advanceOnTimer) setTimeout(advanceProgram,0+env.advanceOnTimer); // Either '1' or a ms value
    }

    var getDisplayStatus=function() {
        var str="";
        if (env.abort) str="Aborted";
        else
        if (env.complete) str="Completed";
        else {
            var s;
            for (s=state; s; s=s.next) {
                var step = s.program.steps[s.stepNumber];
                str=s.program.name+":"+step.name+":"+s.stepPhase+":"+s.commandIdx + "->"+str;
               // str+="break"; break;
            }
        }
        return str;
    }

    var startProgram=function (program, options) {
         log("VVVVVVVVVVVVVVVVVVVV Starting program:"+program.name+" VVVVVVVVVVVVVVVVVVVVV");
        options = options || {};
        // Push our current state downwards if we're already running
        var nstate={};
        if (state) {
            nstate.next = state;
        }
        state = nstate;
        if (!env.updateFunction)  // basically, dont wipe it out if we go lower
            env.updateFunction = options.updateFunction;
        state.program = program;
        state.programDone = options.programDoneCallback;
        state.startTime = new Date();
        initializeStep(0);
        setTimeout(advanceProgram,0);
    };

    var abortProgram=function() {
        env.abort = true;
    };

    return {
        startProgram: startProgram,
        abortProgram: abortProgram
    };
}

try{ module.exports = MM_Executioner;} catch(e) {}  // For node.js or require.js
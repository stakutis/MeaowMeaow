/**
 * Created by cstakutis on 6/16/2015.
 */

var sleepMS = MM.sleepMS;    // Shorthand

function sparki(e,s,c) {
    // See if global is set. Else, error
    if (!Sparki) {
        console.log("Sparki GLOBAL not defined...maybe no drivers or no device");
        e.abort = true;
    }
    else return Sparki.sparki(e,s,c);
}

var ProgramGetAllStatus={
    // 'EL','ER','LL','LC','LR','AX','AY','AZ','MX','MY','MZ','TL','TC','TR','DD','SV','MR','ML','TO','TS'(TT)
    name : "Get All Sensors",
    steps: [
        {
            name: "Get All Sensors",
            repeat: [
                {func: sparki, cmd: "SEL|ER|LL|LC|LR|AX|AY|AZ"},
                {func: sparki, cmd: "SMX|MY|MZ|TL|TC|TR"},
                {func: sparki, cmd: "SDD|SV|MR|ML|TT"},
            ]
        }
    ]
};


var waitTilDone = {
    name: "waitTilDone",
    steps: [
        {
            name:"waitTilReady",
            repeat: [
                {func: function(e,s,c) { return Sparki.ready}, ifTrue: "waitTilDone-1"}
            ]
        },
        {
            name:"waitTilDone-1",
            repeat: [
                {func: sparki, cmd: "SMR"},
                {func: function(e,s,c) {return e.devices.sparki.sensors.MR;}, ifFalse: "done"},
                {func: sleepMS, ms:300}
            ]
        },
        {
            name:"done"
        }
    ]
};

var ProgramDS = {
    name: "Depth Search",
    steps: [
        {
            name: "StartScan",
            commands: [
                {func: sparki, cmd: "R0"},      // Put head straight
                {func: sparki, cmd: "GO1"},     // Gripper-Open 1 cm
                {func: sparki, cmd: "T1000|500"},// Beep at 1000hz for 500ms
                {func: sleepMS, ms:500}         // Sleep a little
            ],
            repeat: [
                {func: sparki, cmd: "D-50|50|2"}, // Invoke a distance-scan from -50 to 50 degrees
                {func: rangePlot, canvas:"myCanvas", range:55, label:true, skipAbove:55}, // Plot it on the screen
                {func: findTarget, closerThan:40, ifTrue: "ApproachTarget"},  // Output in e->targetAngle, e->targetDistance
                // If we didn't find anything, beep, and keep trying! Loop!
                {func: sparki, cmd: "T100|1000"},
                {func: sleepMS, ms:5000}
            ]
        },
        {
            name: "ApproachTarget",
            commands: [
                // MR==Turn Right, MF=Move Forward, Move Backward, Turn Left, etc...
                {func: function (e,s,c) {c.cmd="MR"+ (e.targetAngle - 2); sparki(e,s,c);}},
                {program: waitTilDone},
                {func: function (e,s,c) {c.cmd="MF"+ (e.targetDistance -4); sparki(e,s,c);}},
                {program: waitTilDone},
                {func: sleepMS, ms:500},
                {func: sparki, cmd: "GC3"},  // Grab it!!
                {program: waitTilDone},      // Now lets return home
                {func: function (e,s,c) {c.cmd="MB"+ (e.targetDistance -4); sparki(e,s,c);}},
                {program: waitTilDone},
                {func: function (e,s,c) {c.cmd="ML"+ (e.targetAngle - 2); sparki(e,s,c);}},
                {program: waitTilDone},
            ]
        },
    ]
};

var ProgramBeepOn = {
    name: "My beep-on program",
    steps: [
        {
            name: "BeepOn",
            commands :[
                {func: sparki, cmd: "T1000"},
                {func: sleepMS, ms: 100}
            ],
            repeat: [
                {func: sparki, cmd: "SAZ"},  // Wait until we've stopped moving
                {func: function (e,s,c) { if (e.devices.sparki.sensors.AZ > -10 && e.devices.sparki.sensors.AZ < -9) return true}, ifTrue:"BeepOff"}
            ]
        },
        {
            name: "BeepOff",
            commands :[
                {func: sparki, cmd: "T"}
            ]
        }
    ]
};


var ProgramBark = {
    name: "WaitForPickup",
    steps: [
        {
            name: "Start",
            commands: [
                {func: sparki, cmd: "R0"},
                {func: sparki, cmd: "T200|500"}
            ],
            repeat: [
                {func: sparki, cmd: "SAZ"},  // Spin until we detect we're picked up
                {func: function (e,s,c) { if (e.devices.sparki.sensors.AZ < -11 || e.devices.sparki.sensors.AZ > -8)
                    return true}, ifTrue: "Done"}  // We've been picked up!!
            ]
        },
        {
            name: "Done",
            commands: [
                {program: ProgramBeepOn}  // Complain until we're placed down, then exit this program
            ]
        }
    ]
};


var ProgramEdge = {
    name: "Go To Edge",
    steps: [
        {
            name: "Step1",
            commands: [
                {func: sparki, cmd: "R0"},
                {func: sparki, cmd: "MF"},

            ],
            repeat: [
                {func: sparki, cmd: "SEL|ER"},
                {func: function (e,s,c) {if (e.devices.sparki.sensors.EL<100 && e.devices.sparki.sensors.ER<100) return true;}, ifTrue:"Stop"},
            ]
        },
        {
            name: "Stop",
            commands: [
                {func: sparki, cmd: "MS"},
                {func: sparki, cmd: "T250|200"},
                {func: sleepMS, ms: "200"},
                {func: sparki, cmd: "T250|200"},
            ]
        }
    ]
};

var ProgramFindAndDrop={
    name: "FindAndDrop",
    steps: [
        {
            name: "Start",
            repeat: [
                {program: ProgramBark},  // Waits until picked-up and then placed down
                {func: sleepMS, ms: 2000},
                {program: ProgramDS},    // Now it is back home holding the target
                {program: ProgramEdge},  // Now on the edge
                {func: sparki, cmd:"GO2"}, // Drop it!!
                {func: sparki, cmd:"T100|500"},
                {func: sleepMS, ms: 2000}
            ]
        }
    ]
}


var sub1= {
    name: "sub1",
    steps: [
        {
            name: "Sub1Step1",
            commands: [
                {func: function (e, s, c) {console.log("cmd-sub1-0");}},
                {func: sleepMS, ms: "600"},
            ]
        }
    ]
};


var ProgramTest = {
    name: "Test Executioner",
    steps: [
        {
            name: "Step1",
            commands: [
                {func: function (e,s,c) {console.log("cmd0");}},
                {func: sleepMS, ms: "500"},
                {func: function (e,s,c) {console.log("cmd3");}},

            ],
            repeat: [
                {func: function (e,s,c) {console.log("REPEAT cmd0");}},
                {func: sleepMS, ms: "500"},
                {program: sub1},
            ]
        }
    ]
};



addProgram(ProgramFindAndDrop);
addProgram(ProgramEdge);
addProgram(ProgramTest);
addProgram(ProgramGetAllStatus);
addProgram(ProgramDS);
addProgram(ProgramBark);

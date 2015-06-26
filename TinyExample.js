/**
 * Created by cstakutis on 6/25/2015.
 */
if (typeof MM_Executioner =='undefined') {  // If not running from a browser, assume running in node.js and pull this in
   MM_Executioner = require("./MM/Executioner.js");
}


var Program = {
    name: "My Program",
    steps: [
        {
            name: "Step 1",
            commands: [
                {func: function () {console.log("Starting my first step.");}}
            ]
        }
    ]
};

function allDone() {
    console.log("Program is all done");
}

console.log("About to start the program...");
var exec=new MM_Executioner();
exec.startProgram(Program, {programDoneCallback:allDone})
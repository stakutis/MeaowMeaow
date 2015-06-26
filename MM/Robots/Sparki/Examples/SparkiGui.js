/**
 * Created by cstakutis on 6/24/2015.
 */
var executioner;
var Programs=[];


function log(str) {
    console.log("programs:"+str);
}

function addProgram(program) {
    Programs[Programs.length] = program;
    $('#select').append("<option value=''>"+program.name+"</option>");
}


function rangePlot(e, s, c) {
    log("rangePlot: Starting. Canvas:"+ c.canvas);
    var rangeCanvas = new RangeCanvas(c.canvas);
    if (typeof rangeCanvas == 'undefined') console.log("Could not find canvas:"+ c.canvas);
    log("my canv:"+rangeCanvas);
    console.log(rangeCanvas);
    var options={};
    if (c.range) options.range = c.range;
    if (c.label) options.label = c.label;
    if (c.skipAbove) options.skipAbove = c.skipAbove;
    if (c.sensor) {
        var desc={};
        desc.startAngle=0;
        desc.stopAngle=0;
        desc.stepAngle=0;
        desc.ary=[e.devices.sparki.sensors[c.sensor]];
        log("rangePlot: Call plotArray");
        rangeCanvas.plotArray(desc, options);
    }
    else rangeCanvas.plotArray(e.devices.sparki.depths, options);
}

function findTarget(e, s, c) {
    log("findTarget Starting");
    // Let's search the depth array, and stop when we find a bunch below the 'closerThan' and pick the middle one
    var i,i2;
    for (i=0; i< e.devices.sparki.depths.ary.length; i++)
        if (e.devices.sparki.depths.ary[i] < c.closerThan) break;
    log("leftEdge idx:"+i);
    if (i>=e.devices.sparki.depths.ary.length) return false;
    // Now find upper end
    for (i2=i+1; i2< e.devices.sparki.depths.ary.length; i2++)
        if (e.devices.sparki.depths.ary[i2] > c.closerThan) break;
    log("rightEdge idx:"+i2);
    i=i+Math.round((i2-i)/2);
    log("targetIdx:"+i);
    e.targetAngle = e.devices.sparki.depths.startAngle + i * e.devices.sparki.depths.stepAngle;
    e.targetDistance = e.devices.sparki.depths.ary[i];
    log("targetAngle:"+ e.targetAngle+" distance:"+ e.targetDistance);
    return true;
}




function sendGuiCommand() {
    var str;
    var jq=$("#command");
    str=jq.val();
    Sparki.sparki({advanceProgram:function(){}},{},{cmd:str});
    return false;
}

function updateFunction(str) {
    document.getElementById("programStatus").innerHTML=str;
}


document.getElementById("commandButton").addEventListener("click",sendGuiCommand,false);
document.getElementById("runButton").addEventListener("click",
    function() {
        log("Running program...");
        var program;
        log("Selected Idx:"+document.getElementById("select").selectedIndex);
        program=Programs[document.getElementById("select").selectedIndex];
        log("...Programe:"+program.name);
        executioner=new MM_Executioner();
        executioner.startProgram(program, {updateFunction: updateFunction});

    },false);


document.getElementById("abortButton").addEventListener("click",
    function() {
        log("Aborting program...");
        if (executioner) {
            executioner.abortProgram();
            document.getElementById("programStatus").innerHTML="Aborted";
        }
    },false);



function connectedFunction(result) {
    if (result==true) {
        log("Connected and ready!");
        // Probably enable buttons on gui
        document.getElementById("select").disabled=false;
    }
    else {
        console.log("Failed to connect to device:"+result.message);
    }
}


var idx=0;
function findSparkiDevice() {
    log("findSparkiDevice: idx:"+idx);
    if (idx >= MM_CommunicationDrivers.driverArray.length) {
        console.log("Could not find any Sparki devices");
        return;
    }
    var current=idx;
    idx++;
    MM_CommunicationDrivers.driverArray[current]().find("ArcBotics", function () {
        log("Found our Sparki!");
        var Serial = new MM_CommunicationDrivers.driverArray[current]();
        Sparki = new MM_Robots_Sparki(Serial);
        Serial.connect("ArcBotics",connectedFunction,function() {console.log("Failed to connect to ArcBotics")});
    }, findSparkiDevice);
}

findSparkiDevice();

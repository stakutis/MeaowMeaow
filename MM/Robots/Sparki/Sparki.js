/**
 * Created by cstakutis on 6/23/2015.
 */
function MM_Robots_Sparki(serialDevice) {
    var sensorList=['EL','ER','LL','LC','LR','AX','AY','AZ','MX','MY','MZ','TL','TC','TR','DD','SV','MR','ML','TS','TO'];
    var currentCommand=null;
    var Serial = serialDevice;

    Serial.subscribeRawData(accumResponse);

    var log=function(str) {
        console.log("sparki: "+str);
    };


    function ready (e, s, c) {
        log("sparkiReady: currentCommand:"+currentCommand);
        if (currentCommand) return false;
        return true;
    }

    var msgIn="";
    function accumResponse(msg) {
        var i;
        log("accumResponse: length:"+msg.length+" new:"+msg);
        for (i=0; i<msg.length; i++) {
            var char = String.fromCharCode(msg[i]);
            if (char=='\r' ||char=='\n') {
                var copy=msgIn;
                msgIn="";
                log("accumResponse: Got a full message!");
                if (copy!='') processResponse(copy);
                continue;
            }
            msgIn += char;
        }
        log("accumeResponse: On exit, accumlated to:"+msgIn);
    }

    function processResponse (msg) {
        if (msg[0] == '!') {
            console.log("*** DEVICE *** " + msg.substring(1));
            try { document.getElementById("RobotSays").innerHTML = msg.substring(1);} catch (e) {}
            return;
        }
        log("processResponse:" + msg);
        try {document.getElementById("Response").innerHTML = msg;} catch (e) {}
        var saveCommand = currentCommand;
        currentCommand = null;  // Free it up so any callbacks can add another command

        if (!saveCommand) {
            log("NOT READY FOR COMMAND/RESPONSE");
            return;
        }

        if (msg[0] != 'C') {
            console.log("BAD MESSAGE:" + msg);
            saveCommand.executioner.state.status = "ERROR";
            saveCommand.executioner.state.reason = msg;
            saveCommand.executioner.advanceProgram(false);
            return;
        }
        msg = msg.substring(1);

        /***** See if we sent a get-sensors command ******/
        if (saveCommand.command.cmd.startsWith("S")) {
            saveCommand.executioner.devices = saveCommand.executioner.devices || {sparki:{}};
            saveCommand.executioner.devices.sparki.sensors = saveCommand.executioner.devices.sparki.sensors || {sensors:{}};

            var parts = msg.split("|");
            var i;
            for (i = 0; i < parts.length; i++) {
                //log("Part "+i);
                if (!parts[i].length) continue;  // Skip empty ones
                var val = parseFloat(parts[i].substring(2));
                saveCommand.executioner.devices.sparki.sensors[parts[i].substr(0,2)] = val;
                try {
                    document.getElementById(parts[i].substr(0, 2)).innerHTML = val;
                } catch (e) {}
            }
        }

        /**** See if we sent a depth-scan *****/
        if (saveCommand.command.cmd.startsWith("D")) {
            saveCommand.executioner.devices = saveCommand.executioner.devices || {sparki:{}};
            saveCommand.executioner.devices.sparki.depths = saveCommand.executioner.devices.sparki.depths || {ary:[]};

            var parts;
            parts = saveCommand.command.cmd.substr(1).split("|");
            saveCommand.executioner.devices.sparki.depths.startAngle=parseInt(parts[0]);
            saveCommand.executioner.devices.sparki.depths.stopAngle=parseInt(parts[1]);
            saveCommand.executioner.devices.sparki.depths.stepAngle=parseInt(parts[2]);
            log("startAngle:"+saveCommand.executioner.devices.sparki.depths.startAngle+
            " stopAngle:"+saveCommand.executioner.devices.sparki.depths.stopAngle+
            " stepAngle:"+saveCommand.executioner.devices.sparki.depths.stepAngle);
            parts = msg.split("|");
            var i;
            for (i = 0; i < parts.length; i++) {
                //log("Part "+i);
                if (!parts[i].length) continue;  // Skip empty ones
                saveCommand.executioner.devices.sparki.depths.ary[i]=parseInt(parts[i]);
                log("ary "+i+": "+saveCommand.executioner.devices.sparki.depths.ary[i]);
            }
        }

        saveCommand.executioner.devices.sparki.response = msg;
        saveCommand.executioner.advanceProgram();
    }


    function sparki(e, s, c) {
        log("cmd:"+ c.cmd);
        if (currentCommand) {
            log("Command already in progress!");
            return false;
        }
        currentCommand = {
            executioner: e,
            step: s,
            command: c};
        e.devices = e.devices  || {};
        e.devices.sparki = e.devices.sparki || {};
        e.advanceOnTimer = false; // because callback from I/O will do it
        try { document.getElementById("LastSent").innerHTML = c.cmd; } catch (e) {};
        Serial.write(c.cmd+"\n");
        return true;
    }

    return {
        sparki: sparki, // Send a command to the robot!
        ready: ready
    }

}


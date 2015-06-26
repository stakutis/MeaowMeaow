/**
 * Created by cstakutis on 2/15/2015.
 */

/*
 * Caller passes in:
 * .conf.trace(str)  Optional
 * .communicationImpl
 * .id   Network ID of what to connect() to
 * connectSuccess()   Optional; if has to re-connect on its own, call this.
 */
var am1 = function (_conf) {


    var conf = _conf;
    
    // If they didn't give us a wrapper class, go make it
    if (!conf.wrapper) conf.wrapper=new CommunicationWrapper({
        communicationImpl: conf.communicationImpl,
        id: conf.id,
        trace: conf.trace,
        connectSucc: function(func) {
            trace("connectSucc: Connected...");
            accum=[];
            if (timeoutID) clearTimeout(timeoutID);
            // Let's wait 250ms then send our ENQ
            setTimeout(function () {
                trace("connectSucc: Sending ENQ...");
                var xx = new Uint8Array(1);
                xx[0] = 0x05;
                conf.communicationImpl.write(xx,
                    function () { },
                    function () { });
                setTimeout(func, 250);  // Wait a little bit before continuing
            }, 750);
        }
    });
    /*
     * Increase error-return structure
     */
    var errs = conf.wrapper.errs;
    errs.INFO_FIRST = "Call INFO First";
    errs.UNSUPPORTED = "Unsupported";

    var lineReceivedCallback=null;  // Function that gets called when a complete message is received
    var timeoutID;  // The running timer for the current command
    var succ_func, fail_func; // Callbacks of current command outstanding
    var accum;  // The current "line" coming in...in pieces
    var getRecordsOptions;
    var batteryCommand = false; // To know if waiting specifically for getBattery response
    var AckOrNak = false;       // If current command will ONLY receive ack or nak and no data


    /*
     * Internal function to help debugging...showing various details underway
     */
    function trace(str) {
        if (conf.trace) conf.trace("am1:"+str);
    }

    // --------------------------------------------------------------------------
    // waitForLine()
    //
    // Centralized function used on every command sent.  We'll set up the receiver handler
    // to be the function the caller requested and we'll set a timeout. This doesn't
    // actually wait...uhg...bad name...it just sets things up.
    // --------------------------------------------------------------------------
    function waitForLine(longTimeout, _success) {
        trace("Wait for line start...");
        lineReceivedCallback = _success;
        clearTimeout(timeoutID);
        timeoutID=setTimeout(lineReceivedCallback, longTimeout);
    }


    // --------------------------------------------------------------------------
    // sendAndReceive()
    //
    // Centralized function to send a command to the device, and a function to
    // call when that command is complete.  We'll assume a timeout of 3 seconds which
    // is easily good enough, and we'll set up a timer for that.
    // --------------------------------------------------------------------------
    function sendAndReceive(cmd, success, nodata) {
        trace("SendAndReceive "+cmd);
        AckOrNak = false;
        if (nodata) AckOrNak = true;
        if (cmd=="b") batteryCommand = true;  // It's a hacky device and wont respond in a normal way
        else batteryCommand = false;
        accum="";
        waitForLine(3000, success);  // Set up the data-receiver and a timeout
        // Now, send the command...
        conf.communicationImpl.write(cmd+"\r",
            function(){
                trace("cmd wrote it:"+cmd);
            },
            function(){
                lineReceivedCallback=null;
                alert("Failed write; this NEVER happens");
                trace("cmd failed write");
                fail(errs.COMM_FAIL);
            });
    }


    // --------------------------------------------------------------------------
    // wasFailure() - Boolean
    //
    // Centralized function to handle the receipt (or lack) from any random
    // command. In general, if the response is not null, then continue/success.
    // If null, then it timedout so do some error handling and restart the loop.
    // --------------------------------------------------------------------------
    function wasFailure(str, of) {
        clearTimeout(timeoutID);  // Clear the timeout that might still be pending
        if (!str || str=="") {
            lineReceivedCallback=null;
            //console.log("wasFailure of "+of);
            fail_func(errs.COMM_FAIL);
            return true;
        }
        return false;
    }

    var paragraph="";
    var blockNumber;

    function verifyFullParagraph(items) {
        if (items[0].substring(3,3+4)!="3600" ||
            items[1].substring(3,3+4)!="7900" ||
            items[2].substring(3,3+4)!="7901" ||
            items[3].substring(3,3+4)!="7902" ||
            items[4].substring(3,3+4)!="7903" ||
            items[5].substring(3,3+4)!="7904" ||
            items[6].substring(3,3+4)!="7905" ||
            items[7].substring(3,3+4)!="7906" ||
            items[8].substring(3,3+4)!="7908" ||
            items[9].substring(3,3+4)!="7909") {
            console.log("******************* NOT FULL PARAGRAPH *******************");
            console.log(paragraph);
            //alert("Not full paragraph!");
        }
        else {
            //if (stop)
            //console.log("PARAGRAPH FULL");
        }
    }

    // --------------------------------------------------------------------------
    // accumParagraph()
    //
    // When pulling a block of measurements, they come in "lines"; many lines makes
    // up a paragraph.  Keep accumulating the lines until we find the last line of a
    // paragraph.  Once we find that, we can display what we have on the screeen.
    // --------------------------------------------------------------------------
    function accumParagraph(str) {
        if (!wasFailure(str,"accumParagraph")) {
            paragraph+=str+"\r";
            //console.log("accumParagraph got:"+str);
            // See if this is the last of a paragraph
            if (str=="0098540") {  // End-of-paragraph tag
                trace("Got paragraph!");
                //console.log("Got a pargraph:"+paragraph);
                var i;
                var items=paragraph.split("\r");  // Split into lines, and go thru each line.
                verifyFullParagraph(items);
                var times, dates;
                // FEF50:3774 PEF:263 FVC:2881 FEV1:2778 FEF7525:3498 FEF75:1 MODE:0 FEF25:
                var FEF50, PEF, FVC, FEV1, FEF7525, FEF75, MODE, FEF25;
                for (i=0; i<items.length; i++) {
                    if (items[i].substring(3,3+4)=="7901") PEF=items[i].split(":");
                    if (items[i].substring(3,3+4)=="7904") FEF50=items[i].split(":");
                    if (items[i].substring(3,3+4)=="7900") FVC=items[i].split(":");
                    if (items[i].substring(3,3+4)=="7902") FEV1=items[i].split(":");
                    if (items[i].substring(3,3+4)=="7906") FEF7525=items[i].split(":");
                    if (items[i].substring(3,3+4)=="7903") FEF75=items[i].split(":");
                    if (items[i].substring(3,3+4)=="7911") MODE=items[i].split(":");
                    if (items[i].substring(3,3+4)=="7905") FEF25=items[i].split(":");
                    if (items[i].substring(3,3+4)=="7908") dates=items[i].split(":");
                    if (items[i].substring(3,3+4)=="7909") times=items[i].split(":");
                }
                // Now go thru the measurements in this block...and display them...
                if (PEF.length<=1) {
                    //console.log("***** BLANK measurement row");
                }
                else
                    for (j=1; j<PEF.length; j++) {
                        // Here's where we'd accumulate the stuff that needs to be transmitted
                        //console.log("Measurement "+j+":"+measurements[j]+" Date:"+dates[j]+" Time:"+times[j]);
                        var timeStr=""+times[j];
                        var dateStr=""+dates[j];
                        dateStr=dateStr.replace(/\./g,"/");
                        timeStr=timeStr.replace(".",":");
                        var dateObject = makeDateObject(dateStr, timeStr);
                        //console.log("dateStr:"+dateStr+" dateObject.toISO:"+dateObject.toISOString());
                        var record={};
                        record.TIME = dateObject.toISOString();
                        record.FEF50=parseInt(FEF50[j]);
                        record.PEF=parseInt(PEF[j]);
                        record.FVC=parseInt(FVC[j]);
                        record.FEV1=parseInt(FEV1[j]);
                        record.FEF7525=parseInt(FEF7525[j]);
                        record.FEF75=parseInt(FEF75[j]);
                        record.MODE=MODE[j];
                        record.FEF25=parseInt(FEF25[j]);
                        record.guid=""+blockNumber+"-"+j;
                        am1_records[am1_records.length]=record;
                    }
                getNextBlock();  // Off to the next block!  Or, stops.
            }
        }
    }



    // --------------------------------------------------------------------------
    // getNextBlock()
    //
    // The list of measurements are in blocks, numbered 1 to 5.  Lets get one
    // at a time and then stop after the 5th.  A block is a bunch of lines in a row.
    // So we'll use a special accumulator that will bunch-up all the lines til it
    // detects the end of a paragraph, then it will call this to go to the next
    // block (or stop).
    // --------------------------------------------------------------------------
    var val1=0,val2=0,val3=0,val4=0;
    var startTime;

    function getNextBlock() {
        paragraph="";
        blockNumber++;
        //console.log("***************** GetNextBlock "+blockNumber+" *****************");
        if (blockNumber>5) {
            trace("Done with blocks");
            lineReceivedCallback=null;
            if (getRecordsOptions.guid) {
                trace("A guid is specified. So, remove all items up-to-and-including it first");
                var i;
                for (i=0; i<am1_records.length; i++)
                    if (am1_records[i].guid == getRecordsOptions.guid) break;
                am1_records = am1_records.splice(i+1); // which now might be an empty array
            }
            trace("Will reverse records and then trunc");
            am1_records.reverse();
            if (getRecordsOptions.count < am1_records.length)
                am1_records = am1_records.splice(0, getRecordsOptions.count );
            succ_func(am1_records);
        }
        else {
            startTime = new Date();
            sendAndReceive("B0"+blockNumber,accumParagraph);
        }
    }


    var count=0;  // just a global to keep track of how many loops, for fun.

    // --------------------------------------------------------------------------
    //  Receive any data coming in from the device.
    //
    // Build-up the data into a string. When the message is complete, call the
    // registered "lineReceivedCallback()" function.
    // --------------------------------------------------------------------------
    var accum="";
    function received(data) {
        var bytes = new Uint8Array(data);
        //trace("subscribe got bytes:"+bytes.length);
        for (i=0;i<bytes.length;i++) {
            //trace("byte "+i+":"+bytes[i]);
            if (bytes[i]==0x06) {
                trace("ACK!");
                //isENQed=true;  // This isn't really right...but it's ok
                accum="";
                if (AckOrNak && lineReceivedCallback) lineReceivedCallback(bytes[i]);
            }
            else if (bytes[i]==0x05) {
                trace("NAK!");
                //isENQed=false;
                accum="";
                if (AckOrNak && lineReceivedCallback) lineReceivedCallback(bytes[i]);
            }
            else if (bytes[i]==13) {
                //if (stop) console.log("--String is:"+accum);
                if (lineReceivedCallback) lineReceivedCallback(accum);
                accum="";
            }
            else if (bytes[i]==10) {
                //console.log("EOL!");
                accum="";
            }
            else accum+=String.fromCharCode(bytes[i]);
        }
        if (batteryCommand && accum.length > 0) {
            trace("battery:"+accum);
            batteryCommand = false;
            if (lineReceivedCallback) lineReceivedCallback(accum);
            accum="";
        }
    }

    var am1_info={};
    var am1_records=[];

    function am1_getAllRecords(succ, fail, options) {
        /*
        Our device stores data from oldest-to-newest, and in blocks of 100.
        The caller always wants the newest ones and reverse the array for them.
        After we get ALL records, lets reverse the list, then trim to only return
        what they wanted.
         */
        if (!options) options = {count: 2000, start: 1};
        trace("am1_getAllRecords: start:"+options.start+" count:"+options.count+" guid:"+options.guid)
        getRecordsOptions = options;
        succ_func = succ;
        fail_func = fail;
        // Get measurement blocks...starting with the first
        blockNumber = 1;
        if (options.guid) {
            // We can start at the specified block number
            blockNumber = parseInt(options.guid.split("-")[0]);
            trace("Using block number specified by guid:"+blockNumber);
        }
        blockNumber--;  // Iterator starts by incrementing
        am1_records=[];
        getNextBlock();
    }

    function mergeObject(dst, src) {
        for (var attrname in src) { dst[attrname] = src[attrname]; }
    }

    // --------------------------------------------------------------------------
    // gotNumberMeasurements()
    //
    // Response from get-number-measurements. Next, let's start by getting blocks
    // of measurements...
    // --------------------------------------------------------------------------
    function gotNumberMeasurements(str) {
        if (!wasFailure(str,"number of measurements")) {
            str=str.substring(1); // Remove the "B"
            var items=str.split(":");
            mergeObject(am1_info,{count: parseInt(items[0])});
            trace("Count:"+items[0]);
            // Get battery
            sendAndReceive("b", gotBattery);
        }
    }

    function gotBattery(str) {
        if (!wasFailure(str,"number of measurements")) {
            trace("gotBattery:" + str);
            mergeObject(am1_info, {batteryState: str});
            succ_func(am1_info);
        }
    }

    function makeDateObject(dateStr, timeStr) {
        //trace("makeDateObject: dateStr:"+dateStr+" timeStr:"+timeStr);
        var dateObject = new Date(
            Date.UTC(
                2000 + parseInt(dateStr.substr(6,2)), // Year
                parseInt(dateStr.substr(3,2)) - 1,    // Month
                parseInt(dateStr.substr(0,2)),        // Day
                parseInt(timeStr.substr(0,2)),        // Hour
                parseInt(timeStr.substr(3,2)), 0,0));
        //trace(" --"+dateObject);
        return dateObject;
    }

    // --------------------------------------------------------------------------
    // gotSettings()
    //
    // Response from the get-status request. Display on the screen and advance to
    // the next step, which is to get the number of measurements.
    // --------------------------------------------------------------------------
    function gotSettings(str) {
        if (!wasFailure(str,"settings")) {
            trace(str);
            str=str.substring(1); // Remove the "S"
            var items=str.split(":");
            mergeObject(am1_info,{
                patient: items[0],
                date: makeDateObject(items[1], items[2]).toISOString()});
            // items[1].replace(/\./g,"/")+"  "+items[2].replace(/\./g,":")
            // Get number of measurements
            sendAndReceive("C", gotNumberMeasurements);
        }
    }

    // --------------------------------------------------------------------------
    // gotVersion()
    //
    // Response from the get-version request.  Display on screen and advance to
    // the next step, which is to get the Status info.
    // --------------------------------------------------------------------------
    function gotVersion(str) {
        if (!wasFailure(str,"version")) {
            trace(str);
            //str=str.substring(1); // Remove the "v"
            var items=str.split(":");
            mergeObject(am1_info,{version: items[0], sn: items[1] });
            // Get settings
            sendAndReceive("S", gotSettings);
        }
    }


    function am1_getInfo(succ, fail) {
        succ_func = succ;
        fail_func = fail;
        timesFailed=0;
        am1_info={}; // Clear the response structure
        sendAndReceive("v", gotVersion);
    }


    function am1_setInfo(succ, fail, opt) {
        succ_func = succ;
        fail_func = fail;
        trace("am1_setInfo: opt:"+opt);
        if (!opt.time) {
            // We can only handle setting the time right now
            fail(errs.UNSUPPORTED,"UNSUPPORTED");
            return;
        }
        trace("sending time:"+opt.time);
        /*********************
         *
         * Note about 'time'....
         *
         * It looks like the predecessor java software stored the date/time value on the device
         * in UTC time.  Which is "ok"...at least the time is more real then, regardless of where the
         * device might be.
         */
        var dd=new Date(opt.time);
        trace("again:"+dd);
        // Set TIME first, then date
        var str="T";
        if (dd.getUTCHours()<10) str+="0";
        str+=dd.getUTCHours();
        str+=".";
        if (dd.getUTCMinutes()<10) str+="0";
        str+=dd.getUTCMinutes();
        trace("Will send:"+str);
        sendAndReceive(str, sentTime, true);
    }

    function sentTime(obj) {
        trace("sentTime: obj:"+obj);
        if (!wasFailure(obj,"setTime")) {
            var dd = new Date(timedCommandParam.time);
            trace("Date again:" + dd);
            // Set  DATE now
            var str = "D";
            if (dd.getUTCDate() < 10) str += "0";
            str += dd.getUTCDate();
            str += ".";
            if (dd.getUTCMonth() < 9) str += "0";
            str += dd.getUTCMonth() + 1;
            str += ".";
            var y = dd.getUTCFullYear() - 2000;
            if (y < 10) str += "0";
            str += y;
            trace("Will send:" + str);
            sendAndReceive(str, sentDate, true);
        }
    }

    function sentDate(obj) {
        trace("sentDate: obj:"+obj);
        if (!wasFailure(obj,"setDate"))
            succ_func(obj);
    }

    function _dead_enq() {
        var xx=new Uint8Array(1);
        isENQed = false;
        xx[0]=0x05;
        conf.communicationImpl.write(xx,
            function(){},
            function(){});
    }

    function doInitializationCommand() {
        if (InitializationCommands.length==0) {
            trace("doInitializationCommand DONE");
            succ_func("Success");
            return;
        }
        var command = InitializationCommands[0];
        trace("doInitializationCommand command:"+command);
        InitializationCommands.splice(0,1); // Remove first and move onward
        sendAndReceive(command,
            function (obj) {
                trace("doInitializationCommand received:"+obj);
                if (obj == 0x05) obj=null;  // NAK recevied.
                if (!wasFailure(obj,"initcommand")) doInitializationCommand();
            }, true);
    }

    function am1_initialize(succ, fail) {
        var UseCheckSumCommand      = 'ccc';
        /* All of these have <CHS> before the end if case we care someday */
        var SetPatientIDCommand      = 'I         ';
        var SetTimeWindowCommand     = 'q01:0000:2359:15';
        var SetPinCommand            = 'p2008';
        var SetCommWaitTimeCommand   = 'a090';
        var SetDisplayCommand        = 'P1';
        var SetPEFThresholdYRCommand = 'R101';
        var SetPEFThresholdFYCommand = 'G201';
        var SetVariabilityCommand    = 'V0';
        var SetDSTCommand            = 'W00000';
        var InitializationCommands   = [];
        succ_func = succ;
        fail_func = fail;
        trace("am1_initialize");
        // If we set the CheckSum setting, then we have to add checksums to the other commands
        InitializationCommands = [/* UseCheckSumCommand, */ SetPatientIDCommand, SetTimeWindowCommand,
            SetPinCommand, SetCommWaitTimeCommand, SetDisplayCommand, SetVariabilityCommand];
        doInitializationCommand();
    }


    function am1_connect(succ, fail, opt) {
        // Most/all of the real work has to be done in the connectSuccess callback
        trace("am1_connect: Must have succeeded to connect");
        succ();
    }

// Setup our listener for incoming commands
    conf.communicationImpl.subscribeRawData(function (data) {
        received(data);
    }, function() {console.log("subscribe failed");});


    return {
        errs: errs,
        start:      function (succ, fail, timeout) { conf.wrapper.doTimedCommand(am1_connect, succ, fail, timeout); },
        initialize: function (succ, fail, timeout, opt) { conf.wrapper.doTimedCommand(am1_initialize, succ, fail, timeout, opt); },
        get:        function (succ, fail, timeout, opt) { conf.wrapper.doTimedCommand(am1_getInfo, succ, fail, timeout, opt); },
        set:        function (succ, fail, timeout, opt) { conf.wrapper.doTimedCommand(am1_setInfo, succ, fail, timeout, opt); },
        records:    function (succ, fail, timeout, params) { conf.wrapper.doTimedCommand(am1_getAllRecords, succ, fail, timeout, params);},
        end:        function (succ, fail) { conf.communicationImpl.disconnect();  succ();}
    }

}
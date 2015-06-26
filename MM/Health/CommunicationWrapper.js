/**
 * Created by cstakutis on 3/3/2015.
 */


/*********************
 *
 * This is a utility wrapper for most of the healthcare devices.  Generally, it allows
 * the caller to specify a timed-command (which fails automatically if the timeout occurs)
 * and this is typically for longer-running commands.
 *
 * The devices we talk to generally have a problem in that they go out-of-range or power
 * off or time out.  In all such cases, they need to be re-connected.  So, the other value
 * of this module is that it will repeatedly call a specified function until either it succeeds,
 * or times out, BUT, if it detects it dropped the connection it will quietly try to re-establish
 * that for the caller. This greatly simplifies the level of work/worry for the caller.
 *
 **********************/

    /*
     * Caller passes-in:
     * .communicationImpl   // Lowerlevel driver object that has the .connect() function
     * .id              // Bluetooth ID for a potential "connect()"
     * .connectSucc()   // When a connect happens, and succeeds, usually the upper layer has other work to do.
     * .trace()         // Optional ... for tracing/logging
     */

var CommunicationWrapper = function(_conf) {
    var conf=_conf;

    // Ensure the specified conf has a connectSucc() function defined
    conf.connectSucc = conf.connectSucc || function () {};

    // Our various stats while running; could be interesting to the caller so add
    // it into their structure
    conf.stats = {
        commandAttempts:0,
        commandRetries:0,
        commandFailures:0,
        commandSuccess:0,
        connectionSuccesses:0};

    // Here are the things that could go wrong
    var errs = {
        NO_DEVICE: "NODEVICE",
        COMM_FAIL: "COMMFAIL",
        REENTRANT: "REENTRANT"}


    var defaultTimeoutMS = (30 * 1000);         // 30 seconds if not specified
    var commandStartTime;                       // 'Date()' of when a command-set starts
    var commandTimeoutMS = defaultTimeoutMS;    // For the currently active command-set
    var inProgress=false;                       // Boolean if a command is already underway; we are NOT reentrant
    var timedCommandSucc, timedCommandFail, timedCommandFunc, timedCommandParam; // Callbacks
    var wasConnected = false;  // Helps us not bug the caller when conn drops way after the connect was good

    function trace(str) {
        if (conf.trace) conf.trace("CommWrapper:"+str);
    }


    /*
     * doTimedCommandItem
     *    This is the main work-horse function. This is essentially called in a loop until the specified
     *    timeout expires (or success or failure).  BUT it is smart to know if the device needs to be
     *    re-connected() and will do that when needed.
     */
    function doTimedCommandItem() {
        trace("doTimedCommandItem");
        conf.stats.commandAttempts++;
        // First, see if we've been running this attempt for too long
        if (new Date() - commandStartTime > commandTimeoutMS) {
            trace("doTimedCommandItem FULLY timed-out");
            inProgress = false;
            conf.stats.commandFailures++;
            timedCommandFail(errs.COMM_FAIL);
        }
        else {
            // If we're not connected yet (or might have auto-unconnected), well then, let's do that first
            trace("doTimedCommandItem: First check if we're connect...");
            conf.communicationImpl.isConnected(
                function () {
                    // We ARE connected. Then good-to-go to process the command
                    trace("doTimedCommandItem: Connected. Happily able to send the real command");
                    timedCommandFunc(function (obj) {
                            trace("timedCommandFunc success");
                            inProgress = false;
                            conf.stats.commandSuccesses++;
                            timedCommandSucc(obj);
                        },
                        function (obj) {
                            trace("timedCommandFunc fail:" + obj);
                            doTimedCommandItem();  // Try again
                        }, timedCommandParam);
                },
                function () {
                    trace("doTimedCommandItem: We are NOT connected. Uhg.  Let's connect");
                    wasConnected = false;
                    conf.communicationImpl.connect(conf.id,
                        function (msg) {
                            trace("doTimedCommandItem: Succeed doing a forced-connect.");
                            wasConnected = true;
                            conf.stats.connectionSuccesses++;
                            commandStartTime = new Date();          // Restart our start time
                            conf.connectSucc(doTimedCommandItem);  // Call the conn succ func, but then resume this command!
                        },
                        function (msg) {
                            // Keep in mind, this area will get triggered under different circumstances.
                            // First, if the connect fails, it gets hit.  But, even after a success, later,
                            // if/when the connect drops, it gets hit.  In THAT case, we dont want to try
                            // to automatically re-connect
                            trace("doTimedCommandItem: Received connect() failure");
                            if (!wasConnected) doTimedCommandItem();  // Try again
                            else wasConnected=false;  // We're no longer connected -- happened long after conn succed
                        });
                });

        }
    }


/*
 * doTimedCommand
 *    This is the main exposed function.  The caller is asking us to call some specified function
 *    and then the functions to call on-success or on-failure.  We'll bound it with a timeout for
 *    a safeguard and repeatedly try the specified call.
 */
    function doTimedCommand(func, succ, fail, timeout, param) {
        if (inProgress) {
            trace("doTimedCommand: Already active");
            fail(errs.REENTRANT, "Command already active");
            return;
        }
        inProgress = true;
        commandTimeoutMS = timeout || defaultTimeoutMS;
        commandStartTime = new Date();
        timedCommandSucc = succ;
        timedCommandFail = fail;
        timedCommandFunc = func;
        timedCommandParam = param;
        trace("doTimedCommand timeout:"+timeout);
        doTimedCommandItem();
    }

    return {
        errs: errs,
        doTimedCommand: doTimedCommand
    }
}
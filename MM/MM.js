/**
 * Created by cstakutis on 6/23/2015.
 */

/*******************************
 * General functions that a 'program' might want to call
 */
var MM = (function(module) {


    module.timedOut = function (e, s, c) {
        if (s.stepMS) if (new Date() - s.stepStartTime > s.stepMS) return true;
        if (s.MS) if (new Date() - e.startTime) return true;
        return false;
    };

    module.sleepMS = function (e, s, c) {
        log("sleepMS: "+ c.ms);
        e.advanceOnTimer = c.ms;
    };

    module.alwaysTrue = function (e, s, c) {
        return true;
    };

    return module;

})(MM || {});

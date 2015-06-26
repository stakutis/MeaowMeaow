
/**
 * Created by cstakutis on 6/23/2015.
 */


var MM_CommunicationDrivers=(function() {
    var driverArray=[];
    function addDriver(drvr) {
        driverArray.push(drvr);
    }



    return {
        addDriver: addDriver,
        driverArray: driverArray
    }
}());

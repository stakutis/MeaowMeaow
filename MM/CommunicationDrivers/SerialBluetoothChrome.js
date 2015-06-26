/**
 * Created by cstakutis on 6/23/2015.
 */

/****************************************
 * Create the MMComm 'SerialBluetoothChrome' object and add
 * it to the drivers table
 ****************************************/
if (chrome && chrome.bluetoothSocket) // Only add if chrome/bluetooth is defined/available
MM_CommunicationDrivers.addDriver(

function() {

    // Our private per-instance variables
    var socketId = 0;
    var socket;

    function log(str) {
        console.log("SerialBluetoothChrome:" + str);
    }

    function str2ab(str) {
        var buf = new ArrayBuffer(str.length); // 2 bytes for each char
        var bufView = new Uint8Array(buf); //new Uint16Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            //bufView[i] = str[i]; //str.charCodeAt(i);
            if (typeof str == "string")
                bufView[i] = str.charCodeAt(i);
            else
                bufView[i] = str[i];
        }
        console.log("buf:"+buf);
        console.log(buf);
        return buf;
    }

    function write(ary, succ, fail) {
        log("Writing:"+ary+" to sockedId:"+this.socketId);
        chrome.bluetoothSocket.send(this.socketId, str2ab(ary),
            function (sent) {
                //console.log("SEND DATA!!!!!!!!!!!!!!!!!!!!!!!!!");
                log("Sent bytes:"+sent);
            });
    }

    function subscribeRawData(succ, fail) {
        var _this = this;
        log("subscribeRawData:  Set");
        chrome.bluetoothSocket.onReceive.addListener(function (receiveInfo) {
            log("onReceive: receive.socketId:"+receiveInfo.socketId+" vs:"+_this.socketId);
            if (receiveInfo.socketId != _this.socketId)
                return;
            // receiveInfo.data is an ArrayBuffer.
            // console.log(ab2str(receiveInfo.data));
            var bytes = new Uint8Array(receiveInfo.data);
            log("onReceive: #bytes:"+bytes.length);
            var msgIn = "";
            var i;
            for (i = 0; i < bytes.length; i++)
                msgIn += String.fromCharCode(bytes[i]);
            log("onRecive: as string:"+msgIn);
            succ(bytes);
        });
    }

    function isConnected(succ, fail) {
        if (!this.socketId) fail();
        else
            chrome.bluetoothSocket.getInfo(this.socketId, function (si) {
                log("isConnected: si.connected:" + si.connected);
                if (si.connected) succ(); else fail();
            });
    }

    function find(name, succ, fail) {
        // Call 'succ'  if finds a device in our network that resembles "name" else 'fail'
        // Maybe we could make 'name' be also a UUID or even a struct and specify device-type etc
        var _this = this;
        chrome.bluetooth.getDevices(function (devices) {
            for (var i = 0; i < devices.length; i++) {
                log("connect: looking at " + devices[i].name);
                if (devices[i].name.startsWith(name)) {
                    log("FOUND " + name + "!!!!");
                    succ(devices[i]);
                    return;
                }
            }
            fail();
        });
    }

    function connect(name, succ, fail) {
        var _this = this;
        find(name, function (device) {
            _this.socket = chrome.bluetoothSocket.create(function (createInfo) {
                _this.socketId = createInfo.socketId;
                chrome.bluetoothSocket.connect(createInfo.socketId,
                    device.address, device.uuids[0], function () {
                        if (chrome.runtime.lastError) {
                            log("Connection failed: " + chrome.runtime.lastError.message);
                            fail(chrome.runtime.lastError);
                        } else {
                            // Profile implementation here.
                            log("Here we go...connected to " + name + "!!");
                            succ(true);
                        }
                    });
            });
        }, fail);
    }

    return {
        type    : "serial",
        network : "bluetooth",
        implementationLibrary :  "chrome",

        /* Discovery and connect functions */
        find    : find,
        connect : connect,
        isConnected : isConnected,

        /* I/O functions */
        subscribeRawData: subscribeRawData,
        write   : write
    }
});


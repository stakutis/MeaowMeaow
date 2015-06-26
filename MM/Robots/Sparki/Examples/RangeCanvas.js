/**
 * Created by cstakutis on 6/14/2015.
 */

var RangeCanvas=function(ElementId) {
    var log=function(str) {
        console.log("RangeCanvas: "+str);
    }


    var canvas = document.getElementById(ElementId);
    if (!canvas) {
        log("FAILED to find element: "+ElementId)
        return undefined;
    }
    var ctx = canvas.getContext("2d");
    var lastX= 0, lastY=-100;


    var cWidth = canvas.width, cHeight = canvas.height;
    var range = 100; // This means we expect values 0..100 and for that to take the whole area

    function convertX(x) {
        // 0,0 to us is middle bottom
        return cWidth / 2 + x;
    }

    function convertY(y) {
        return cHeight - y;
    }

    function degrees2Radians(d) {

        return d * Math.PI / 180;
    }

    function drawLineOfSight(angle, cms_in, label) {
        var cms=cms_in;
        if (cms > range) {
            log("cms_in:"+cms_in+" above range:"+range);
            cms = range;
        }
        if (angle >= 0) angle = 90 - angle;
        else angle = -angle + 90;
        log("converted angle to:" + angle);

        var lineLength = Math.round(cHeight * (cms / range));
        console.log("cms:"+cms+" converted to linelength:" + lineLength);
        var x = Math.round(lineLength * Math.cos(degrees2Radians(angle)));
        var y = Math.round(lineLength * Math.sin(degrees2Radians(angle)));
        log("converted to x:" + x + " y:" + y);
        ctx.beginPath();
        ctx.moveTo(convertX(0), convertY(0));
        ctx.lineTo(convertX(x), convertY(y));
        ctx.strokeStyle = "black";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(convertX(x), convertY(y), 5, 0, 2 * Math.PI);
        ctx.fillStyle = "black";
        ctx.fill();

        // Dont put a label if too close to the last one
        if (label)
        if (Math.abs(lastX-x) > 15 ||
            Math.abs(lastY-y) > 15)
        {
            ctx.font="bold 10px Georgia";
            // Determine if above or below the dot
            var margin=10;
            var useY=convertY(y)-margin;
            if (useY<0) useY=margin;
            ctx.fillText(""+cms_in,convertX(x)-5,useY);
            lastX=x;
            lastY=y;
        }

    }

    function plotArray(desc, options) {
        // desc. has: startAngle, stopAngle, stepAngle, and ary[]
        var label=false;
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (options) {
            if (options.range) range = options.range;
            if (options.label) label = options.label;
        }

        var i;
        var angle = desc.startAngle;
        for (i=0; i<desc.ary.length; i++) {
            if (!options.skipAbove || desc.ary[i] < options.skipAbove)
                drawLineOfSight(angle, desc.ary[i], label);
            angle += desc.stepAngle;
        }
    }

    return {
        plotArray: plotArray
    }
}


// Constants

const fontsize = 24;
const fontoffsetx = 10;
const fontoffsety = 0;
const backoffsetx = -3;
const backoffsety = 5;
const fonttype = "Courier New";
const font = "bold " + fontsize + "px " + fonttype;
const cycletime = 500;
const keydowntime = 200;
const framerate = 20;
const framedelay = 1000 / framerate;

// various utility functions
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function getMiliTime() {
    return new Date().getTime();
}

// Object definitions

// a massive object id generator
var serializer = 0;

// a basic tile. these are stored in a list and drawn in order. background color is optional
function Tile(name, char, color, background, doesCollide, doesBlockLight, actionable) {
    this.id = serializer++;
    this.name = name;
    this.char = char;
    this.color = color;
    if (!background) {
        this.background = "";
    } else {
        this.background = background;
    }
    this.doesCollide = false;
    if (doesCollide) {
        this.doesCollide = doesCollide;
    }
    this.doesBlockLight = false;
    if (doesBlockLight) {
        this.doesBlockLight = doesBlockLight;
    }
    this.actionable = false;
    if (actionable) {
        this.actionable = actionable;
    }

    this.draw = function(ctx, x, y) {
        this.drawBackground(ctx, x, y);
        ctx.fillStyle = this.color;
        ctx.fillText(this.char, x * fontsize + fontoffsetx, y * fontsize + fontsize + fontoffsety);
    }

    this.drawBackground = function(ctx, x, y) {
        if (this.background.length > 0) {
            ctx.fillStyle = this.background;
            ctx.fillRect(fontsize * x + fontoffsetx + backoffsetx, fontsize * y + fontoffsety + backoffsety, fontsize, fontsize);
        }
    }
}

// a map
function Map(w, h) {
    var arrlen = w * h;

    this.id = serializer++;
    this.width = w;
    this.height = h;
    this.tileset = new Array(arrlen);
    this.lightmap = new Array(arrlen);
    this.viewmap = new Array(arrlen);
    this.lights = [];
    this.coloroverlay = new Array(arrlen);
    this.shadowmap = new Array(arrlen);
    this.seenmap = new Array(arrlen);

    for (var i = 0; i < w * h; i++) {
        this.tileset[i] = emptTile;
        this.lightmap[i] = false;
        this.viewmap[i] = false;
        this.coloroverlay[i] = {r: 0, g: 0, b: 0, n: 0};
        this.shadowmap[i] = 0;
        this.seenmap[i] = false;
    }

    this.creatureset = [];
    this.itemset = [];

    this.getTile = function(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.tileset[x + y * this.width];
    };

    this.setTile = function(x, y, t) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        this.tileset[x + y * this.width] = t;
    }

    this.getCreatureAt = function(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        for (var i = 0; i < this.creatureset.length; i++) {
            if (x === this.creatureset[i].x && y === this.creatureset[i].y) {
                return this.creatureset[i];
            }
        }
        return null;
    };

    this.getItemsAt = function(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        var s = [];
        for (var i = 0; i < this.itemset.length; i++) {
            if (x === this.itemset[i].x && y === this.itemset[i].y) {
                s.push(this.itemset[i]);
            }
        }
        return s;
    }

    this.drawAt = function(ctx, x, y, tx, ty) {
        var t = this.getTile(x, y);

        if (t === null) {
            return null;
        }

        // find out how many icons we can draw, then pick one based on the time
        var tnum = 1;

        var c = this.getCreatureAt(x, y);
        if (c) {
            tnum++;
        }

        var iset = this.getItemsAt(x, y);
        if (iset) {
            tnum += iset.length;
        }

        // shortcut for most cases
        if (tnum == 1) {
            t.draw(ctx, tx, ty);
        } else

        // if the player is here, don't draw anything else
        if (c === player) {
            t.drawBackground(ctx, tx, ty);
            c.draw(ctx, tx, ty);
        } else {

            // get the time
            var militime = getMiliTime();

            // get the proper one to draw, then cycle every "cycletime" ms
            var cyclenum = Math.floor(militime / cycletime) % tnum;

            if (cyclenum == 0) {
                t.draw(ctx, tx, ty);
            } else {
                t.drawBackground(ctx, tx, ty);
                if (cyclenum == 1) {
                    c.draw(ctx, tx, ty);
                } else {
                    iset[cyclenum - 2].draw(ctx);
                }
            }
        }
    }

    this.drawOverlayAt = function(ctx, x, y, tx, ty) {
        // draw the color overlay
        var cl = this.coloroverlay[x + y * this.width];
        //console.log(cl);
        ctx.fillStyle = "rgb(" + cl.r + ", " + cl.g + ", " + cl.b + ", " + 0.5 + ")";
        ctx.fillRect(fontsize * tx + fontoffsetx + backoffsetx, fontsize * ty + fontoffsety + backoffsety, fontsize, fontsize);
    }

    this.doesRectCollide = function(x, y, w, h) {
        // take a rectangle as an argument, see if it collides with any tile that's not the empty tile

        for (var i = x; i < x + w; i++) {
            for (var j = y; j < y + h; j++) {
                var t = this.getTile(i, j);
                if (t == null || t !== emptTile) {
                    return true;
                }
            }
        }
        return false;
    }

    this.doesRectCover = function(x, y, w, h) {
        // take a rectangle as an argument, see if it only covers non-empty tiles

        for (var i = x; i < x + w; i++) {
            for (var j = y; j < y + h; j++) {
                var t = getTile(i, j);
                if (t == null || t === emptTile) {
                    return false;
                }
            }
        }
        return true;
    }

    this.addColor = function(x, y, c, i) {
        if (c.r == 0 && c.g == 0 && c.b == 0) {
            //console.log("color err");
            return;
        }
        var cc = {r: c.r, g: c.g, b: c.b};
        if (i) {
            cc.r = Math.floor(c.r * i);
            cc.g = Math.floor(c.g * i);
            cc.b = Math.floor(c.b * i);
        }
        var cl = this.coloroverlay[x + y * this.width];
        cl.r = Math.floor(cl.r * cl.n / (cl.n + 1) + cc.r / (cl.n + 1));
        cl.g = Math.floor(cl.g * cl.n / (cl.n + 1) + cc.g / (cl.n + 1));
        cl.b = Math.floor(cl.b * cl.n / (cl.n + 1) + cc.b / (cl.n + 1));
        cl.n++;
        //console.log(cl);
        this.coloroverlay[x + y * this.width] = cl;
    }

    this.getColorString = function(x, y) {
        var cl = this.coloroverlay[x + y * this.width];
        var ret = cl.r * 256 * 256 + cl.g * 256 + cl.b;
        var rtrn = ret.toString(16);
        if (rtrn.length % 2) {
            return "#0" + rtrn;
        }
        return "#" + rtrn;
    }
}

// A light source, containing info on position, brightness, color, blink timing, and arc
function LightSource(x, y, intensity, color, timing, startrad, radlen) {
    this.x = x;
    this.y = y;
    this.intensity = intensity;
    this.timing = 0;
    if (timing) {
        this.timing = timing;
    }
    this.color = {r: 255, g: 255, b: 255};
    if (color)
    {
        this.color = color;
    }
    this.startrad = 0;
    this.radlen = 2 * Math.PI;
    if (startrad && radlen) {
        this.startrad = startrad;
        this.radlen = radlen;
    }
}

// a basic creature. creatures shouldn't overlap on tiles
function Creature(name, x, y, char, color, size) {
    this.id = serializer++;
    this.name = name;
    this.x = x;
    this.y = y;
    this.char = char;
    this.color = color;
    this.size = 0;
    if (size) {
        this.size = size;
    }

    this.draw = function(ctx, tx, ty) {
        ctx.fillStyle = this.color;
        ctx.fillText(this.char, tx * fontsize + fontoffsetx, ty * fontsize + fontsize + fontoffsety);
    }
}

//initializing code goes here

// a player
var player = new Creature("p", 5, 5, "@", "#0000FF", 3);

// Commonly-used tiles
var emptTile = new Tile("empty space", ' ', "#000000");
var floorTile = new Tile("floor", '.', "#888888");
var wallTile = new Tile("wall", '=', "#000000", "#888888", true, true);
var doorTileClosed = new Tile("closed door", 'X', "#000000", "#888888", true, true, true);
var doorTileOpen = new Tile("open doorway", '.', "#888888", "", false, false, true);

// tile actions
// for more information, see SEC_TILE_ACTS in the detailed docs
var tileActions = {};
tileActions[doorTileClosed.id] = function(map, x, y) {
    map.setTile(x, y, doorTileOpen);
    // TODO: Post Message
    textlog.log("You open the door");
};
tileActions[doorTileOpen.id] = function(map, x, y) {
    map.setTile(x, y, doorTileClosed);
    // TODO: Post Message
    textlog.log("You close the door");
}

// camera
var camX = 3;
var camY = 3;

// mouse pos
var lastMouseX = -1;
var lastMouseY = -1;

var keydowntrigger = false;
var keystates = {};
var keyIntervals = {};
var hardIgnoreKeys = ["Alt", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"];

var touchIntervals = {};


// canvas context setup
function getCtx(canv) {
    var ctx = canv.getContext("2d");
    canv.width = canv.offsetWidth;
    canv.height = canv.offsetHeight;
    return ctx;
}

var mapcanvas = document.getElementById("rl-map");
var mapcanvasctx = getCtx(mapcanvas);
mapcanvasctx.font = font;

var menucanvas = document.getElementById("rl-menu");
var menucanvasctx = getCtx(menucanvas);
menucanvasctx.font = font;

var logcanvas = document.getElementById("rl-text-log");
var logcanvasctx = getCtx(logcanvas);
logcanvasctx.font = font;

// The text log
var textlog = {
    logs: [], // array of log strings- see SEC_LOG_FORM for the scripting
    maxLogNum: 10, // max number of logs
    draw: function() {
        logcanvasctx.clearRect(0, 0, logcanvas.width, logcanvas.height);

        for (var i = this.logs.length - 1; i >= 0; i--) {
            this.drawlog(i, Math.floor(logcanvas.height / fontsize) + i - this.logs.length);
        }
    },
    drawlog: function(n, y) {
        var color = "#FFFFFF";
        var tlog = this.logs[n];
        var offset = 0;
        for (var i = 0; i < tlog.length; i++) {
            // look for a color code
            if (tlog[i] === '#') {
                color = tlog.substring(i, i + 7);
                i += 7;
                offset += 7;
            }
            logcanvasctx.fillStyle = color;
            logcanvasctx.fillText(tlog[i], (i - offset) * fontsize + fontoffsetx, y * fontsize + fontsize + fontoffsety - 5);
        }
    },
    log: function(str) {
        if (this.logs.length < this.maxLogNum) {
            this.logs.push(str);
        } else {
            // cycle logs
            for (var i = 0; i < this.maxLogNum - 1; i++) {
                this.logs[i] = this.logs[i + 1];
            }
            this.logs[this.maxLogNum - 1] = str;
        }
        this.draw();
    }
}

// initial map
var mapset = [];
mapset.push(getDormMap());
var currentmap = mapset[0];

// kick off the update draw
window.setInterval(draw, framedelay);


// input functions go here
// these are separated into two levels- functions that react to specific input (i.e. clicks or taps or keypresses) 
//    and functions that correspond to specific user actions

// specific input event bindings
function onKeyDown(e) {

    // escape on problem keys
    for (var i = 0; i < hardIgnoreKeys.length; i++) {
        if (e.key === hardIgnoreKeys[i]) {
            return;
        }
    }

    console.log(e.key);
    if (!keyIntervals[e.key]) {
        keyIntervals[e.key] = window.setInterval(function() {whenKeyDown(e.key)}, keydowntime);
        // might need this line to handle immediate key down->up
        whenKeyDown(e.key);
    }
}

function onKeyUp(e) {

    // escape on problem keys
    for (var i = 0; i < hardIgnoreKeys.length; i++) {
        if (e.key === hardIgnoreKeys[i]) {
            return;
        }
    }

    if (keyIntervals[e.key]) {
        clearInterval(keyIntervals[e.key]);
        keyIntervals[e.key] = null;
    } else {
        console.warn("keyup event decected on key " + e.key + " with no previous keydown");
    }
}

function onMouseClick(e) {

}

function onMapMouseMove(e) {
    // update last mouse position
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
}

function onMouseDown(e) {

}

function onTouch(e) {
    console.log(e);
}


/*
    So here's sort of a hack
    on any element using these event handlers, holding them down on a touch screen engages their own click event
        similar to holding the corresponding button
*/
function onControlTouchStart(e) {
    e.preventDefault();
    if (!touchIntervals[e.srcElement]) {
        e.srcElement.onclick.apply(e.srcElement);
        touchIntervals[e.srcElement] = window.setInterval(function() {e.srcElement.onclick.apply(e.srcElement)}, keydowntime);
    }
}

function onControlTouchEnd(e) {
    if (touchIntervals[e.srcElement]) {
        clearInterval(touchIntervals[e.srcElement]);
        touchIntervals[e.srcElement] = null;
    }
}

// interval function for when a key is down. handles specific key code. many times, clears its own interval.
function whenKeyDown(k) {
    switch (k) {
        case "2":
        case "x": 
        case "s":
        case "Down":
        case "ArrowDown":
            moveDown();
        break;
        case "8":
        case "w": 
        case "Up":
        case "ArrowUp":
            moveUp();
        break;
        case "4":
        case "a": 
        case "Left":
        case "ArrowLeft":
            moveLeft();
        break;
        case "6":
        case "d": 
        case "Right":
        case "ArrowRight":
            moveRight();
        break;
        case "7":
        case "q":
            moveUpLeft();
        break; 
        case "9":
        case "e":
            moveUpRight();
        break; 
        case "1":
        case "z":
            moveDownLeft();
        break; 
        case "3":
        case "c":
            moveDownRight();
        break; 
        case " ":
        // pickup
        break;
    }
}

// user actions


// move functions
function moveLeft() {
    moveTo(player.x - 1, player.y);
}

function moveRight() {
    moveTo(player.x + 1, player.y);
}

function moveUp() {
    moveTo(player.x, player.y - 1);
}

function moveDown() {
    moveTo(player.x, player.y + 1);
}

function moveUpLeft() {
    moveTo(player.x - 1, player.y - 1);
}

function moveUpRight() {
    moveTo(player.x + 1, player.y - 1);
}

function moveDownLeft() {
    moveTo(player.x - 1, player.y + 1);
}

function moveDownRight() {
    moveTo(player.x + 1, player.y + 1);
}

// be careful with this function, it doesn't check range
function moveTo(x, y) {
    var t = currentmap.getTile(x, y);
    if (t) {
        if (!t.doesCollide) {
            player.x = x;
            player.y = y;
            lastMouseX = -1;
            lastMouseY = -1;
        } else if (t.actionable) {
            tileActions[t.id](currentmap, x, y);
        }
    }
}

// update functions go here

// the main drawing thread, called by timer
function draw() {
    // stick the camera to the player
    camX = player.x;
    camY = player.y;
    // clear the screen
    mapcanvasctx.clearRect(0, 0, mapcanvas.width, mapcanvas.height);

    drawMapView(currentmap, camX, camY);
}

/*
    This function resets the panel sizes if the screen changes
*/
function onResize() {
    mapcanvas.width  = mapcanvas.offsetWidth;
    mapcanvas.height = mapcanvas.offsetHeight;
    menucanvas.width  = menucanvas.offsetWidth;
    menucanvas.height = menucanvas.offsetHeight;
    logcanvas.width  = logcanvas.offsetWidth;
    logcanvas.height = logcanvas.offsetHeight;
    
    mapcanvasctx.font = font;
    menucanvasctx.font = font;
    logcanvasctx.font = font;
    
    textlog.draw();
}

/*
    This function updates a lightmap according to various light sources in a map
    This has the potential to be very expensive cpu-wise, variables to swap performance/detail are listed as such
    Since this function is lengthy, it's kept as a function instead of a method inside the map object
*/
function updateLightMap(map) {
    var raylength = 0.3; // must be positive; keep 1 or below; detail increases at this decreases
    var raydensity = 200; // density of rays, as #/per full circle. detail increases as this increases

    var rayangle = 2 * Math.PI / raydensity;

    // clear lightmap
    for (var i = 0; i < map.lightmap.length; i++) {
        map.lightmap[i] = false;
        map.coloroverlay[i] = {r: 0, g: 0, b: 0, n: 0};
        map.shadowmap[i] = 0;
    }

    // fill the shadowmap
    for (var i = 0; i < map.creatureset.length; i++) {
        map.shadowmap[map.creatureset[i].x + map.creatureset[i].y * map.width] = map.creatureset[i].size;
    }

    // go through each light source, draw rays from each, light up tiles light reaches
    for (var l = 0; l < map.lights.length; l++) {
        var thislight = map.lights[l];
        if (thislight.timing === 0 || getMiliTime() % (thislight.timing * 2) < thislight.timing) {
            for (var r = thislight.startrad; r < thislight.startrad + thislight.radlen; r += rayangle) {
                // draw rays in segments, adding up to the intensity. light up solid objects, but stop there.
                var dx = Math.cos(r) * raylength;
                var dy = Math.sin(r) * raylength;
                var sx = thislight.x + 0.5;
                var sy = thislight.y + 0.5;
                
                var len = 0;

                // using arctan * 2 / pi gives a decent -1->1 range conversion for distance->intensity values
                // we'll never get a negative length, so just do 1 - arctan * 2 / pi for a 0->1 value

                map.lightmap[Math.floor(sx) + map.width * Math.floor(sy)] = true; // always light this tile
                map.addColor(Math.floor(sx), Math.floor(sy), thislight.color);
                while (len < thislight.intensity 
                    && map.getTile(Math.floor(sx), Math.floor(sy)) 
                    && !map.getTile(Math.floor(sx), Math.floor(sy)).doesBlockLight) {
                    len += raylength;
                    sx += dx;
                    sy += dy;
                    map.lightmap[Math.floor(sx) + map.width * Math.floor(sy)] = true;

                    // if there's a light blocker here, skip some length
                    len += map.shadowmap[Math.floor(sx) + map.width * Math.floor(sy)];

                    map.addColor(Math.floor(sx), Math.floor(sy), thislight.color, (1 - Math.atan(len) / Math.PI * 2));
                }
            }
        }
    }
}

/*
    This function determines the player's sight range
    It's very similar to the lightsource function
*/
function updateViewMap(map) {
    var raylength = 0.5; // must be positive; keep 1 or below; detail increases at this decreases
    var raydensity = 200; // density of rays, as #/per full circle. detail increases as this increases

    var rayangle = 2 * Math.PI / raydensity;

    // clear viewmap
    for (var i = 0; i < map.viewmap.length; i++) {
        map.viewmap[i] = false;
    }

    for (var r = 0; r < 2 * Math.PI; r += rayangle) {
        // draw rays in segments, adding up to the intensity. light up solid objects, but stop there.
        var dx = Math.cos(r) * raylength;
        var dy = Math.sin(r) * raylength;
        var sx = player.x + 0.5;
        var sy = player.y + 0.5;
        
        var len = 0;
        map.viewmap[Math.floor(sx) + map.width * Math.floor(sy)] = true; // always light this tile

        while (len < 20 // player's sight range should be huge
            && map.getTile(Math.floor(sx), Math.floor(sy)) 
            && !map.getTile(Math.floor(sx), Math.floor(sy)).doesBlockLight) {
            len += raylength;
            sx += dx;
            sy += dy;
            map.viewmap[Math.floor(sx) + map.width * Math.floor(sy)] = true;
        }
    }
}

/* 
    This function takes a map and a camera and draws the resulting text to the map canvas
    The camera should be pointing at the center of the screen, unless it's too close to an edge
*/
function drawMapView(map, tcamx, tcamy) {
    updateLightMap(map);
    updateViewMap(map);

    var halfwid = Math.floor(mapcanvas.width / fontsize / 2);
    var halfhig = Math.floor(mapcanvas.height / fontsize / 2);

    if (map.width < tcamx + halfwid) {
        tcamx = map.width - halfwid;
    }
    if (map.height < tcamy + halfhig) {
        tcamy = map.height - halfhig;
    }
    if (tcamx < halfwid) {
        tcamx = halfwid;
    }
    if (tcamy < halfhig) {
        tcamy = halfhig;
    }

    // grab every tile the canvas can "see" and draw it
    for (var sx = 0; sx < mapcanvas.width / fontsize; sx++) {
        for (var sy = 0; sy < mapcanvas.height / fontsize; sy++) {
            var mx = sx + tcamx - halfwid;
            var my = sy + tcamy - halfhig;
            if ((map.lightmap[mx + my * map.width] && map.viewmap[mx + my * map.width]) || 
                (mx - 1 <= player.x && mx + 1 >= player.x &&
                 my - 1 <= player.y && my + 1 >= player.y)) {
                map.drawAt(mapcanvasctx, mx, my, sx, sy);
                map.drawOverlayAt(mapcanvasctx, mx, my, sx, sy);
                map.seenmap[mx + my * map.width] = true;
            } else if (map.seenmap[mx + my * map.width]) {
                map.drawAt(mapcanvasctx, mx, my, sx, sy);
                // draw a dark overlay
                mapcanvasctx.fillStyle = "rgb(0, 0, 0, 0.7)";
                mapcanvasctx.fillRect(fontsize * sx + fontoffsetx + backoffsetx, fontsize * sy + fontoffsety + backoffsety, fontsize, fontsize)
            }
        }
    }

    // grab what the mouse is pointing to; list it
    if (lastMouseX >= 0 && lastMouseY >= 0) {
        var msx = Math.floor((lastMouseX - fontoffsetx - backoffsetx) / fontsize) + tcamx - halfwid;
        var msy = Math.floor((lastMouseY - fontoffsety - backoffsety) / fontsize) + tcamy - halfhig;
        if ((map.lightmap[msx + msy * map.width] && map.viewmap[msx + msy * map.width]) ||
            map.seenmap[msx + msy * map.width] || 
            (msx - 1 <= player.x && msx + 1 >= player.x &&
            msy - 1 <= player.y && msy + 1 >= player.y)) {
            var tname = map.getTile(msx, msy).name;
            var color = "#FFFFFF";
            for (var i = 0; i < tname.length; i++) {
                mapcanvasctx.fillStyle = "#000000";
                mapcanvasctx.fillRect(fontsize * i + fontoffsetx + backoffsetx, fontoffsety + backoffsety, fontsize, fontsize);
                mapcanvasctx.fillStyle = color;
                mapcanvasctx.fillText(tname[i], i * fontsize + fontoffsetx, fontsize + fontoffsety);
            }
        }
    }
}

// map creator functions go here

/*
    Create a map for the "dormitories"
    see "SEC_GEN_DORM" in the detailed docs for algorithm info
*/
function getDormMap() {

    // create a map of 8 small halls by 4 large halls
    var smHlNm = 6;
    var lgHlNm = 3;
    var mapWd = 12 * smHlNm + 1;
    var mapHt = 6 + (26 * (lgHlNm - 1));
    var buffer = 2;

    var dormmap = new Map(mapWd + 2 * buffer, mapHt + 2 * buffer);

    // Add the large halls
    for (var i = 0; i < lgHlNm; i++) {
        for (var x = 0; x < mapWd; x++) {
            dormmap.setTile(x + buffer, i * 26 + buffer, wallTile);
            dormmap.setTile(x + buffer, i * 26 + 6 + buffer, wallTile);
            for (var y = 1; y < 6; y++) {
                if (x > 0 && x < mapWd - 1) {
                    dormmap.setTile(x + buffer, i * 26 + y + buffer, floorTile);
                } else {
                    dormmap.setTile(x + buffer, i * 26 + y + buffer, wallTile);
                }
            }
        }

        // add some lights near where small halls will be
        for (var j = 0; j < smHlNm; j++) {
            dormmap.lights.push(new LightSource(j * 12 + 6 + buffer, i * 26 + 3 + buffer, 7, {r: 255, g: 255, b:0}));
        }
    }

    // Add the aux rooms
    // for each room, pick a large hall to set it under, give it a random width & height & position
    var lgh, rmx, rmy, rmw, rmh; // these positions are INTERNAL, they don't count walls

    // add the "kitchen" room; this is a wide room with four connecting halls
    lgh = getRandomInt(lgHlNm - 1);
    console.log(lgh);
    // it's 6-9 tiles tall by 9-15 panels wide
    rmw = getRandomInt(5) + 9;
    rmh = getRandomInt(4) + 6;
    rmx = getRandomInt(mapWd - rmw - 2 - buffer - buffer) + buffer + 1;
    rmy = getRandomInt(19 - rmh) + buffer + lgh * 26 + 7;

    for (var rmi = rmx - 1; rmi < rmx + rmw + 1; rmi++) {
        for (var rmj = rmy - 1; rmj < rmy + rmh + 1; rmj++) {
            if (rmi >= rmx && rmi < rmx + rmw && rmj >= rmy && rmj < rmy + rmh) {
                dormmap.setTile(rmi, rmj, floorTile);
            } else {
                dormmap.setTile(rmi, rmj, wallTile);
            }
        }
    }

    // add the halls; these are just at the four corners of the room
    var hlx = rmx;
    var hly = rmy - 1;
    do {
        dormmap.setTile(hlx, hly, floorTile);
        dormmap.setTile(hlx - 1, hly, wallTile);
        dormmap.setTile(hlx + 1, hly, wallTile);
        hly--;
    } while (dormmap.getTile(hlx, hly) !== floorTile);
    hlx = rmx + rmw - 1;
    hly = rmy - 1;
    do {
        dormmap.setTile(hlx, hly, floorTile);
        dormmap.setTile(hlx - 1, hly, wallTile);
        dormmap.setTile(hlx + 1, hly, wallTile);
        hly--;
    } while (dormmap.getTile(hlx, hly) !== floorTile);
    hlx = rmx;
    hly = rmy + rmh;
    do {
        dormmap.setTile(hlx, hly, floorTile);
        dormmap.setTile(hlx - 1, hly, wallTile);
        dormmap.setTile(hlx + 1, hly, wallTile);
        hly++;
    } while (dormmap.getTile(hlx, hly) !== floorTile);
    hlx = rmx + rmw - 1;
    hly = rmy + rmh;
    do {
        dormmap.setTile(hlx, hly, floorTile);
        dormmap.setTile(hlx - 1, hly, wallTile);
        dormmap.setTile(hlx + 1, hly, wallTile);
        hly++;
    } while (dormmap.getTile(hlx, hly) !== floorTile);

    // add the "utility room", this is a 3 x 5-7 room with no hall, a blinking red light, and a flashlight

    do {
        lgh = getRandomInt(lgHlNm - 1);
        rmw = 3;
        rmh = getRandomInt(3) + 5;
        rmx = getRandomInt(mapWd - rmw - 2 - buffer - buffer) + buffer + 1;
    } while (dormmap.doesRectCollide(rmx, buffer + 7 + lgh * 26, rmw, 19));
    console.log(lgh);
    if (getRandomInt(2)) { // choose if it's up or down
        rmy = 9 + lgh * 26;
        for (var rmi = rmx - 1; rmi < rmx + rmw + 1; rmi++) {
            for (var rmj = rmy; rmj < rmy + rmh + 1; rmj++) {
                if (rmi == rmx - 1 || rmi == rmx + rmw || rmj == rmy + rmh) {
                    dormmap.setTile(rmi, rmj, wallTile);
                } else {
                    dormmap.setTile(rmi, rmj, floorTile);
                }
            }
        }
        dormmap.setTile(rmx + 1, rmy - 1, doorTileClosed);
        dormmap.lights.push(new LightSource(rmx + 1, rmy - 2, 5, {r: 255, g: 0, b: 0}, 1000));
    } else {
        rmy = 28 + lgh * 26 - rmh;
        for (var rmi = rmx - 1; rmi < rmx + rmw + 1; rmi++) {
            for (var rmj = rmy - 1; rmj < rmy + rmh; rmj++) {
                if (rmi == rmx - 1 || rmi == rmx + rmw || rmj == rmy - 1) {
                    dormmap.setTile(rmi, rmj, wallTile);
                } else {
                    dormmap.setTile(rmi, rmj, floorTile);
                }
            }
        }
        dormmap.setTile(rmx + 1, rmy + rmh, doorTileClosed);
        dormmap.lights.push(new LightSource(rmx + 1, rmy + rmh + 1, 5, {r: 255, g: 0, b: 0}, 1000));
    }
    // Add the small halls
    
                
    // take note of small rooms as potential starting positions
    var roomcenters = [];

    for (var i = 0; i < smHlNm; i++) {
        for (var j = 0; j < lgHlNm - 1; j++) {
            if (!dormmap.doesRectCollide(i * 12 + 5 + buffer, j * 26 + 7 + buffer, 3, 19)) {
                // create the hallway; put walls on sides; put floors on ends
                // extend into the wall of the big halls
                var si = i * 12 + 4 + buffer;
                var sj = j * 26 + 6 + buffer; // top left wall tile
                for (var jh = sj; jh < sj + 21; jh++) {
                    dormmap.setTile(si, jh, wallTile);
                    dormmap.setTile(si + 1, jh, floorTile);
                    dormmap.setTile(si + 2, jh, floorTile);
                    dormmap.setTile(si + 3, jh, floorTile);
                    dormmap.setTile(si + 4, jh, wallTile);
                }

                // there's enough room along the small halls to put five rooms along each side
                for (var rm = 0; rm < 5; rm++) {
                    // left room
                    var rmi = si - 4;
                    var rmj = sj + rm * 4; // top left wall tile of room
                    if (!dormmap.doesRectCollide(rmi + 1, rmj + 1, 3, 3)) {
                        for (var wi = 0; wi < 5; wi++) {
                            for (var wj = 0; wj < 5; wj++) {
                                if (wi > 0 && wi < 4 && wj > 0 && wj < 4) {
                                    dormmap.setTile(rmi + wi, rmj + wj, floorTile);
                                } else {
                                    dormmap.setTile(rmi + wi, rmj + wj, wallTile);
                                }
                                dormmap.setTile(rmi + 4, rmj + 2, doorTileClosed);
                            }
                        }
                        roomcenters.push({x: rmi + 2, y: rmj + 2});
                    }
                    // right room
                    rmi = si + 4;
                    if (!dormmap.doesRectCollide(rmi + 1, rmj + 1, 3, 3)) {
                        for (var wi = 0; wi < 5; wi++) {
                            for (var wj = 0; wj < 5; wj++) {
                                if (wi > 0 && wi < 4 && wj > 0 && wj < 4) {
                                    dormmap.setTile(rmi + wi, rmj + wj, floorTile);
                                } else {
                                    dormmap.setTile(rmi + wi, rmj + wj, wallTile);
                                }
                                dormmap.setTile(rmi, rmj + 2, doorTileClosed);
                            }
                        }
                        roomcenters.push({x: rmi + 2, y: rmj + 2});
                    }
                }
            }
        }
    }

    var selectedroom =getRandomInt(roomcenters.length);
    player.x = roomcenters[selectedroom].x;
    player.y = roomcenters[selectedroom].y;

    dormmap.lights.push(new LightSource(player.x, player.y, 5));

    // always add the player to creaturelist
    dormmap.creatureset.push(player);
    return dormmap;
}
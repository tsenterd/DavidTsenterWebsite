(function(){
    'use strict';
    
    /** a Rubik's cube made with WebGL
     *
     * @link https://github.com/blonkm/rubiks-cube
     * @authors 
     *      Tiffany Wang - https://github.com/tinnywang
     *      Michiel van der Blonk - blonkm@gmail.com
     * @license LGPL
     */
    var GLube = function() { 
    var canvas;
    var gl;
    var rubiksCube;
    var shaderProgram;

    var rightMouseDown = false;
    var x_init_right;
    var y_init_right;
    var x_new_right;
    var y_new_right;
    var leftMouseDown = false;
    var init_coordinates;
    var new_coordinates;
    var isRotating = false;
    var isAnimating = false;
    var isInitializing = true;
    var eye = [0, 0, -17];
    var center = [0, 0, 0];
    var up = [0, 1, 0];
    var fov = -19.5;

    var modelViewMatrix = mat4.create();
    var projectionMatrix = mat4.create();
    var rotationMatrix = mat4.create();

    var DEGREES = 6;
    var MARGIN_OF_ERROR = 1e-3;
    var X_AXIS = 0;
    var Y_AXIS = 1;
    var Z_AXIS = 2;
    var LEFT_MOUSE = 0;
    var RIGHT_MOUSE = 2;
    var CANVAS_X_OFFSET = 0;
    var CANVAS_Y_OFFSET = 0;

    function RubiksCube() {
        this.selectedCubes = [];// an instance of Cube
        this.rotatedCubes = null; // an array of Cubes
        this.rotationAxis = null; // a vec3
        this.axisConstant = null; // X_AXIS, Y_AXIS, or Z_AXIS
        this.rotationAngle = 0;
        this.degrees = DEGREES;
        this.cubeVerticesBuffer = null;
        this.cubeNormalsBuffer = null;
        this.cubeFacesBuffer = null;
        this.stickerVerticesBuffer = null;
        this.stickerNormalsBuffer = null;
        this.stickerFacesBuffer = null;
        this.pickingFramebuffer = null;
        this.pickingTexture = null;
        this.pickingRenderBuffer = null;
        this.normalsCube = new NormalsCube();
        this.cubes = new Array(3);
        this.noMove = {face:'', count:0, inverse:false};
        this.currentMove = {face:'', count:0, inverse:false};

        this.init = function() {
            this.initTextureFramebuffer();
            this.initCubeBuffers();
            this.initStickerBuffers();
            for (var r = 0; r < 3; r++) {
                this.cubes[r] = new Array(3);
                for (var g = 0; g < 3; g++) {
                    this.cubes[r][g] = new Array(3);
                    for (var b = 0; b < 3; b++) {
                        var coordinates = [r - 1, g - 1, b - 1];
                        var color = [r / 3, g / 3, b / 3, 1.0];
                        this.cubes[r][g][b] = new Cube(this, coordinates, color);
                    }
                }
            }
            this.initCenters();
        }

        this.initTextureFramebuffer = function() {
            this.pickingFramebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);

            this.pickingTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.pickingTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            this.pickingRenderBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickingRenderBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickingTexture, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickingRenderBuffer);
        }

        this.initCubeBuffers = function() {
            // vertices
            this.cubeVerticesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVerticesBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeModel.vertices), gl.STATIC_DRAW);
            // normals
            this.cubeNormalsBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeNormalsBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeModel.normals), gl.STATIC_DRAW);
            // faces
            this.cubeFacesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeFacesBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeModel.faces), gl.STATIC_DRAW);
        }

        this.initStickerBuffers = function() {
            // vertices
            this.stickerVerticesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.stickerVerticesBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stickerModel.vertices), gl.STATIC_DRAW);
            // normals
            this.stickerNormalsBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.stickerNormalsBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stickerModel.normals), gl.STATIC_DRAW);
            // faces
            this.stickerFacesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.stickerFacesBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(stickerModel.faces), gl.STATIC_DRAW);
        }


        this.initCenters = function() {
            this.centerCubes = {
                left:   this.cubes[1][1][2],
                right:  this.cubes[1][1][0],
                up:     this.cubes[1][0][1],
                down:   this.cubes[1][2][1],
                front:  this.cubes[0][1][1],
                back:   this.cubes[2][1][1],
                core:   this.cubes[1][1][1]
            }
        }

        this.init();

        this.draw = function() {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            mat4.perspective(projectionMatrix, fov, canvas.width / canvas.height, 0.1, 100.0);
            mat4.identity(modelViewMatrix);
            mat4.lookAt(modelViewMatrix, eye, center, up);
            mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
            var mvMatrix = mat4.create();
            for (var r = 0; r < 3; r++) {
                for (var g = 0; g < 3; g++) {
                    for (var b = 0; b < 3; b++) {
                        var cube = this.cubes[r][g][b];
                        cube.draw(cubeModel.ambient);
                        for (var s in cube.stickers) {
                            cube.stickers[s].draw();
                        }
                    }
                }
            }
        }

        this.drawToPickingFramebuffer = function() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, rubiksCube.pickingFramebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.uniform1i(shaderProgram.lighting, 0);

            mat4.perspective(projectionMatrix, fov, canvas.width / canvas.height, 0.1, 100.0);
            mat4.identity(modelViewMatrix);
            mat4.lookAt(modelViewMatrix, eye, center, up);
            mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
            var mvMatrix = mat4.create();
            for (var r = 0; r < 3; r++) {
                for (var g = 0; g < 3; g++) {
                    for (var b = 0; b < 3; b++) {
                        var cube = this.cubes[r][g][b];
                        cube.draw(cube.color);
                    }
                }
            }

            gl.uniform1i(shaderProgram.lighting, 1);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        this.drawToNormalsFramebuffer = function() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, rubiksCube.normalsCube.normalsFramebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            mat4.perspective(projectionMatrix, fov, canvas.width / canvas.height, 0.1, 100.0);
            mat4.identity(modelViewMatrix);
            mat4.lookAt(modelViewMatrix, eye, center, up);
            mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
            var mvMatrix = mat4.create();
            mat4.copy(mvMatrix, modelViewMatrix);
            this.normalsCube.draw();

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        /*
         * Sets this.rotatedCubes to an array of cubes that share the same AXIS coordinate as this.selectedCubes.
         * AXIS is 0, 1, or 2 for the x-, y-, or z-coordinate.
         */
        this.setRotatedCubes = function(move) {
            if (!this.rotationAxis) {
                return;
            }
            var cubes = [];
            this.selectedCubes.forEach(function(el) {
                var value = el.coordinates[this.axisConstant];
            for (var r = 0; r < 3; r++) {
                for (var g = 0; g < 3; g++) {
                    for (var b = 0; b < 3; b++) {
                        var cube = this.cubes[r][g][b];
                        if (Math.abs(cube.coordinates[this.axisConstant] - value) < MARGIN_OF_ERROR) {
                            cubes.push(cube);
                        }
                    }
                }
            }
            }, this);
            if (cubes.length >= 9) {
                this.rotatedCubes = cubes;
                // is this a slice layer?
                var i;
                var that = this;
                cubes.forEach(function(cube, i, cubes) {
                    if (cube.stickers.length==0) {
                        var slices = ['S', 'E', 'M']; //x,y,z
                        var slice = slices[that.axisConstant];
                        var x = that.rotationAxis[X_AXIS];
                        var y = that.rotationAxis[Y_AXIS];
                        var z = that.rotationAxis[Z_AXIS];
                        var sum = x+y+z;
                        var inverse = false;
                        inverse |= slice=='M' && sum==1;
                        inverse |= slice=='E' && sum==1;
                        inverse |= slice=='S' && sum==-1; // silly cube notation
                        // update centers for slice moves
                        var m = (move===undefined) ? 1 : move.count;
                        while (m-- >0) {
                        that.updateCenters(slice, inverse);
                    }
                        
                    }
                    });
            }
        }

        /*
         * Rotates this.rotatedCubes around this.rotationAxis by this.degrees.
         */
        this.rotateLayer = function(isDouble) {
            var fullTurn = isDouble ? 180 : 90;
            if (Math.abs(this.rotationAngle) == fullTurn) {
                this.rotationAngle = 0;
                isRotating = false;
                isAnimating = false;
                this.degrees = isInitializing ? fullTurn: DEGREES;
                return;
            }

            if (!isInitializing)
                this.degrees = 3 + DEGREES * $.easing.easeOutExpo(0, this.rotationAngle, 0, 1, fullTurn);
            if (this.rotationAngle + this.degrees > fullTurn) {
                this.degrees = fullTurn - this.rotationAngle;
                this.rotationAngle = fullTurn;
            }
            else {
                this.rotationAngle += this.degrees;
            }

            var newRotationMatrix = mat4.create();
            mat4.rotate(newRotationMatrix, newRotationMatrix, degreesToRadians(this.degrees), this.rotationAxis);

            for (var c in this.rotatedCubes) {
                var cube = this.rotatedCubes[c];
                vec3.transformMat4(cube.coordinates, cube.coordinates, newRotationMatrix);
                mat4.multiply(cube.rotationMatrix, newRotationMatrix, cube.rotationMatrix);
            }
        }

        this.colorToCube = function(rgba) {
            var r = rgba[0];
            var g = rgba[1];
            var b = rgba[2];
            if (r == 255 && g == 255 && b == 255) { // clicked outside the cube
                return null;
            } else {
                return this.cubes[r % 3][g % 3][b % 3];
            }
        }

        this.selectCube = function(x, y) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);
            var pixelValues = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            this.selectedCubes.push(this.colorToCube(pixelValues));
        }

        this.setRotationAxis = function(x, y, direction) {
            var normal = this.normalsCube.getNormal(x, y);
            if (!normal) {
                return;
            }
            var axis = vec3.create();
            vec3.cross(axis, normal, direction);
            var x = Math.round(axis[0]);
            var y = Math.round(axis[1]);
            var z = Math.round(axis[2]);
            this.rotationAxis = Math.abs(x + y + z) == 1 ? [x, y, z] : null;
            if (!this.rotationAxis) {
                this.axisConstant = null;
                return;
            }
            if (x == 1 || x == -1) {
                this.axisConstant = X_AXIS;
            } else if (y == 1 || y == -1) {
                this.axisConstant = Y_AXIS;
            } else if (z == 1 || z == -1 ) {
                this.axisConstant = Z_AXIS;
            }
        }

        /*
         * For testing the rotation of a layer by matrix instead of layer.
         * Repeatedly called by doTransform to turn layer by this.degrees until 90 degrees is done
         */
        this.transform = function(r,g,b, axis, inverse) {
            var rot = [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ];
            this.selectedCubes.push(this.cubes[r][g][b]);
            this.axisConstant = axis;
            this.rotationAxis = rot[axis];
            if (inverse)
                vec3.scale(this.rotationAxis, this.rotationAxis, -1);
            this.setRotatedCubes();
            isRotating = true;
        }

        /*
         * For testing only: timed transform of the cube, rotating a layer
         */
        this.doTransform = function(params) {
            var that = this;
            var delay = 50;
            if (!isRotating) {
                var move = params.shift();
                this.transform(move.r, move.g, move.b, move.axis);
                setTimeout(function() {that.doTransform(params)}, delay);
            }
            else
                if (params.length > 0)
                    setTimeout(function() {that.doTransform(params)}, delay);
        }

        this.centerColors = {
            left:   'blue',
            right:  'green',
            up:     'yellow',
            down:   'white',
            front:  'red',
            back:   'orange',
            core:   'black'
        }

        /* rotate defined centers with a slice layer */
        this.updateCenters = function(layer, inverse) {
            var c=this.centerCubes;
            var centers = {
                'M': {
                    left:   c.left,
                    right:  c.right,
                    up:     c.back,
                    down:   c.front,
                    front:  c.up,
                    back:   c.down
                },
                'E': {
                    left:   c.back,
                    right:  c.front,
                    up:     c.up,
                    down:   c.down,
                    front:  c.left,
                    back:   c.right
                },
                'S': {
                    left:   c.down,
                    right:  c.up,
                    up:     c.left,
                    down:   c.right,
                    front:  c.front,
                    back:   c.back
                }
            };
            var centersInverse = {
                'M': {
                    left:   c.left,
                    right:  c.right,
                    up:     c.front,
                    down:   c.back,
                    front:  c.down,
                    back:   c.up
                },
                'E': {
                    left:   c.front,
                    right:  c.back,
                    up:     c.up,
                    down:   c.down,
                    front:  c.right,
                    back:   c.left
                },
                'S': {
                    left:   c.up,
                    right:  c.down,
                    up:     c.right,
                    down:   c.left,
                    front:  c.front,
                    back:   c.back
                },
            };
            if (centers[layer])
            {
                if (inverse==true)
                    this.centerCubes = centersInverse[layer];
                else
                    this.centerCubes = centers[layer];
                this.centerCubes.core = this.cubes[1][1][1];
            }
        }
        
        this.move = function(move) {
            var rot = {
                X: [1, 0, 0],
                Y: [0, 1, 0],
                Z: [0, 0, 1]
            };
            var inverse = typeof move.inverse !== 'undefined' ? move.inverse : false;
            var L = this.centerCubes.left;
            var R = this.centerCubes.right;
            var U = this.centerCubes.up;
            var D = this.centerCubes.down;
            var F = this.centerCubes.front;
            var B = this.centerCubes.back;
            var C = this.centerCubes.core;

            var layers = {
                "L": {cubies:[L], axis:Z_AXIS, rotation:rot.Z, ccw:true},
                "R": {cubies:[R], axis:Z_AXIS, rotation:rot.Z, ccw:false},

                "U": {cubies:[U], axis:Y_AXIS, rotation:rot.Y, ccw:false},
                "D": {cubies:[D], axis:Y_AXIS, rotation:rot.Y, ccw:true},

                "F": {cubies:[F], axis:X_AXIS, rotation:rot.X, ccw:false},
                "B": {cubies:[B], axis:X_AXIS, rotation:rot.X, ccw:true},

                // use center of cube for slices
                "M": {cubies:[C], axis:Z_AXIS, rotation:rot.Z, ccw:true},
                "E": {cubies:[C], axis:Y_AXIS, rotation:rot.Y, ccw:true},
                "S": {cubies:[C], axis:X_AXIS, rotation:rot.X, ccw:false},

                "l": {cubies:[L,C], axis:Z_AXIS, rotation:rot.Z, ccw:true},
                "r": {cubies:[R,C], axis:Z_AXIS, rotation:rot.Z, ccw:false},

                "u": {cubies:[U,C], axis:Y_AXIS, rotation:rot.Y, ccw:false},
                "d": {cubies:[D,C], axis:Y_AXIS, rotation:rot.Y, ccw:true},

                "f": {cubies:[F,C], axis:X_AXIS, rotation:rot.X, ccw:false},
                "b": {cubies:[B,C], axis:X_AXIS, rotation:rot.X, ccw:true},
               
                "x": {cubies:[L,C,R], axis:Z_AXIS, rotation:rot.Z, ccw:false},
                "y": {cubies:[U,C,D], axis:Y_AXIS, rotation:rot.Y, ccw:false},
                "z": {cubies:[F,C,B], axis:X_AXIS, rotation:rot.X, ccw:false}
            };

            this.selectedCubes = layers[move.face].cubies;
            this.axisConstant = layers[move.face].axis;
            this.rotationAxis = layers[move.face].rotation;
            // not a true counter clockwise
            // but instead a ccw over this axis seen from origin
            if (layers[move.face].ccw) 
                inverse = !inverse;
            if (inverse) {
                vec3.scale(this.rotationAxis, this.rotationAxis, -1);
            }
            this.setRotatedCubes(move);
            isRotating = true;
        }

        this.perform = function(alg) {
            var that = this;
            var delay = 10;
            if (!isRotating && alg.length > 0) {
                var clone = alg.slice(0);
                var move = clone.shift();
                if (!move.count)
                    move.count = 1;
                    this.move(move);                
                this.currentMove = move;
                that.setNormals = 'MESxyz'.match(move.face)!=null;
                setTimeout(function() {that.perform(clone)}, delay);
            }
            else {
                if (alg.length > 0)
                    setTimeout(function() {that.perform(alg)}, delay);        
                else
                    this.algDone();
            }
        }

        this.algDone = function() {
            if (isRotating) {
                setTimeout(rubiksCube.algDone, 100);
            }
            else {
                isInitializing = false;
                rubiksCube.currentMove = rubiksCube.noMove;
                this.degrees = DEGREES;
            }
        }

        this.moveListToString = function(moveList) {
            return moveList.map(function(move) {
              return move.face + (move.count==2?"2":"") + (move.inverse?"'":"");
            }).join(" ");
        }

        this.inverseMoveList = function(moves) {
            return moves.reverse().map(function(move) {
              return {face:move.face, count:move.count, inverse:!move.inverse};
            });
        }
        
        this.setStickers = function(stickers) {
            var positions = "FUL,FU,FUR,FL,F,FR,FDL,FD,FDR,RFU,RU,RBU,RF,R,RB,RFD,RD,RBD,DLF,DF,DRF,DL,D,DR,DLB,DB,DRB,BUR,BU,BUL,BR,B,BL,BDR,BD,BDL,LBU,LU,LFU,LB,L,LF,LBD,LD,LFD,ULB,UB,URB,UL,U,UR,ULF,UF,URF".split(',');

            var colors = {
                r:'red',
                g:'green',
                w:'white',
                o:'orange',
                b:'blue',
                y:'yellow',
                x:'gray',
                k:'black' //key (from CMYK)
            };
            var r,g,b;
            var cube;
            var x,y,z;
            var position;
            
            var arrayRotate = function(arr, reverse){
              if(reverse)
                arr.push(arr.shift());
              else
                arr.unshift(arr.pop());
              return arr;
            } 

            for (var r = 0; r < 3; r++) {
                for (var g = 0; g < 3; g++) {
                    for (var b = 0; b < 3; b++) {
                        cube = this.cubes[r][g][b];
                        x = cube.coordinates[0];
                        y = cube.coordinates[1];
                        z = cube.coordinates[2];
                        var faces=[];
                        if (x === -1) faces.push('F'); else if (x === 1) faces.push('B');
                        if (y === -1) faces.push('U'); else if (y === 1) faces.push('D');
                        if (z === -1) faces.push('R'); else if (z === 1) faces.push('L');
                        // faces.length=1 => center
                        // faces.length=2 => edge
                        // faces.length=3 => corner
                        position = faces;
                        faces.forEach(function(value, key) {                            
                            var index = positions.indexOf(position.join(''));
                            var ch;
                            if (stickers.length >= index+1) {
                                ch = stickers.slice(index, index+1);
                                if (!"rgbwoyxk".match(ch)) {
                                    ch = 'x';
                                }
                            }
                            else {
                                ch = 'x';
                            }
                                
                            var el = cube.stickers[key];
                            var cr = parseInt(el.color[0]*255.0);
                            var cg = parseInt(el.color[1]*255.0);
                            var cb = parseInt(el.color[2]*255.0);
                            cube.stickers[key].color = cube.COLORS[colors[ch]];
                            position = arrayRotate(position, true);
                        });
                         
                        }
                    }
                }
            };
        
        
        this.reset = function() {
            this.init();            
                var alg = $(canvas).data('alg');
                var algType = $(canvas).data('type');
            // default order of RubikPlayer faces is F, R, D, B, L, U
            // we start with yellow on top
            var defaultStickers = "rrrrrrrrrgggggggggwwwwwwwwwooooooooobbbbbbbbbyyyyyyyyy";
                var stickers = $(canvas).data('stickers') || defaultStickers; 
            var stickerSets = {
                CROSS:    "xxxxrxxrxxxxxgxxgxxwxwwwxwxxxxxoxxoxxxxxbxxbxxxxxyxxxx",
                FL:       "xxxxxxrrrxxxxxxgggwwwwwwwwwxxxxxxoooxxxxxxbbbxxxxxxxxx",
                F2L:      "xxxrrrrrrxxxggggggwwwwwwwwwxxxooooooxxxbbbbbbxxxxyxxxx",
                SHORTCUT: "xxxxrrxrrxxxggxggxxwwwwwxwxxxxxoxxoxxxxxbxxbxxxxxyxxxx",
                OLL:      "xxxrrrrrrxxxggggggwwwwwwwwwxxxooooooxxxbbbbbbyyyyyyyyy",
                    PLL:      "rrrxxxxxxgggxxxxxxxxxxxxxxxoooxxxxxxbbbxxxxxxyyyyyyyyy",
                    FULL:     defaultStickers
            };
            // replace stickers by full definition of set
            if (stickerSets[stickers.toUpperCase()]) {
                stickers = stickerSets[stickers.toUpperCase()];
            }
            this.setStickers(stickers);
            perspectiveView();
            if (alg) {
                this.degrees = 90;
                    $(canvas).parent().find('.algorithm').val(alg);
                var moves = parseAlgorithm(alg);
                if (algType === 'solver') {
                isInitializing = true;
                    moves = this.inverseMoveList(moves);
                    doAlgorithm(moves);
                }
                    else {
                    isInitializing = false;
            }
                }
            else
                isInitializing = false;
        };

    }

    function Cube(rubiksCube, coordinates, color) {
        this.rubiksCube = rubiksCube;
        this.coordinates = coordinates;
        this.color = color;
        this.rotationMatrix = mat4.create();
        this.translationVector = vec3.create();
        this.stickers = [];
        this.COLORS = {
            'blue': [0.1, 0.1, 1.0, 1.0],
            'green': [0.1, 0.7, 0.1, 1.0],
            'orange': [1.0, 0.5, 0.0, 1.0],
            'red': [0.8, 0.1, 0.1, 1.0],
            'white': [1.0, 1.0, 1.0, 1.0],
            'yellow': [1.0, 1.0, 0.1, 1.0],
            'gray': [0.5, 0.5, 0.5, 1.0],
            'black': [0.0, 0.0, 0.0, 1.0]
        }

        this.init = function() {
            vec3.scale(this.translationVector, this.coordinates, 2);
            this.initStickers();
        }

        this.initStickers = function() {
            var x = this.coordinates[0];
            var y = this.coordinates[1];
            var z = this.coordinates[2];
            if (x == -1) {
                this.stickers.push(new Sticker(this, this.COLORS['red'], function() {
                    this.cube.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix, [-1.001, 0, 0]);
                    mat4.rotateZ(modelViewMatrix, modelViewMatrix, degreesToRadians(90));
                }));
            } else if (x == 1) {
                this.stickers.push(new Sticker(this, this.COLORS['orange'], function() {
                    this.cube.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix, [1.001, 0, 0]);
                    mat4.rotateZ(modelViewMatrix, modelViewMatrix, degreesToRadians(-90));
                }));
            }
            if (y == -1) {
                this.stickers.push(new Sticker(this, this.COLORS['yellow'], function() {
                    this.cube.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix, [0, -1.001, 0]);
                    mat4.rotateX(modelViewMatrix, modelViewMatrix, degreesToRadians(-180));
                }));
            } else if (y == 1) {
                this.stickers.push(new Sticker(this, this.COLORS['white'], function() {
                    this.cube.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix, [0, 1.001, 0]);
                    setMatrixUniforms();
                }));
            }
            if (z == 1) {
                this.stickers.push(new Sticker(this, this.COLORS['blue'], function() {
                    this.cube.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, 1.001]);
                    mat4.rotateX(modelViewMatrix, modelViewMatrix, degreesToRadians(90));
                }));
            } else if (z == -1) {
                this.stickers.push(new Sticker(this, this.COLORS['green'], function() {
                    this.cube.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -1.001]);
                    mat4.rotateX(modelViewMatrix, modelViewMatrix, degreesToRadians(-90));
                }));
            }
        }

        this.init();

        this.transform = function() {
            mat4.multiply(modelViewMatrix, modelViewMatrix, this.rotationMatrix);
            mat4.translate(modelViewMatrix, modelViewMatrix, this.translationVector);
        }

        this.draw = function(color) {
            var mvMatrix = mat4.create();
            mat4.copy(mvMatrix, modelViewMatrix);
            this.transform();
            setMatrixUniforms();

            gl.uniform4fv(shaderProgram.ambient, color);
            gl.uniform4fv(shaderProgram.diffuse, cubeModel.diffuse);
            gl.uniform4fv(shaderProgram.specular, cubeModel.specular);
            gl.uniform1f(shaderProgram.shininess, cubeModel.shininess);
            // vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeVerticesBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            // normals
            gl.bindBuffer(gl.ARRAY_BUFFER, rubiksCube.cubeNormalsBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            // faces
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rubiksCube.cubeFacesBuffer);
            gl.drawElements(gl.TRIANGLES, cubeModel.faces.length, gl.UNSIGNED_SHORT, 0);

            mat4.copy(modelViewMatrix, mvMatrix);
        }
    }

    function Sticker(cube, color, transform) {
        this.cube = cube;
        this.color = color;
        this.transform = transform;

        this.draw = function() {
            var mvMatrix = mat4.create();
            mat4.copy(mvMatrix, modelViewMatrix)
            this.transform();
            setMatrixUniforms();

            gl.uniform4fv(shaderProgram.ambient, this.color);
            gl.uniform4fv(shaderProgram.diffuse, stickerModel.diffuse);
            gl.uniform4fv(shaderProgram.specular, stickerModel.specular);
            gl.uniform1f(shaderProgram.shininess, stickerModel.shininess);
            // vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, cube.rubiksCube.stickerVerticesBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            // normals
            gl.bindBuffer(gl.ARRAY_BUFFER, cube.rubiksCube.stickerNormalsBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            // faces
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.rubiksCube.stickerFacesBuffer);
            gl.drawElements(gl.TRIANGLES, stickerModel.faces.length, gl.UNSIGNED_SHORT, 0);

            mat4.copy(modelViewMatrix, mvMatrix);
        }
    }

    function NormalsCube() {
        this.normalsFramebuffer = null;
        this.normalsTexture = null;
        this.normalsRenderbuffer = null;
        this.verticesBuffer = null;
        this.normalsBuffer = null;
        this.facesBuffer = null;
        this.COLORS = {
            'blue': [0.0, 0.0, 1.0, 1.0],
            'green': [0.0, 1.0, 0.0, 1.0],
            'orange': [1.0, 0.5, 0.0, 1.0],
            'red': [1.0, 0.0, 0.0, 1.0],
            'black': [0.0, 0.0, 0.0, 1.0],
            'yellow': [1.0, 1.0, 0.0, 1.0]
        }
        this.NORMALS = {
            'blue': [-1, 0, 0],
            'green': [0, 0, -1],
            'orange': [1, 0, 0],
            'red': [0, 0, 1],
            'black': [0, -1, 0],
            'yellow': [0, 1, 0]
        }
        this.init = function() {
            this.initTextureFramebuffer();
            this.initBuffers();
        }

        this.initTextureFramebuffer = function() {
            this.normalsFramebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalsFramebuffer);

            this.normalsTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.normalsTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            this.normalsRenderBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.normalsRenderBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.normalsTexture, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.normalsRenderBuffer);

            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        this.initBuffers = function() {
            // vertices
            this.verticesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalsCubeModel.vertices), gl.STATIC_DRAW);
            // normals
            this.normalsBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalsCubeModel.normals), gl.STATIC_DRAW);
            // faces
            this.facesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.facesBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(normalsCubeModel.faces), gl.STATIC_DRAW);
        }

        this.init();

        this.draw = function() {
            var mvMatrix = mat4.create();
            mat4.copy(mvMatrix, modelViewMatrix);
            mat4.scale(modelViewMatrix, modelViewMatrix, [3, 3, 3]);
            setMatrixUniforms();

            gl.uniform1i(shaderProgram.lighting, 0);
            // vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            // normals
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            // faces
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.facesBuffer);
            var offset = 0;
            for (var c in this.COLORS) {
                var color = this.COLORS[c];
                gl.uniform4fv(shaderProgram.ambient, this.COLORS[c]);
                gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, offset);
                gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, offset + normalsCubeModel.faces.length)
                offset += 6;
            }

            mat4.copy(modelViewMatrix, mvMatrix);
            gl.uniform1i(shaderProgram.lighting, 1);
        }

        this.colorToNormal = function(rgba) {
            var r = (rgba[0] / 255).toFixed(1);
            var g = (rgba[1] / 255).toFixed(1);
            var b = (rgba[2] / 255).toFixed(1);
            for (var c in this.COLORS) {
                var color = this.COLORS[c];
                if (r == color[0] && g == color[1] && b == color[2]) {
                    return this.NORMALS[c];
                }
            }
            return null;
        }

        this.getNormal = function(x, y) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalsFramebuffer);
            var pixelValues = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return this.colorToNormal(pixelValues);
        }
    }

    function initWebGL(canvas) {
        if (!window.WebGLRenderingContext) {
            console.log("Your browser doesn't support WebGL.")
                return null;
        }
        gl = canvas.getContext('webgl', {preserveDrawingBuffer: true, antialias:true}) || canvas.getContext('experimental-webgl', {preserveDrawingBuffer: true, antialias:true});
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        if (!gl) {
            console.log("Your browser supports WebGL, but initialization failed.");
            return null;
        }
        return gl;
    }

    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }
        var source = '';
        var currentChild = shaderScript.firstChild;
        while (currentChild) {
            if (currentChild.nodeType == currentChild.TEXT_NODE) {
                source += currentChild.textContent;
            }
            currentChild = currentChild.nextSibling;
        }
        var shader;
        if (shaderScript.type == 'x-shader/x-fragment') {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == 'x-shader/x-vertex') {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log('An error occurred while compiling the shader: ' + gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    function initShaders() {
        var fragmentShader = getShader(gl, 'fragmentShader');
        var vertexShader = getShader(gl, 'vertexShader');
        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, fragmentShader);
        gl.attachShader(shaderProgram, vertexShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.log('Unable to initialize the shader program');
        }
        gl.useProgram(shaderProgram);
        shaderProgram.vertexPosition = gl.getAttribLocation(shaderProgram, 'vertexPosition');
        gl.enableVertexAttribArray(shaderProgram.vertexPosition);
        shaderProgram.vertexNormal = gl.getAttribLocation(shaderProgram, 'vertexNormal');
        gl.enableVertexAttribArray(shaderProgram.vertexNormal);
        shaderProgram.eyePosition = gl.getUniformLocation(shaderProgram, 'eyePosition');
        gl.uniform3fv(shaderProgram.eyePosition, eye);
        shaderProgram.lighting = gl.getUniformLocation(shaderProgram, 'lighting');
        shaderProgram.ambient = gl.getUniformLocation(shaderProgram, 'ambient');
        shaderProgram.diffuse = gl.getUniformLocation(shaderProgram, 'diffuse');
        shaderProgram.specular = gl.getUniformLocation(shaderProgram, 'specular');
        shaderProgram.shininess = gl.getUniformLocation(shaderProgram, 'shininess');
    }

    function drawScene() {
        if (isRotating) {
            rubiksCube.rotateLayer(rubiksCube.currentMove.count > 1);
        }

        rubiksCube.drawToNormalsFramebuffer();
        rubiksCube.drawToPickingFramebuffer(); 
        if (!isInitializing) {
        rubiksCube.draw();
    }
    }

    function tick() {
        requestAnimationFrame(tick);
        drawScene();
    }

        function start(el) {
            canvas = el;
            CANVAS_X_OFFSET = $(canvas).offset()['left'];
            CANVAS_Y_OFFSET = $(canvas).offset()['top'];
        gl = initWebGL(canvas);
        initShaders();
        rubiksCube = new RubiksCube();
        perspectiveView();

        if (gl) {
            gl.clearColor(1.0, 1.0, 1.0, 1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            tick();
        }
    }

    function setMatrixUniforms() {
        var projectionUniform = gl.getUniformLocation(shaderProgram, 'projectionMatrix');
        gl.uniformMatrix4fv(projectionUniform, false, projectionMatrix);
        var modelViewUniform = gl.getUniformLocation(shaderProgram, 'modelViewMatrix');
        gl.uniformMatrix4fv(modelViewUniform, false, modelViewMatrix);
        var _normalMatrix = mat4.create();
        mat4.invert(_normalMatrix, modelViewMatrix);
        mat4.transpose(_normalMatrix, _normalMatrix);
        var normalMatrix = mat3.create();
        mat3.fromMat4(normalMatrix, _normalMatrix);
        var normalMatrixUniform = gl.getUniformLocation(shaderProgram, 'normalMatrix');
        gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);
    }

    function unproject(dest, vec, view, proj, viewport) {
        var m = mat4.create();
        var v = vec4.create();

        v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
        v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
        v[2] = 2.0 * vec[2] - 1.0;
        v[3] = 1.0;

        mat4.multiply(m, proj, view);
        mat4.invert(m, m);

        vec4.transformMat4(v, v, m);
        if (v[3] == 0.0) {
            return null;
        }

        dest[0] = v[0] / v[3];
        dest[1] = v[1] / v[3];
        dest[2] = v[2] / v[3];

        return dest;
    }

    function screenToObjectCoordinates(x, y) {
        var objectCoordinates = vec3.create();
        var screenCoordinates = [x, y, 0];
        unproject(objectCoordinates, screenCoordinates, modelViewMatrix, projectionMatrix, [0, 0, canvas.width, canvas.height])
        return objectCoordinates;
    }

    function degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    function rotate(event) {
        if (rightMouseDown) {
            x_init_right = event.clientX;
            y_init_right = event.clientY;
            var delta_x = parseInt((x_new_right - x_init_right) * 360 / this.width);
            var delta_y = parseInt((y_new_right - y_init_right) * 360 / this.width);
   
            var axis = [-delta_y, delta_x, 0];
            var degrees = Math.sqrt(delta_x * delta_x + delta_y * delta_y);
            var newRotationMatrix = mat4.create();
            mat4.rotate(newRotationMatrix, newRotationMatrix, degreesToRadians(degrees), axis);
            mat4.multiply(rotationMatrix, newRotationMatrix, rotationMatrix);
        } else if (leftMouseDown && !isRotating) {
            new_coordinates = screenToObjectCoordinates(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
            var direction = vec3.create();
            vec3.subtract(direction, new_coordinates, init_coordinates);
            vec3.normalize(direction, direction);
            rubiksCube.setRotationAxis(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET, direction);
            rubiksCube.setRotatedCubes();
            isRotating = rubiksCube.rotatedCubes && rubiksCube.rotationAxis;
        }
        x_new_right = event.clientX;
        y_new_right = event.clientY;    
    }

    function startRotate(event) {
        if (event.button == LEFT_MOUSE) { // left mouse
            rubiksCube.selectedCubes = [];
            rubiksCube.selectCube(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
            if (rubiksCube.selectedCubes.length > 0) {            
                init_coordinates = screenToObjectCoordinates(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
                setTimeout(function() {
                    leftMouseDown = true;
                }, 50);
            }
        } else if (event.button == RIGHT_MOUSE) { // right mouse
            rightMouseDown = true;
            x_init_right = event.pageX;
            y_init_right = event.pageY;
        }
    }

    function endRotate(event) {
        if (event.button == LEFT_MOUSE && leftMouseDown) { // left mouse
            leftMouseDown = false;
            rubiksCube.algDone();
        } else if (event.button == RIGHT_MOUSE) { // right mouse
            rightMouseDown = false;
        }
    }

    function topView() {
        mat4.identity(rotationMatrix);
        mat4.rotateX(rotationMatrix, rotationMatrix, degreesToRadians(90));
    }

    function bottomView() {
        mat4.identity(rotationMatrix);
        mat4.rotateX(rotationMatrix, rotationMatrix, degreesToRadians(-90));
    }

    function leftView() {
        mat4.identity(rotationMatrix);
        mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(-90));
    }

    function rightView() {
        mat4.identity(rotationMatrix);
        mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(90));
    }

    function frontView() {
        mat4.identity(rotationMatrix);
    }

    function backView() {
        mat4.identity(rotationMatrix);
        mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(180));
    }

    function perspectiveView() {
        mat4.identity(rotationMatrix);
        mat4.rotateX(rotationMatrix, rotationMatrix, degreesToRadians(30));
        mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(-50));
        mat4.rotateZ(rotationMatrix, rotationMatrix, degreesToRadians(0));
    }

    function togglePerspective(event) {
        switch(event.which) {
            case 32: // space
                perspectiveView();
                break;
            case 97: // a, left
                leftView();
                break;
            case 100: // d, right
                rightView();
                break;
            case 101: // e, top
                topView();
                break;
            case 113: // q, bottom
                bottomView();
                break;
            case 115: // s, back
                backView();
                break;
            case 119: // w, front
                frontView();
                break;
        }
    }

    function testLayerMoves() {
        if (!isAnimating) {
            isAnimating = true;
            rubiksCube.perform([
                {face:"R", inverse:false},
                {face:"R", inverse:true},
                {face:"L", inverse:false},
                {face:"L", inverse:true},
                {face:"U", inverse:false},
                {face:"U", inverse:true},
                {face:"D", inverse:false},
                {face:"D", inverse:true},
                {face:"F", inverse:false},
                {face:"F", inverse:true},
                {face:"B", inverse:false},
                {face:"B", inverse:true},
                {face:"M", inverse:false},
                {face:"M", inverse:true},
                {face:"E", inverse:false},
                {face:"E", inverse:true},
                {face:"S", inverse:false},
                {face:"S", inverse:true} 
                ]);
            return;
        }
    }

        function scramble() {
        var count;
        isInitializing = false;
        if (!isAnimating) {
            isAnimating = true;

                if ($(canvas).parent().find('.scramble-length'))
                    count = parseInt($(canvas).parent().find('.scramble-length').val());
            else
                count = Math.floor(Math.random() * 10) + 10;
            var moves = ['R','L','U','D','F','B'];
            var movesWithSlices = ['R','L','U','D','F','B','M','E','S'];
            var moveList = [];
            var moveIndex = 0;
            var prevIndex = 0;
            var randomMove;
            var inverse = false;
            var moveCount = 1;
            for (var i = 0; i < count; i++) {
                moveIndex = Math.floor(Math.random() * moves.length);
                while (moveIndex/2 == prevIndex/2) {
                    moveIndex = Math.floor(Math.random() * moves.length);
                }
                randomMove = moves[moveIndex];
                prevIndex = moveIndex;
                moveCount = 1 + Math.floor(Math.random()*2);
                inverse = moveCount==1 && Math.random() < 0.5;
                moveList.push({face:randomMove, inverse:inverse, count:moveCount});            
            }
            rubiksCube.perform(moveList);
        var ret = rubiksCube.moveListToString(moveList);
                $(canvas).parent().find('.moveList').text(ret);
        }
        return ret;
    }

    function parseAlgorithm(algorithm) {
        var alg = algorithm;
        alg = alg.replace(/ /g, '');
            alg = alg.replace(/'/g,'3');
        alg = alg.replace(/-/g,'3');
        alg = alg.replace(/([^LRUDFBMESxyz0123456789])/gi,"");
            // add count where necessary
        alg = alg.replace(/([LRUDFBMESxyz])([^0-9])/ig,"$11$2");
        alg = alg.replace(/([LRUDFBMESxyz])([^0-9])/ig,"$11$2");
        alg = alg.replace(/([0-9])([LRUDFBMESxyz])/ig,"$1,$2");
        alg = alg.replace(/([LRUDFBMESxyz])$/i,"$11");

            var moveList = alg.split(",")
                .map(function(el){
                  var n = 1*el.charAt(1);
                  return {
                      face:el.charAt(0),
                      inverse: n==3,
                      count:(""+n).replace(3,1)}
                });

        return moveList;
    }
    
    function doAlgorithm(moves) {
        if (!isAnimating) {
            isAnimating = true;

            rubiksCube.perform(moves);
        }
    }
    
    function initControls() {
        $('#controls .btn').click(function() {
            var arrControls = [
                "R","L","U","D","F","B",
                "R-prime","L-prime","U-prime","D-prime","F-prime","B-prime",
                "R2","L2","U2","D2","F2","B2"
                ];
            var control = this.id.replace('move-','');        
            var prime = false;
            var doubleMove = false;
            if (control.match('prime'))
                prime = true;
            if (control.match('2'))
                doubleMove = true;
            var layer = control.charAt(0);
            var moveList = [];
            moveList.push({face:layer, inverse:prime, count:doubleMove?2:1});            
            rubiksCube.perform(moveList);
        });
    }

        // public interface
        this.start = start;
        this.reset = function() { rubiksCube.reset(); };
        this.rubiksCube = function() { return rubiksCube; };
        this.initControls = function() { initControls(); };
        this.parseAlgorithm = parseAlgorithm;
        this.doAlgorithm = doAlgorithm;
        this.scramble = scramble;
        this.rotate = rotate;
        this.startRotate = startRotate;
        this.endRotate = endRotate;
        this.togglePerspective = togglePerspective;
    };
    
    // global scope
    $(document).ready(function() {
        $('.glube').each(function(){
            var glube = new GLube;

            // animation
            $(this).find('canvas').each(function() {
                var canvas = this;
                glube.start(this);
                $(this).bind('contextmenu', function(e) { return false; });
                $(this).mousedown(glube.startRotate);
                $(this).mousemove(glube.rotate);
                $(this).mouseup(glube.endRotate);
                glube.reset();
                glube.initControls();
        });
            // controls         
            $(this).find('.reset-cube').click(function() {glube.reset();});
            $(this).find('.scramble-cube').click(function() {glube.scramble()});
            $(this).find('.run-alg').click(function() {
                glube.isInitializing = false; 
                var alg = $(this).prev().find('.algorithm').val();
                var moves = glube.parseAlgorithm(alg);
                glube.doAlgorithm(moves);
    });
        });  
    });
    
})();
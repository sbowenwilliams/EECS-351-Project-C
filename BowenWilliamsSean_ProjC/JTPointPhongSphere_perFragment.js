//23456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
//
// PointLightedSphere_perFragment.js (c) 2012 matsuda and kanda
//
// MODIFIED for EECS 351-1, Northwestern Univ. Jack Tumblin
//		Multiple light-sources: 'lamp0, lamp1, lamp2, etc
//			 RENAME: ambientLight --> lamp0amb, lightColor --> lamp0diff,
//							 lightPosition --> lamp0pos
//		Complete the Phong lighting model: add emissive and specular:
//		--Ke, Ka, Kd, Ks: K==Reflectance; emissive, ambient, diffuse, specular.
//		-- 										Kshiny: specular exponent for 'shinyness'.
//		--    Ia, Id, Is:	I==Illumination:          ambient, diffuse, specular.
//		-- Implemented Blinn-Phong 'half-angle' specular term (from class)
//
// Vertex shader program
var VSHADER_SOURCE =
    //-------------ATTRIBUTES: of each vertex, read from our Vertex Buffer Object
    'attribute vec4 a_Position; \n' + // vertex position (model coord sys)
    'attribute vec4 a_Normal; \n' + // vertex normal vector (model coord sys)
    //  'attribute vec4 a_color;\n' + 		// Per-vertex colors? they usually 
    // set the Phong diffuse reflectance
    //-------------UNIFORMS: values set from JavaScript before a drawing command.
    'uniform vec3 u_Kd; \n' + //	Instead, we'll use this 'uniform' 
    // Phong diffuse reflectance for the entire shape
    'uniform mat4 u_MvpMatrix; \n' +
    'uniform mat4 u_ModelMatrix; \n' + // Model matrix
    'uniform mat4 u_NormalMatrix; \n' + // Inverse Transpose of ModelMatrix;
    // (doesn't distort normal directions)

    //-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
    'varying vec3 v_Kd; \n' + // Phong Lighting: diffuse reflectance
    // (I didn't make per-pixel Ke,Ka,Ks )
    'varying vec4 v_Position; \n' +
    'varying vec3 v_Normal; \n' + // Why Vec3? its not a point, hence w==0
    //---------------
    'void main() { \n' +
    // Set the CVV coordinate values from our given vertex. This 'built-in'
    // per-vertex value gets interpolated to set screen position for each pixel.
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    // Calculate the vertex position & normal in the WORLD coordinate system
    // and then save as 'varying', so that fragment shaders each get per-pixel
    // values (interp'd between vertices for our drawing primitive (TRIANGLE)).
    '  v_Position = u_ModelMatrix * a_Position; \n' +
    // 3D surface normal of our vertex, in world coords.  ('varying'--its value
    // gets interpolated (in world coords) for each pixel's fragment shader.
    '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '	 v_Kd = u_Kd; \n' + // find per-pixel diffuse reflectance from per-vertex
    // (no per-pixel Ke,Ka, or Ks, but you can do it...)
    //	'  v_Kd = vec3(1.0, 1.0, 0.0); \n'	+ // TEST; fixed at green
    '}\n';

// Fragment shader program
var FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +

    // first light source: (YOU write a second one...)
    'uniform vec4 u_Lamp0Pos;\n' + // Phong Illum: position
    'uniform vec3 u_Lamp0Amb;\n' + // Phong Illum: ambient
    'uniform vec3 u_Lamp0Diff;\n' + // Phong Illum: diffuse
    'uniform vec3 u_Lamp0Spec;\n' + // Phong Illum: specular

    // first material definition: you write 2nd, 3rd, etc.
    'uniform vec3 u_Ke;\n' + // Phong Reflectance: emissive
    'uniform vec3 u_Ka;\n' + // Phong Reflectance: ambient
    // Phong Reflectance: diffuse? -- use v_Kd instead for per-pixel value
    'uniform vec3 u_Ks;\n' + // Phong Reflectance: specular
    //  'uniform int u_Kshiny;\n' +						// Phong Reflectance: 1 < shiny < 200
    //	
    'uniform vec4 u_eyePosWorld; \n' + // Camera/eye location in world coords.

    'varying vec3 v_Normal;\n' + // Find 3D surface normal at each pix
    'varying vec4 v_Position;\n' + // pixel's 3D pos too -- in 'world' coords
    'varying vec3 v_Kd;	\n' + // Find diffuse reflectance K_d per pix
    // Ambient? Emissive? Specular? almost
    // NEVER change per-vertex: I use'uniform'

    'void main() { \n' +
    // Normalize! interpolated normals aren't 1.0 in length any more
    '  vec3 normal = normalize(v_Normal); \n' +
    // Calculate the light direction vector, make it unit-length (1.0).
    '  vec3 lightDirection = normalize(u_Lamp0Pos.xyz - v_Position.xyz);\n' +
    // The dot product of the light direction and the normal
    // (use max() to discard any negatives from lights below the surface)
    '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
    // The Blinn-Phong lighting model computes the specular term faster 
    // because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
    // where 'halfway' vector H has a direction half-way between L and V"
    // H = norm(norm(V) + norm(L)) 
    // (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)
    '  vec3 eyeDirection = normalize(u_eyePosWorld.xyz - v_Position.xyz); \n' +
    '  vec3 H = normalize(lightDirection + eyeDirection); \n' +
    '  float nDotH = max(dot(H, normal), 0.0); \n' +
    // (use max() to discard any negatives from lights below the surface)
    // Apply the 'shininess' exponent K_e:
    '  float e02 = nDotH*nDotH; \n' +
    '  float e04 = e02*e02; \n' +
    '  float e08 = e04*e04; \n' +
    '	 float e16 = e08*e08; \n' +
    '	 float e32 = e16*e16; \n' +
    '	 float e64 = e32*e32;	\n' +
    // Calculate the final color from diffuse reflection and ambient reflection
    '	 vec3 emissive = u_Ke;' +
    '  vec3 ambient = u_Lamp0Amb * u_Ka;\n' +
    '  vec3 diffuse = u_Lamp0Diff * v_Kd * nDotL;\n' +
    '	 vec3 speculr = u_Lamp0Spec * u_Ks * e64 * e64;\n' +
    '  gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
    '}\n';

var floatsPerVertex = 6;
var leanRate = 1.0;
var positions = [];
var indices = [];

var lean = 0.0;
var ar = innerWidth / innerHeight;
var lamp = new Float32Array([0.0, 0.0, 0.0]);
var tarLamp = new Float32Array([0.0, 0.0, 0.0]);



function main() {
    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');
    canvas.width = innerWidth;
    canvas.height = innerHeight;


    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // 
    var n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to set the vertex information');
        return;
    }

    // Set the clear color and enable the depth test
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    // Get the storage locations of uniform variables: the scene
    var u_eyePosWorld = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    if (!u_ModelMatrix || !u_MvpMatrix || !u_NormalMatrix) {
        console.log('Failed to get matrix storage locations');
        return;
    }
    //  ... for Phong light source:
    var u_Lamp0Pos = gl.getUniformLocation(gl.program, 'u_Lamp0Pos');
    var u_Lamp0Amb = gl.getUniformLocation(gl.program, 'u_Lamp0Amb');
    var u_Lamp0Diff = gl.getUniformLocation(gl.program, 'u_Lamp0Diff');
    var u_Lamp0Spec = gl.getUniformLocation(gl.program, 'u_Lamp0Spec');
    var u_Lamp1Pos = gl.getUniformLocation(gl.program, 'u_Lamp1Pos');
    var u_Lamp1Amb = gl.getUniformLocation(gl.program, 'u_Lamp1Amb');
    var u_Lamp1Diff = gl.getUniformLocation(gl.program, 'u_Lamp1Diff');
    var u_Lamp1Spec = gl.getUniformLocation(gl.program, 'u_Lamp1Spec');
    if (!u_Lamp0Pos || !u_Lamp0Amb) { //|| !u_Lamp0Diff	) { // || !u_Lamp0Spec	) {
        console.log('Failed to get the Lamp0 storage locations');
        return;
    }
    // ... for Phong material/reflectance:
    var u_Ke = gl.getUniformLocation(gl.program, 'u_Ke');
    var u_Ka = gl.getUniformLocation(gl.program, 'u_Ka');
    var u_Kd = gl.getUniformLocation(gl.program, 'u_Kd');
    var u_Ks = gl.getUniformLocation(gl.program, 'u_Ks');
    //	var u_Kshiny = gl.getUniformLocation(gl.program, 'u_Kshiny');

    if (!u_Ke || !u_Ka || !u_Kd
        //		 || !u_Ks || !u_Kshiny
    ) {
        console.log('Failed to get the Phong Reflectance storage locations');
        return;
    }

    document.onkeydown = function (ev) {
        keydown(ev);
    };


    // Position the first light source in World coords: 
//    gl.uniform4f(u_Lamp0Pos, 6.0, 6.0, 0.0, 1.0);
    // Set its light output:  
    gl.uniform3f(u_Lamp0Amb, 0.4, 0.4, 0.4); // ambient
    gl.uniform3f(u_Lamp0Diff, 1.0, 1.0, 1.0); // diffuse
    gl.uniform3f(u_Lamp0Spec, 1.0, 1.0, 1.0); // Specular

    // Set the Phong materials' reflectance:
    gl.uniform3f(u_Ke, 0.0, 0.0, 0.0); // Ke emissive
    gl.uniform3f(u_Ka, 0.6, 0.0, 0.0); // Ka ambient
    gl.uniform3f(u_Kd, 0.8, 0.0, 0.0); // Kd	diffuse
    gl.uniform3f(u_Ks, 0.8, 0.8, 0.8); // Ks specular
    //	gl.uniform1i(u_Kshiny, 4);							// Kshiny shinyness exponent

    var modelMatrix = new Matrix4(); // Model matrix
    var mvpMatrix = new Matrix4(); // Model view projection matrix
    var normalMatrix = new Matrix4(); // Transformation matrix for normals

    var tick = function () {

        animate()
        for (i = 0; i < 3; i++) {
            camPos[i] = 0.05 * (tarCamPos[i] - camPos[i]) + camPos[i];
            lookPos[i] = 0.05 * (tarLookPos[i] - lookPos[i]) + lookPos[i];
            lamp[i] = 0.05 * (tarLamp[i] - lamp[i]) + lamp[i];
        }
        gl.uniform3f(u_Lamp1Pos, lamp[0], lamp[1], lamp[2]);
        gl.uniform4f(u_Lamp0Pos, camPos[0], camPos[1], camPos[2], 1);
        //gl.uniform4f(u_Lamp0Pos, 6.0, 6.0, 0.0, 1.0);
        draw(gl, canvas, u_MvpMatrix, mvpMatrix, u_ModelMatrix, modelMatrix, u_NormalMatrix, normalMatrix, n, u_eyePosWorld);
        requestAnimationFrame(tick, canvas);
    }
    tick();
}

function animate() {
    var now = Date.now();
    lean = leanRate * Math.sin(now / 1000);
}

function keydown(ev) {

    if (ev.keyCode == 39) {
        angle += 0.03;
    } else
        if (ev.keyCode == 37) {
            angle -= 0.03;
        } else
            if (ev.keyCode == 38) {
                height += 0.03;
            } else
                if (ev.keyCode == 40) {
                    height -= 0.03;
                }
    if (ev.keyCode == 87) { 
        moveDirVec = findDirectionVector(tarCamPos, tarLookPos)
        moveInDirection(moveDirVec);
    } else
        if (ev.keyCode == 83) { 
            moveDirVec = findDirectionVector(tarCamPos, tarLookPos);
            for (k = 0; k < 3; k++) {
                moveDirVec[k] = moveDirVec[k] * -1;
            }
            moveInDirection(moveDirVec);
        } else
            if (ev.keyCode == 65) { 
                moveDirVec = findDirectionVector(tarCamPos, tarLookPos);
                moveDirVec = findHorizTransVector(moveDirVec);
                for (k = 0; k < 3; k++) {
                    moveDirVec[k] = moveDirVec[k] * -1;
                }
                moveInDirection(moveDirVec);
            } else
                if (ev.keyCode == 68) { 
                    moveDirVec = findDirectionVector(tarCamPos, tarLookPos);
                    moveDirVec = findHorizTransVector(moveDirVec);
                    moveInDirection(moveDirVec);
                }
    if (ev.keyCode == 32) { 
        moveDirVec = new Float32Array([0, 1, 0]);
        moveInDirection(moveDirVec);
    } else
        if (ev.keyCode == 17) { 
            moveDirVec = new Float32Array([0, -1, 0]);
            moveInDirection(moveDirVec);
        }
}

var g_CamX = 0.00;
var g_CamY = 0.00;
var g_CamZ = 10.0;
var angle = 0.00;
var height = 0;
var camPos = new Float32Array([g_CamX, g_CamY, g_CamZ]);

var moveDirVec = new Float32Array([0.0, 0.0, 0.0]);
var directionVec = new Float32Array([0.0, 0.0, 0.0]);
var lookPos = new Float32Array([0, 0, 0]);
var tarLookPos = new Float32Array([0, 0, 0]);
var tarCamPos = new Float32Array([g_CamX, g_CamY, g_CamZ]);

function findDirectionVector(camPoint, lookPoint) {

    for (k = 0; k < 3; k++) {
        directionVec[k] = lookPoint[k] - camPoint[k];
    }
    return directionVec;
}

function findHorizTransVector(direction) {
    var directVec = new Float32Array([0.0, 0.0, 0.0]);
    directVec[1] = g_CamY;
    directVec[0] = direction[2] * -1;
    directVec[2] = direction[0];

    return directVec;
}

function moveInDirection(direction) {
    var step = .05;
    for (k = 0; k < 3; k++) {
        tarCamPos[k] += direction[k] * step;
    }
}

function rotateCam(theta, height, camX, camY, camZ) {
    var lookX;
    var lookY;
    var lookZ;
    var radius;

    radius = 5;
    if (theta == 0){
        lookX = 0;
    }
    else {
    lookX = camX + Math.cos(theta-1) * radius;
    }
  
    lookY = camY + height;
    lookZ = camZ + Math.sin(theta) * radius;

    tarLookPos[0] = lookX;
    tarLookPos[1] = lookY;
    tarLookPos[2] = lookZ;

    console.log('Looking at ', tarLookPos[0], tarLookPos[1], tarLookPos[2]);
}

function draw(gl, canvas, u_MvpMatrix, mvpMatrix, u_ModelMatrix, modelMatrix, u_NormalMatrix, normalMatrix, n, u_eyePosWorld) {
    // Calculate the model matrix
    modelMatrix.setRotate(90, 0, 1, 0); // Rotate around the y-axis
    // Calculate the view projection matrix
    mvpMatrix.setPerspective(30, ar, 1, 100);
    rotateCam(angle, height, tarCamPos[0], tarCamPos[1], tarCamPos[2]);
    mvpMatrix.lookAt(camPos[0], camPos[1], camPos[2],        
                    lookPos[0], lookPos[1], lookPos[2],        
                    0, 1, 0);   
    mvpMatrix.multiply(modelMatrix);
    // Calculate the matrix to transform the normal based on the model matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    // Pass the eye position to u_eyePosWorld
    gl.uniform4f(u_eyePosWorld, 6, 0, 0, 1);
    // Pass the model matrix to u_ModelMatrix
    
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // Pass the model view projection matrix to u_mvpMatrix
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

    // Pass the transformation matrix for normals to u_NormalMatrix
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    // Clear color and depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    
    // Draw the cube
    gl.drawElements(gl.TRIANGLES, sphereVerts.length, gl.UNSIGNED_SHORT, 0);


}

function makeGroundGrid() {
    //==============================================================================
    // Create a list of vertices that create a large grid of lines in the x,y plane
    // centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

    var xcount = 1000; // # of lines to draw in x,y to make the grid.
    var ycount = 1000;
    var xymax = 50.0; // grid size; extends to cover +/-xymax in x and y.
    var xColr = new Float32Array([1.0, 1.0, 0.3]); // bright yellow
    var yColr = new Float32Array([0.5, 1.0, 0.5]); // bright green.

    // Create an (global) array to hold this ground-plane's vertices:
    gndVerts = new Float32Array(floatsPerVertex * 2 * (xcount + ycount));
    // draw a grid made of xcount+ycount lines; 2 vertices per line.

    var xgap = xymax / (xcount - 1); // HALF-spacing between lines in x,y;
    var ygap = xymax / (ycount - 1); // (why half? because v==(0line number/2))

    // First, step thru x values as we make vertical lines of constant-x:
    for (v = 0, j = 0; v < 2 * xcount; v++, j += floatsPerVertex) {
        if (v % 2 == 0) { // put even-numbered vertices at (xnow, -xymax, 0)
            gndVerts[j] = -xymax + (v) * xgap; // x
            gndVerts[j + 1] = -xymax; // y
            gndVerts[j + 2] = 0.0; // z
            gndVerts[j + 3] = 1.0; // w.
        } else { // put odd-numbered vertices at (xnow, +xymax, 0).
            gndVerts[j] = -xymax + (v - 1) * xgap; // x
            gndVerts[j + 1] = xymax; // y
            gndVerts[j + 2] = 0.0; // z
            gndVerts[j + 3] = 1.0; // w.
        }
        gndVerts[j + 4] = xColr[0]; // red
        gndVerts[j + 5] = xColr[1]; // grn
        gndVerts[j + 6] = xColr[2]; // blu
    }
    // Second, step thru y values as wqe make horizontal lines of constant-y:
    // (don't re-initialize j--we're adding more vertices to the array)
    for (v = 0; v < 2 * ycount; v++, j += floatsPerVertex) {
        if (v % 2 == 0) { // put even-numbered vertices at (-xymax, ynow, 0)
            gndVerts[j] = -xymax; // x
            gndVerts[j + 1] = -xymax + (v) * ygap; // y
            gndVerts[j + 2] = 0.0; // z
            gndVerts[j + 3] = 1.0; // w.
        } else { // put odd-numbered vertices at (+xymax, ynow, 0).
            gndVerts[j] = xymax; // x
            gndVerts[j + 1] = -xymax + (v - 1) * ygap; // y
            gndVerts[j + 2] = 0.0; // z
            gndVerts[j + 3] = 1.0; // w.
        }
        gndVerts[j + 4] = yColr[0]; // red
        gndVerts[j + 5] = yColr[1]; // grn
        gndVerts[j + 6] = yColr[2]; // blu
    }
}

function makeSphere() {
     var SPHERE_DIV = 13;

    var i, ai, si, ci;
    var j, aj, sj, cj;
    var p1, p2;

    positions = [];
    indices = [];

    // Generate coordinates
    for (j = 0; j <= SPHERE_DIV; j++) {
        aj = j * Math.PI / SPHERE_DIV;
        sj = Math.sin(aj);
        cj = Math.cos(aj);
        for (i = 0; i <= SPHERE_DIV; i++) {
            ai = i * 2 * Math.PI / SPHERE_DIV;
            si = Math.sin(ai);
            ci = Math.cos(ai);

            positions.push(si * sj); // X
            positions.push(cj); // Y
            positions.push(ci * sj); // Z
        }
    }

    // Generate indices
    for (j = 0; j < SPHERE_DIV; j++) {
        for (i = 0; i < SPHERE_DIV; i++) {
            p1 = j * (SPHERE_DIV + 1) + i;
            p2 = p1 + (SPHERE_DIV + 1);

            indices.push(p1);
            indices.push(p2);
            indices.push(p1 + 1);

            indices.push(p1 + 1);
            indices.push(p2);
            indices.push(p2 + 1);
        }
    }
    
}

function initVertexBuffers(gl) { // Create a sphere
   

    //var sphereVerts = new Uint16Array(indices);
    makeSphere();
    makeGroundGrid();
    sphereVerts = new Uint16Array(indices);
    
    size = gndVerts.length + sphereVerts.length;
    nn = size / floatsPerVertex;
    console.log('nn is: ', nn);
    
    var verticesColors = new Float32Array(indices.length + size);
    
    for (i = 0, j = 0; j < sphereVerts.length; i++, j++) {
        verticesColors[i] = sphereVerts[j];
    }

    gndStart = i;

    for (j = 0; j < gndVerts.length; i++, j++) {
        verticesColors[i] = gndVerts[j];
    }
    
    if (!initArrayBuffer(gl, 'a_Position', new Float32Array(positions), gl.FLOAT, 3)) return -1;
    if (!initArrayBuffer(gl, 'a_Normal', new Float32Array(positions), gl.FLOAT, 3)) return -1;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Write the indices to the buffer object
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return nn;
}

function initArrayBuffer(gl, attribute, data, type, num) {
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return false;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    var a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the storage location of ' + attribute);
        return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);

    return true;
}
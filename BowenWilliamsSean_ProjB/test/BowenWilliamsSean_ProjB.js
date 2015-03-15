// Vertex shader program
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'uniform mat4 u_ViewMatrix;\n' +
    'uniform mat4 u_ProjMatrix;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_Position = u_ProjMatrix * u_ViewMatrix * a_Position;\n' +
    '  v_Color = a_Color;\n' +
    '}\n';

// Fragment shader program
var FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';

var floatsPerVertex = 6; // # of Float32Array elements used for each vertex
// (x,y,z)position + (r,g,b)color

var ANGLE_STEP = 45.0;
var floatsPerVertex = 6;
var leanRate = 1.0;
var positions = [];
var indices = [];

var lean = 0.0;
var ar = innerWidth / innerHeight;
var lamp = new Float32Array([0.0, 0.0, 0.0]);
var tarLamp = new Float32Array([0.0, 0.0, 0.0]);

function main() {
    //==============================================================================
    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

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

    // NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel
    // unless the new Z value is closer to the eye than the old one..
    //	gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
    gl.enable(gl.DEPTH_TEST);

    // Set the vertex coordinates and color (the blue triangle is in the front)
    var n = initVertexBuffers(gl);

    if (n < 0) {
        console.log('Failed to specify the vertex infromation');
        return;
    }

    // Specify the color for clearing <canvas>
    gl.clearColor(0.2, 0.2, 0.2, 1.0);

    // Get the storage locations of u_ViewMatrix and u_ProjMatrix variables
    var u_eyePosWorld = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
    var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    if (!u_ViewMatrix || !u_ProjMatrix) {
        console.log('Failed to get u_ViewMatrix or u_ProjMatrix');
        return;
    }

    // Create the matrix to specify the view matrix
    var viewMatrix = new Matrix4();
    // Register the event handler to be called on key press
    document.onkeydown = function (ev) {
        keydown(ev, gl, u_ViewMatrix, viewMatrix);
    };
    // (Note that I eliminated the 'n' argument (no longer needed)).

    // Create the matrix to specify the viewing volume and pass it to u_ProjMatrix
    var projMatrix = new Matrix4();
    // REPLACE this orthographic camera matrix:
    /*  projMatrix.setOrtho(-1.0, 1.0, 					// left,right;
      										-1.0, 1.0, 					// bottom, top;
      										0.0, 2000.0);				// near, far; (always >=0)
    */
    // with this perspective-camera matrix:
    // (SEE PerspectiveView.js, Chapter 7 of book)

    projMatrix.setPerspective(30, canvas.width / canvas.height, 1, 100);

    // YOU TRY IT: make an equivalent camera using matrix-cuon-mod.js
    // perspective-camera matrix made by 'frustum()' function..

    // Send this matrix to our Vertex and Fragment shaders through the
    // 'uniform' variable u_ProjMatrix:
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
    var currentAngle = 45.0;

    var tick = function () {
        //console.log(currentAngle);
        currentAngle = animate(currentAngle); // Update the rotation angle
        draw(gl, u_ViewMatrix, viewMatrix, currentAngle); // Draw shapes
        //console.log('currentAngle=',currentAngle);
        requestAnimationFrame(tick, canvas);
        // Request that the browser re-draw the webpage
    };
    tick();
    // Draw the triangles
}

function makeGroundGrid() {
    //==============================================================================
    // Create a list of vertices that create a large grid of lines in the x,y plane
    // centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

    var xcount = 100; // # of lines to draw in x,y to make the grid.
    var ycount = 100;
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
        } else { // put odd-numbered vertices at (xnow, +xymax, 0).
            gndVerts[j] = -xymax + (v - 1) * xgap; // x
            gndVerts[j + 1] = xymax; // y
            gndVerts[j + 2] = 0.0; // z
        }
        gndVerts[j + 3] = xColr[0]; // red
        gndVerts[j + 4] = xColr[1]; // grn
        gndVerts[j + 5] = xColr[2]; // blu
    }
    // Second, step thru y values as wqe make horizontal lines of constant-y:
    // (don't re-initialize j--we're adding more vertices to the array)
    for (v = 0; v < 2 * ycount; v++, j += floatsPerVertex) {
        if (v % 2 == 0) { // put even-numbered vertices at (-xymax, ynow, 0)
            gndVerts[j] = -xymax; // x
            gndVerts[j + 1] = -xymax + (v) * ygap; // y
            gndVerts[j + 2] = 0.0; // z
        } else { // put odd-numbered vertices at (+xymax, ynow, 0).
            gndVerts[j] = xymax; // x
            gndVerts[j + 1] = -xymax + (v - 1) * ygap; // y
            gndVerts[j + 2] = 0.0; // z
        }
        gndVerts[j + 3] = yColr[0]; // red
        gndVerts[j + 4] = yColr[1]; // grn
        gndVerts[j + 5] = yColr[2]; // blu
    }
}

function makeTetra() {
    var c30 = Math.sqrt(0.75); // == cos(30deg) == sqrt(3) / 2
    var sq2 = Math.sqrt(2.0);

    tetraVerts = new Float32Array([
    // Face 0: (left side)
    0.0, 0.0, sq2, 1.0, 1.0, 1.0, // Node 0
    c30, -0.5, 0.0, 0.0, 0.0, 1.0, // Node 1
    0.0, 1.0, 0.0, 1.0, 0.0, 0.0, // Node 2
    // Face 1: (right side)
    0.0, 0.0, sq2, 1.0, 1.0, 1.0, // Node 0
    0.0, 1.0, 0.0, 1.0, 0.0, 0.0, // Node 2
    -c30, -0.5, 0.0, 0.0, 1.0, 0.0, // Node 3
    // Face 2: (lower side)
    0.0, 0.0, sq2, 1.0, 1.0, 1.0, // Node 0
    -c30, -0.5, 0.0, 0.0, 1.0, 0.0, // Node 3
    c30, -0.5, 0.0, 0.0, 0.0, 1.0, // Node 1
    // Face 3: (base side)
    -c30, -0.5, 0.0, 0.0, 1.0, 0.0, // Node 3
    0.0, 1.0, 0.0, 1.0, 0.0, 0.0, // Node 2
    c30, -0.5, 0.0, 0.0, 0.0, 1.0, // Node 1
  ]);
}

function makeBase() {
    baseVerts = new Float32Array([
    0.0, 0.0, 0.0, 1.0, 1.0, 1.0, //Node 0
    0.5, 0.0, 0.0, 1.0, 1.0, 1.0, //Node 1
    0.0, 1.0, 0.0, 1.0, 1.0, 1.0, //Node 2

    0.5, 1.0, 0.0, 1.0, 1.0, 1.0, //Node 3
    0.0, 1.0, 0.0, 1.0, 1.0, 1.0, //Node 2
    0.5, 0.0, 0.0, 1.0, 1.0, 1.0, //Node 1

  ]);
}

function makeRobotArm() {
    robotVerts = new Float32Array([
    0.0, 0.0, 0.0, 0.0, 1.0, 1.0,
    0.3, 0.0, 0.0, 0.0, 1.0, 1.0,
    0.3, 0.5, 0.0, 0.0, 1.0, 1.0,
    0.0, 0.5, 0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 0.0, 0.0, 1.0, 1.0,

    0.0, 0.0, 0.4, 1.0, 1.0, 1.0,
    0.3, 0.0, 0.4, 1.0, 1.0, 1.0,
    0.3, 0.5, 0.4, 1.0, 1.0, 1.0,
    0.0, 0.5, 0.4, 1.0, 1.0, 1.0,
    0.0, 0.0, 0.4, 1.0, 1.0, 1.0,

    0.0, 0.0, 0.0, 0.0, 1.0, 1.0,
    0.0, 0.5, 0.0, 0.0, 1.0, 1.0,
    0.0, 0.5, 0.4, 0.0, 1.0, 1.0,
    0.3, 0.5, 0.4, 0.0, 1.0, 1.0,
    0.3, 0.5, 0.0, 0.0, 1.0, 1.0,
    0.3, 0.0, 0.0, 0.0, 1.0, 1.0,
    0.3, 0.0, 0.4, 0.0, 1.0, 1.0,
  ]);

}

function makeSphere() {
    //==============================================================================
    // Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like
    // equal-lattitude 'slices' of the sphere (bounded by planes of constant z),
    // and connect them as a 'stepped spiral' design (see makeCylinder) to build the
    // sphere from one triangle strip.
    var slices = 13; // # of slices of the sphere along the z axis. >=3 req'd
    // (choose odd # or prime# to avoid accidental symmetry)
    var sliceVerts = 27; // # of vertices around the top edge of the slice
    // (same number of vertices on bottom of slice, too)
    var topColr = new Float32Array([0.7, 0.7, 0.7]); // North Pole: light gray
    var equColr = new Float32Array([0.3, 0.7, 0.3]); // Equator:    bright green
    var botColr = new Float32Array([0.9, 0.9, 0.9]); // South Pole: brightest gray.
    var sliceAngle = Math.PI / slices; // lattitude angle spanned by one slice.

    // Create a (global) array to hold this sphere's vertices:
    sphVerts = new Float32Array(((slices * 2 * sliceVerts) - 2) * floatsPerVertex);
    // # of vertices * # of elements needed to store them.
    // each slice requires 2*sliceVerts vertices except 1st and
    // last ones, which require only 2*sliceVerts-1.

    // Create dome-shaped top slice of sphere at z=+1
    // s counts slices; v counts vertices;
    // j counts array elements (vertices * elements per vertex)
    var cos0 = 0.0; // sines,cosines of slice's top, bottom edge.
    var sin0 = 0.0;
    var cos1 = 0.0;
    var sin1 = 0.0;
    var j = 0; // initialize our array index
    var isLast = 0;
    var isFirst = 1;
    for (s = 0; s < slices; s++) { // for each slice of the sphere,
        // find sines & cosines for top and bottom of this slice
        if (s == 0) {
            isFirst = 1; // skip 1st vertex of 1st slice.
            cos0 = 1.0; // initialize: start at north pole.
            sin0 = 0.0;
        } else { // otherwise, new top edge == old bottom edge
            isFirst = 0;
            cos0 = cos1;
            sin0 = sin1;
        } // & compute sine,cosine for new bottom edge.
        cos1 = Math.cos((s + 1) * sliceAngle);
        sin1 = Math.sin((s + 1) * sliceAngle);
        // go around the entire slice, generating TRIANGLE_STRIP verts
        // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
        if (s == slices - 1) isLast = 1; // skip last vertex of last slice.
        for (v = isFirst; v < 2 * sliceVerts - isLast; v++, j += floatsPerVertex) {
            if (v % 2 == 0) { // put even# vertices at the the slice's top edge
                // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
                // and thus we can simplify cos(2*PI(v/2*sliceVerts))
                sphVerts[j] = sin0 * Math.cos(Math.PI * (v) / sliceVerts);
                sphVerts[j + 1] = sin0 * Math.sin(Math.PI * (v) / sliceVerts);
                sphVerts[j + 2] = cos0;
                sphVerts[j + 3] = 1.0;
            } else { // put odd# vertices around the slice's lower edge;
                // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
                sphVerts[j] = sin1 * Math.cos(Math.PI * (v - 1) / sliceVerts); // x
                sphVerts[j + 1] = sin1 * Math.sin(Math.PI * (v - 1) / sliceVerts); // y
                sphVerts[j + 2] = cos1; // z
                sphVerts[j + 3] = 1.0; // w.
            }
            if (s == 0) { // finally, set some interesting colors for vertices:
                sphVerts[j + 4] = topColr[0];
                sphVerts[j + 5] = topColr[1];
                sphVerts[j + 6] = topColr[2];
            } else if (s == slices - 1) {
                sphVerts[j + 4] = botColr[0];
                sphVerts[j + 5] = botColr[1];
                sphVerts[j + 6] = botColr[2];
            } else {
                sphVerts[j + 4] = Math.random(); // equColr[0];
                sphVerts[j + 5] = Math.random(); // equColr[1];
                sphVerts[j + 6] = Math.random(); // equColr[2];
            }
        }
    }
}

function makeCylinder() {
    //==============================================================================
    // Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
    // 'stepped spiral' design described in notes.
    // Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
    //
    var ctrColr = new Float32Array([0.2, 0.2, 0.2]); // dark gray
    var topColr = new Float32Array([0.4, 0.7, 0.4]); // light green
    var botColr = new Float32Array([0.5, 0.5, 1.0]); // light blue
    var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
    var botRadius = 1.6; // radius of bottom of cylinder (top always 1.0)

    // Create a (global) array to hold this cylinder's vertices;
    cylVerts = new Float32Array(((capVerts * 6) - 2) * floatsPerVertex);
    // # of vertices * # of elements needed to store them.

    // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
    // v counts vertices: j counts array elements (vertices * elements per vertex)
    for (v = 1, j = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
        // skip the first vertex--not needed.
        if (v % 2 == 0) { // put even# vertices at center of cylinder's top cap:
            cylVerts[j] = 0.0; // x,y,z,w == 0,0,1,1
            cylVerts[j + 1] = 0.0;
            cylVerts[j + 2] = 1.0;
            cylVerts[j + 3] = 1.0; // r,g,b = topColr[]
            cylVerts[j + 4] = ctrColr[0];
            cylVerts[j + 5] = ctrColr[1];
            cylVerts[j + 6] = ctrColr[2];
        } else { // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
            cylVerts[j] = Math.cos(Math.PI * (v - 1) / capVerts); // x
            cylVerts[j + 1] = Math.sin(Math.PI * (v - 1) / capVerts); // y
            //	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
            //	 can simplify cos(2*PI * (v-1)/(2*capVerts))
            cylVerts[j + 2] = 1.0; // z
            cylVerts[j + 3] = 1.0; // w.
            // r,g,b = topColr[]
            cylVerts[j + 4] = topColr[0];
            cylVerts[j + 5] = topColr[1];
            cylVerts[j + 6] = topColr[2];
        }
    }
    // Create the cylinder side walls, made of 2*capVerts vertices.
    // v counts vertices within the wall; j continues to count array elements
    for (v = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
        if (v % 2 == 0) // position all even# vertices along top cap:
        {
            cylVerts[j] = Math.cos(Math.PI * (v) / capVerts); // x
            cylVerts[j + 1] = Math.sin(Math.PI * (v) / capVerts); // y
            cylVerts[j + 2] = 1.0; // z
            cylVerts[j + 3] = 1.0; // w.
            // r,g,b = topColr[]
            cylVerts[j + 4] = topColr[0];
            cylVerts[j + 5] = topColr[1];
            cylVerts[j + 6] = topColr[2];
        } else // position all odd# vertices along the bottom cap:
        {
            cylVerts[j] = botRadius * Math.cos(Math.PI * (v - 1) / capVerts); // x
            cylVerts[j + 1] = botRadius * Math.sin(Math.PI * (v - 1) / capVerts); // y
            cylVerts[j + 2] = -1.0; // z
            cylVerts[j + 3] = 1.0; // w.
            // r,g,b = topColr[]
            cylVerts[j + 4] = botColr[0];
            cylVerts[j + 5] = botColr[1];
            cylVerts[j + 6] = botColr[2];
        }
    }
    // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
    // v counts the vertices in the cap; j continues to count array elements
    for (v = 0; v < (2 * capVerts - 1); v++, j += floatsPerVertex) {
        if (v % 2 == 0) { // position even #'d vertices around bot cap's outer edge
            cylVerts[j] = botRadius * Math.cos(Math.PI * (v) / capVerts); // x
            cylVerts[j + 1] = botRadius * Math.sin(Math.PI * (v) / capVerts); // y
            cylVerts[j + 2] = -1.0; // z
            cylVerts[j + 3] = 1.0; // w.
            // r,g,b = topColr[]
            cylVerts[j + 4] = botColr[0];
            cylVerts[j + 5] = botColr[1];
            cylVerts[j + 6] = botColr[2];
        } else { // position odd#'d vertices at center of the bottom cap:
            cylVerts[j] = 0.0; // x,y,z,w == 0,0,-1,1
            cylVerts[j + 1] = 0.0;
            cylVerts[j + 2] = -1.0;
            cylVerts[j + 3] = 1.0; // r,g,b = botColr[]
            cylVerts[j + 4] = botColr[0];
            cylVerts[j + 5] = botColr[1];
            cylVerts[j + 6] = botColr[2];
        }
    }
}


function makeLines() {
    lineVerts = new Float32Array([
   0.0, -25.0, 0.0, 0, 1, 0,
   0.0, 25.0, 0.0, 0, 1, 0,
   -25.0, 0.0, 0.0, 1, 0, 0,
   25.0, 0, 0, 1, 0, 0,
   0, 0, -25.0, 0, 0, 1,
   0, 0, 25.0, 0, 0, 1
    ]);
}


function initVertexBuffers(gl) {
    //==============================================================================

    // make our 'forest' of triangular-shaped trees:
    forestVerts = new Float32Array([
    // Vertex coordinates and color
    0.0, 0.5, -0.4, 0.4, 1.0, 0.4, // The back green one
    -0.5, -0.5, -0.4, 0.4, 1.0, 0.4,
    0.5, -0.5, -0.4, 1.0, 0.4, 0.4,

    0.5, 0.4, -0.2, 1.0, 0.4, 0.4, // The middle yellow one
    -0.5, 0.4, -0.2, 1.0, 1.0, 0.4,
    0.0, -0.6, -0.2, 1.0, 1.0, 0.4,

    0.0, 0.5, 0.0, 0.4, 0.4, 1.0, // The front blue one
    -0.5, -0.5, 0.0, 0.4, 0.4, 1.0,
    0.5, -0.5, 0.0, 1.0, 0.4, 0.4,
  ]);

    // Make our 'ground plane' and 'torus' shapes too:
    makeGroundGrid();
    makeTetra();
    makeBase();
    makeRobotArm();
    makeSphere();
    makeCylinder();
    makeLines();

    // How much space to store all the shapes in one array?
    // (no 'var' means this is a global variable)
    mySiz = forestVerts.length + gndVerts.length + tetraVerts.length + baseVerts.length + robotVerts.length + sphVerts.length + cylVerts.length + lineVerts.length;

    // How many vertices total?
    var nn = mySiz / floatsPerVertex;
    console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);

    // Copy all shapes into one big Float32 array:
    var verticesColors = new Float32Array(mySiz);
    // Copy them:  remember where to start for each shape:
    forestStart = 0; // we store the forest first.
    for (i = 0, j = 0; j < forestVerts.length; i++, j++) {
        verticesColors[i] = forestVerts[j];
    }

    gndStart = i; // next we'll store the ground-plane;
    for (j = 0; j < gndVerts.length; i++, j++) {
        verticesColors[i] = gndVerts[j];
    }

    tetraStart = i; //Tetra start
    for (j = 0; j < tetraVerts.length; i++, j++) {
        verticesColors[i] = tetraVerts[j];
    }

    baseStart = i;
    for (j = 0; j < baseVerts.length; i++, j++) {
        verticesColors[i] = baseVerts[j];
    }

    robotStart = i;
    for (j = 0; j < robotVerts.length; i++, j++) {
        verticesColors[i] = robotVerts[j];
    }

    sphereStart = i;
    for (j = 0; j < sphVerts.length; i++, j++) {
        verticesColors[i] = sphVerts[j];
    }

    cylStart = i;
    for (j = 0; j < cylVerts.length; i++, j++) {
        verticesColors[i] = cylVerts[j];
    }

    lineStart = i;
    for (j = 0; j < lineVerts.length; i++, j++) {
        verticesColors[i] = lineVerts[j];
    }

    // Create a buffer object
    var vertexColorbuffer = gl.createBuffer();
    if (!vertexColorbuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    // Write vertex information to buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

    var FSIZE = verticesColors.BYTES_PER_ELEMENT;
    // Assign the buffer object to a_Position and enable the assignment
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
    gl.enableVertexAttribArray(a_Position);
    // Assign the buffer object to a_Color and enable the assignment
    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
    gl.enableVertexAttribArray(a_Color);

    return mySiz / floatsPerVertex; // return # of vertices
}

var g_EyeX = 0.20,
    g_EyeY = 0.25,
    g_EyeZ = 4.25;

var g_LookAtX = 0,
    g_LookAtY = 0,
    g_LookAtZ = 0;
// Global vars for Eye position.
// NOTE!  I moved eyepoint BACKWARDS from the forest: from g_EyeZ=0.25
// a distance far enough away to see the whole 'forest' of trees within the
// 30-degree field-of-view of our 'perspective' camera.  I ALSO increased
// the 'keydown()' function's effect on g_EyeX position.

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
    if (theta == 0) {
        lookX = 0;
    } else {
        lookX = camX + Math.cos(theta - 1) * radius;
    }

    lookY = camY + height;
    lookZ = camZ + Math.sin(theta) * radius;

    tarLookPos[0] = lookX;
    tarLookPos[1] = lookY;
    tarLookPos[2] = lookZ;

    console.log('Looking at ', tarLookPos[0], tarLookPos[1], tarLookPos[2]);
}

function draw(gl, u_ViewMatrix, viewMatrix, currentAngle) {
    //==============================================================================

    // Clear <canvas> color AND DEPTH buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Using OpenGL/ WebGL 'viewports':
    // these determine the mapping of CVV to the 'drawing context',
    // (for WebGL, the 'gl' context describes how we draw inside an HTML-5 canvas)
    // Details? see
    //
    //  https://www.khronos.org/registry/webgl/specs/1.0/#2.3
    // Draw in the FIRST of several 'viewports'
    //------------------------------------------
    // CHANGE from our default viewport:
    // gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);


    // Draw in the SECOND of several 'viewports'
    //------------------------------------------
    // gl.viewport(gl.drawingBufferWidth / 2, // Viewport lower-left corner
    //   0, // location(in pixels)
    //   gl.drawingBufferWidth / 2, // viewport width, height.
    //   gl.drawingBufferHeight / 2);
    //
    // // but use a different 'view' matrix:
    // viewMatrix.setLookAt(-g_EyeX, g_EyeY, g_EyeZ, // eye position
    //   g_LookAtX, g_LookAtY, g_LookAtZ, // look-at point
    //   0, 1, 0); // up vector
    //
    // // Pass the view projection matrix to our shaders:
    // gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    //
    // // Draw the scene:
    // drawMyScene(gl, u_ViewMatrix, viewMatrix, currentAngle);

    // Draw in the THIRD of several 'viewports'
    //------------------------------------------
    gl.viewport(0, // Viewport lower-left corner
        0, // location(in pixels)
        gl.drawingBufferWidth, // viewport width, height.
        gl.drawingBufferHeight);
    viewMatrix.setPerspective(30, ar, 1, 100);
    rotateCam(angle, height, tarCamPos[0], tarCamPos[1], tarCamPos[2]);
    // but use a different 'view' matrix:
    viewMatrix.setLookAt(camPos[0], camPos[1], camPos[2],
        lookPos[0], lookPos[1], lookPos[2],
        0, 1, 0); // 'up' vector.

    // Pass the view projection matrix to our shaders:
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    // Draw the scene:
    drawMyScene(gl, u_ViewMatrix, viewMatrix, currentAngle);

    //4th

    // gl.viewport(gl.drawingBufferWidth / 2 , // Viewport lower-left corner
    //   gl.drawingBufferHeight / 2, // (x,y) location(in pixels)
    //   gl.drawingBufferWidth / 2, // viewport width, height.
    //   gl.drawingBufferHeight / 2);
    //
    // // Set the matrix to be used for to set the camera view
    // viewMatrix.setLookAt(g_EyeY, -g_EyeX , g_EyeZ, // eye position
    //   g_LookAtX, g_LookAtY, g_LookAtZ, // look-at point (origin)
    //   0, 1, 0); // up vector (+y)
    //
    // // Pass the view projection matrix
    // gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    //
    // // Draw the scene:
    // drawMyScene(gl, u_ViewMatrix, viewMatrix, currentAngle);

}

function drawMyScene(myGL, myu_ViewMatrix, myViewMatrix, currentAngle) { //===============================================================================
    // Called ONLY from within the 'draw()' function
    // Assumes already-correctly-set View matrix and Proj matrix;
    // draws all items in 'world' coords.

    // DON'T clear <canvas> or you'll WIPE OUT what you drew
    // in all previous viewports!
    // myGL.clear(gl.COLOR_BUFFER_BIT);
    // Draw the 'forest' in the current 'world' coord system:
    // (where +y is 'up', as defined by our setLookAt() function call above...)
    myGL.drawArrays(myGL.TRIANGLES, // use this drawing primitive, and
        forestStart / floatsPerVertex, // start at this vertex number, and
        forestVerts.length / floatsPerVertex); // draw this many vertices.

    // Rotate to make a new set of 'world' drawing axes:
    // old one had "+y points upwards", but
    myViewMatrix.rotate(-90.0, 1, 0, 0); // new one has "+z points upwards",
    // made by rotating -90 deg on +x-axis.
    // Move those new drawing axes to the
    // bottom of the trees:
    myViewMatrix.translate(-2.0, 2.0, -0.6);
    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    myGL.drawArrays(myGL.TRIANGLES, tetraStart / floatsPerVertex, tetraVerts.length / floatsPerVertex);

    myViewMatrix.translate(2, 2.0, -0.6);
    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    myGL.drawArrays(myGL.TRIANGLE_STRIP, sphereStart / floatsPerVertex, sphVerts.length / floatsPerVertex);

    myViewMatrix.translate(0, 5, 0);
    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    myGL.drawArrays(myGL.TRIANGLE_STRIP, cylStart / floatsPerVertex, cylVerts.length / floatsPerVertex);


    //GND
    myViewMatrix.translate(0.0, 0.0, -0.6);
    myViewMatrix.scale(0.4, 0.4, 0.4); // shrink the drawing axes
    //for nicer-looking ground-plane, and
    // Pass the modified view matrix to our shaders:

    myGL.drawArrays(myGL.LINES,
        lineStart / floatsPerVertex,
        lineVerts.length / floatsPerVertex);

    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    // Now, using these drawing axes, draw our ground plane:
    myGL.drawArrays(myGL.LINES, // use this drawing primitive, and
        gndStart / floatsPerVertex, // start at this vertex number, and
        gndVerts.length / floatsPerVertex); // draw this many vertices




    //Robot
    myViewMatrix.scale(3, 3, 6);
    myViewMatrix.rotate(90, 1, 0, 0);
    myViewMatrix.translate(2, 0, 5);
    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    myGL.drawArrays(myGL.TRIANGLE_FAN, robotStart / floatsPerVertex, robotVerts.length / floatsPerVertex);


    myViewMatrix.translate(0.12, 0.35, 0);
    myViewMatrix.scale(0.6, 0.6, 0.6);
    myViewMatrix.translate(-0.1, 0, 0);
    myViewMatrix.rotate(-.5 * currentAngle, 0, 0);

    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    myGL.drawArrays(myGL.TRIANGLE_FAN, robotStart / floatsPerVertex, robotVerts.length / floatsPerVertex);


    myViewMatrix.translate(0.12, 0.5, 0.0);

    pushMatrix(myViewMatrix);

    myViewMatrix.rotate(-25.0 + 0.5 * currentAngle, 0, 0, 1);
    myViewMatrix.scale(0.4, 0.4, 0.4);
    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    myGL.drawArrays(myGL.TRIANGLE_FAN, robotStart / floatsPerVertex, robotVerts.length / floatsPerVertex);

    myViewMatrix.translate(0.1, 0.5, 0.0);
    myViewMatrix.rotate(40.0, 0, 0, 1);
    myViewMatrix.translate(-0.1, 0.0, 0.0);

    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    myGL.drawArrays(myGL.TRIANGLE_FAN, robotStart / floatsPerVertex, robotVerts.length / floatsPerVertex);

    myViewMatrix = popMatrix();
    myViewMatrix.rotate(25.0 - 0.5 * currentAngle, 0, 0, 1);
    myViewMatrix.scale(0.4, 0.4, 0.4);
    myViewMatrix.translate(-0.2, 0, 0);
    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    myGL.drawArrays(myGL.TRIANGLE_FAN, robotStart / floatsPerVertex, robotVerts.length / floatsPerVertex);

    myViewMatrix.translate(0.1, 0.5, 0.0);
    myViewMatrix.rotate(-40.0, 0, 0, 1);
    myViewMatrix.translate(-0.1, 0.0, 0.0);

    myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
    myGL.drawArrays(myGL.TRIANGLE_FAN, robotStart / floatsPerVertex, robotVerts.length / floatsPerVertex);


}

var g_last = Date.now();


function animate(angle) {
    //==============================================================================
    // Calculate the elapsed time
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    // Update the current rotation angle (adjusted by the elapsed time)
    //  limit the angle to move smoothly between +20 and -85 degrees:
    if (angle > 20.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
    if (angle < -105.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;

    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle %= 360;
}

function moreCCW() {
    //==============================================================================

    ANGLE_STEP += 10;
}

function lessCCW() {
    //==============================================================================
    ANGLE_STEP -= 10;
}
'use strict';

const vertexSource = `#version 100
precision highp float;
attribute vec2 inCoord;
varying vec2 position;
uniform vec2 windowSize;

void main() {
    position = inCoord * windowSize / max(windowSize.x, windowSize.y);
    gl_Position = vec4(inCoord, 0.0, 1.0);
}
`;

const fragmentSource = `varying vec2 position;
uniform float time;
uniform sampler2D texture0;

void main() {
    gl_FragColor = vec4(
	hsl2rgb(
	    vec3(fract(atan(position.y, position.x)/3.14159/2.0*10.0 + time/10.0),
		 1.0-length(position)/1.0,
		 0.5)),
	1.0);
}
`;

const hsl2rgbSource = `#version 100
precision highp float;

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
	hue += 1.0;
    else if (hue > 1.0)
	hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
	res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
	res = f2;
    else if ((3.0 * hue) < 2.0)
	res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
	res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;

    if (hsl.y == 0.0) {
	rgb = vec3(hsl.z); // Luminance
    } else {
	float f2;

	if (hsl.z < 0.5)
	    f2 = hsl.z * (1.0 + hsl.y);
	else
	    f2 = hsl.z + hsl.y - hsl.y * hsl.z;

	float f1 = 2.0 * hsl.z - f2;

	rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
	rgb.g = hue2rgb(f1, f2, hsl.x);
	rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
    }
    return rgb;
}`

class Renderer {
    constructor(canvas, vertEditor, fragEditor) {
	this.canvas = canvas;
	this.vertexEditor = vertEditor;
	this.fragmentEditor = fragEditor;
	this.gl = null;
	this.quad = null;
	this.program = null;
	this.textures = [null];

	if (!this.setupWebGL()) {
	    return;
	}
	this.fetchTexture(0, "tkoaly.png");

	if (!this.createQuad()) {
	    return;
	}
	if (!this.createShader()) {
	    return;
	}
	this.vertexEditor.addEventListener('input', this.handleShaderUpdate.bind(this));
	this.fragmentEditor.addEventListener('input', this.handleShaderUpdate.bind(this));
	window.requestAnimationFrame(this.draw.bind(this));
    }
    
    setupWebGL() {
	this.canvas.width = this.canvas.clientWidth;
	this.canvas.height = this.canvas.clientHeight;
	this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
	if (!this.gl) {
	    const err = 'Failed to acquire GL rendering context';
	    document.getElementById('errors').innerHTML = err;
	    console.error(err);
	    return false;
	}
	this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
	this.gl.clearColor(1.0, 0.0, 1.0, 1.0);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	document.getElementById('errors').innerHTML = 'WebGL setup done.';
	return !this.checkErrors();
    }

    createQuad() {
	var verts = [
	    1.0,  1.0, -1.0,  1.0, -1.0, -1.0,
		-1.0, -1.0, 1.0, -1.0, 1.0,  1.0
	];
	this.quad = this.gl.createBuffer();
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quad);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verts), this.gl.STATIC_DRAW);
	return !this.checkErrors();
    }

    createShader() {
	if (this.program) {
	    this.gl.useProgram(null);
	    this.gl.deleteProgram(this.program);
	    this.program = null;
	}

	var vertexSource = this.vertexEditor.value;
	var vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
	this.gl.shaderSource(vertexShader, vertexSource);
	this.gl.compileShader(vertexShader);
	var vertexLog = this.gl.getShaderInfoLog(vertexShader);
	
	var fragmentSource = this.fragmentEditor.value;
	var fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
	this.gl.shaderSource(fragmentShader, hsl2rgbSource + fragmentSource);
	this.gl.compileShader(fragmentShader);
	var fragmentLog = this.gl.getShaderInfoLog(fragmentShader);
	
	this.program = this.gl.createProgram();
	this.gl.attachShader(this.program, vertexShader);
	this.gl.attachShader(this.program, fragmentShader);
	this.gl.linkProgram(this.program);

	this.gl.detachShader(this.program, vertexShader);
	this.gl.detachShader(this.program, fragmentShader);
	this.gl.deleteShader(vertexShader);
	this.gl.deleteShader(fragmentShader);

	if (this.checkErrors()) {
	    return false;
	}
	this.gl.validateProgram(this.program);
	if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
	    var log = this.gl.getProgramInfoLog(this.program) + '\n' + vertexLog + '\n' + fragmentLog;
	    var err = "Compiling shaders failed: " + log;
	    document.getElementById("errors").innerHTML = err;
	    console.error(err);
	    return false;
	}
	document.getElementById("errors").innerHTML = 'Shader OK';
	serialize();
	return true;
    }

    fetchTexture(index, url) {
	var texture = this.gl.createTexture();
	var image = new Image();
	image.onload = () => {
	    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
	    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
	    //this.gl.generateMipmap(this.gl.TEXTURE_2D);
	    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
	    //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
	    //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
	    //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
	    this.textures[index] = texture;
	};
	image.src = url;
    }

    checkErrors() {
	var err = this.gl.getError();
	if (err != this.gl.NO_ERROR) {
	    console.log('GL Error: ' + err);
	    return true;
	}
	return false;
    }

    draw(timestamp) {
	document.getElementById('time').innerHTML = timestamp;
	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	
	this.gl.useProgram(this.program);
	var posAttribute = this.gl.getAttribLocation(this.program, 'inCoord');
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quad);
	this.gl.vertexAttribPointer(posAttribute, 2, this.gl.FLOAT, false, 0, 0);
	this.gl.enableVertexAttribArray(posAttribute);
	var timeAttribute = this.gl.getUniformLocation(this.program, 'time');
	if (timeAttribute) {
	    this.gl.uniform1f(timeAttribute, timestamp/1000.0);
	}

	var textureAttribute = this.gl.getUniformLocation(this.program, 'texture0');
	if (textureAttribute && this.textures[0]) {
	    this.gl.activeTexture(this.gl.TEXTURE0);
	    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[0]);
	    this.gl.uniform1i(textureAttribute, 0);
	}

	var windowSizeAttribute = this.gl.getUniformLocation(this.program, 'windowSize');
	if (windowSizeAttribute) {
	    this.gl.uniform2f(windowSizeAttribute, this.canvas.width, this.canvas.height);
	}
	
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

	if (!this.checkErrors()) {
	    window.requestAnimationFrame(this.draw.bind(this));
	}
    }

    handleShaderUpdate(event) {
	if (this.shaderUpdateTimer) {
	    clearTimeout(this.shaderUpdateTimer);
	}
	this.shaderUpdateTimer = setTimeout(this.runShaderUpdate.bind(this), 1000);
    }

    runShaderUpdate(event) {
	this.shaderUpdateTimer = null;
	if (this.createShader()) {
	    window.requestAnimationFrame(this.draw.bind(this));
	}
    }
}

function selectShader(event) {
    if (event.target.classList.contains('selected')) return;
    for (let b of document.querySelectorAll('#editor-select button')) {
	b.classList.toggle('selected');
    }
    for (let b of document.querySelectorAll('#editor textarea')) {
	b.classList.toggle('hidden');
    }    
}

function shaderName() {
    if (window.location.hash && /^[a-zA-Z0-9]+$/.test(window.location.hash)) {
	return window.location.hash;
    }
    return 'default';
}

function serializedData() {
    var vertexSource = document.getElementById('vertex-shader').value;
    var fragmentSource = document.getElementById('fragment-shader').value;
    var data = {
	'vertex': vertexSource,
	'fragment': fragmentSource,
    };
    return JSON.stringify(data, null, 2);
}

function serialize() {
    var data = serializedData();
    var dl = document.getElementById('download');
    var file = new Blob([data], {type: 'application/json'});
    dl.href = URL.createObjectURL(file);
    dl.classList.remove('hidden');
    localStorage.setItem(shaderName(), data);
}

function deserialize() {
    var str = localStorage.getItem(shaderName());
    if (str) {
	var data = JSON.parse(str);
	document.getElementById('vertex-shader').value = data['vertex'];
	document.getElementById('fragment-shader').value = data['fragment'];
    } else {
	document.getElementById('vertex-shader').value = vertexSource;
	document.getElementById('fragment-shader').value = fragmentSource;
    }
}

function setup(event) {
    window.removeEventListener(event.type, setup, false);
    deserialize();
    var canvas = document.getElementById('quad');
    new Renderer(canvas, document.getElementById('vertex-shader'), document.getElementById('fragment-shader'));
    document.getElementById('select-vertex').addEventListener('click', selectShader);
    document.getElementById('select-fragment').addEventListener('click', selectShader);
}
window.addEventListener('load', setup, false);

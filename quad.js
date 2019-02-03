'use strict';

class Renderer {
    constructor(canvas) {
	this.canvas = canvas;
	this.vertexSource = null;
	this.fragmentSource = null;
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
    }

    setShaders(vertex, fragment) {
	this.vertexSource = vertex;
	this.fragmentSource = fragment;
	this.checkResources();
    }

    checkResources() {
	var hasAll = true;
	if (!this.vertexSource) {
	    hasAll = false;
	}
	if (!this.fragmentSource) {
	    hasAll = false;
	}
	for (var texture of this.textures) {
	    if (!texture) {
		hasAll = false;
	    }
	}
	if (hasAll && this.createShader()) {
	    window.requestAnimationFrame(this.draw.bind(this));
	}
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

	var vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
	this.gl.shaderSource(vertexShader, this.vertexSource);
	this.gl.compileShader(vertexShader);
	var vertexLog = this.gl.getShaderInfoLog(vertexShader);
	
	var fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
	this.gl.shaderSource(fragmentShader, this.fragmentSource);
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
	    this.checkResources();
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
    if (window.location.hash && /^#[a-zA-Z0-9]+$/.test(window.location.hash)) {
	return window.location.hash.substring(1);
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
    dl.download = shaderName() + '.json';
    dl.classList.remove('hidden');
    localStorage.setItem(shaderName(), data);
}

function fetchShader(name) {
    return fetch(name).then(response => {
	if (!response.ok) {
	    throw new Error('HTTP error ' + response.status + ' ' + response.statusText);
	}
	return response.json();
    })
}

function shaderToEditor(shader) {
    document.getElementById('vertex-shader').value = shader['vertex'];
    document.getElementById('fragment-shader').value = shader['fragment'];
}

function deserialize() {
    var name = shaderName();
    var str = localStorage.getItem(name);
    if (str) {
	shaderToEditor(JSON.parse(str));
	return new Promise(function(resolve, reject) {
	    resolve();
	});
    }
    return fetchShader(name + '.json')
	.then(data => shaderToEditor(data))
	.catch(err => {
	    fetchShader('default.json')
		.then(data => shaderToEditor(data))
		.catch(err => 'Failed to load shaders: ' + err)
		    });
}

class ReferredUpdate {
    constructor(update) {
	this.update = update;
	this.timer = null;
    }

    update(event) {
	if (this.timer) {
	    clearTimeout(this.timer);
	}
	this.shaderUpdateTimer = setTimeout(this.updateNow.bind(this), 1000);
    }

    updateNow(event) {
	this.timer = null;
	this.update();
    }
}

function error(err) {
    document.getElementById("errors").innerHTML = err;
    console.error(err);
}

function setup(event) {
    window.removeEventListener(event.type, setup, false);
    var canvas = document.getElementById('quad');
    var renderer = new Renderer(canvas);
    var shaderUpdate = new ReferredUpdate(() => {
	renderer.setShaders(document.getElementById('vertex-shader').value,
			    document.getElementById('fragment-shader').value);
    });
    deserialize().then(shaderUpdate.updateNow.bind(shaderUpdate));
    document.getElementById('vertex-shader').addEventListener('input', shaderUpdate.update.bind(shaderUpdate));
    document.getElementById('fragment-shader').addEventListener('input', shaderUpdate.update.bind(shaderUpdate));
    document.getElementById('select-vertex').addEventListener('click', selectShader);
    document.getElementById('select-fragment').addEventListener('click', selectShader);
}
window.addEventListener('load', setup, false);

TARGET=${HOME}/www/shaders

all: compile deploy

compile: quad_compiled.js

quad_compiled.js: quad.js
	closure-compiler --language_in ECMASCRIPT6 --js $^ --js_output_file $@

deploy: index.html style.css default.json quad_compiled.js
	mkdir -p ${TARGET}/shader
	cp index.html style.css ${TARGET}/.
	cp default.json ${TARGET}/shader/.
	cp quad_compiled.js ${TARGET}/quad.js

.PHONY: all compile deploy

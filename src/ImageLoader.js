// Effect Games Engine v1.0
// Copyright (c) 2005 - 2011 Joseph Huckaby
// Source Code released under the MIT License: 
// http://www.opensource.org/licenses/mit-license.php

////
// ImageLoader.js
// Preloads images and tracks progress
////

function _ImageLoader() {
	// class constructor
	this._images = {};
	this._shortcuts = {};
	this._baseProgress = 0;
	
	this._dynaLoader = {};
	this._maxPriorityLevels = 4;
	this._maxLoadsPerFrame = 32;
};

_ImageLoader.prototype.setMaxLoadsPerFrame = function(_num) { this._maxLoadsPerFrame = _num; };

_ImageLoader.prototype.loadImages = function(_obj) {
	// queue one or more images for loading
	var _list = _always_array(_obj);
	var _zImagePath = gGame.getGamePath();
	var _count = 0;
	
	// step through each image in list
	for (var _idx = 0; _idx < _list.length; _idx++) {
		var _url = _list[_idx];
		var _key = _url;
		
		// make sure image isn't already loaded
		if (!this._images[_key]) {
			
			var _image = {
				loaded: false,
				img: new Image()
			};
		
			// shortcut using image filename sans extension
			var _shortcut = _key.replace(/\?.+$/, '').replace(/^(.+)\/([^\/]+)$/, '$2').replace(/\.\w+$/, '');
			this._shortcuts[_shortcut] = _image;
			
			if (gGame._standalone) {
				if (_url.match(/\?sprite\=([^\&]+)/)) {
					_url = 'sprites/' + RegExp.$1 + _url;
				}
				else {
					_url = 'assets' + _url;
				}
				
				if (gGame._envName) {
					_url = 'environments/' + gGame._envName + '/' + _url;
				} // env
				
				// handle overlays
				_url = _url.replace(/[\?\&]overlay\=/g, '-');
				
				// handle format conversion (ie6 gif)
				if (_url.match(/[\?\&]format\=(\w+)/)) {
					var _fmt = RegExp.$1;
					_url = _url.replace(/\.\w+(\?|\&|$)/, '.' + _fmt + '$1');
				}
				
				_url = _url.replace(/[\?\&].*$/, ''); // strip query
				
				debugstr("Loading image: " + _url);
			
				_image.img.onerror = function() {
					_throwError("Failed to load image: " + this.src);
				};
				_image.img.src = _url;
			} // standalone image
			else {
				// look for comrpessed style URL
				if (_url.match(/[\?\&]g\=/)) {
					// add compressed zoom, skip asset mod and ttl
					_url += (_url.match(/\?/) ? '&' : '?') + 'z=' + gPort._zoomLevel + gGame._def.ZoomFilter.substring(0,2);
				}
				else {
					// add zoom
					_url += (_url.match(/\?/) ? '&' : '?') + 'zoom=' + gPort._zoomLevel;
					_url += (_url.match(/\?/) ? '&' : '?') + 'zoom_filter=' + gGame._def.ZoomFilter;
				
					// add environment
					if (gGame._envName) {
						_url += (_url.match(/\?/) ? '&' : '?') + 'env=' + gGame._envName;
					}
			
					// asset mod date
					_url += (_url.match(/\?/) ? '&' : '?') + 'mod=' + gGame._assetModDate;
			
					// ttl adjust
					_url += (_url.match(/\?/) ? '&' : '?') + 'ttl=static';
				}
			
				debugstr("Loading image: " + _url);
			
				_image.img._retries = 5;
				// _image.img._key = _key;
				_image.img.onerror = function() {
					Debug.trace('image', "Error loading image: " + this.src);
					this._retries--;
					if (this._retries > 0) {
						Debug.trace('image', this._retries + " retries left, trying again NOW");
						 this.src = this.src.replace(/\&rt\=\d+/, '') + '&rt=' + this._retries;
						// gImageLoader._reloadSelected([ this._key ]);
						// var _img = this;
						// setTimeout( function() { _img.src = _img.src.replace(/\&rt\=\d+/, '') + '&rt=' + _img._retries; }, 1000 );
					}
					else {
						_throwError("Failed to load image: " + this.src);
					}
				};
				_image.img.src = _url.match(/^\w+\:\/\//) ? _url : (_zImagePath + _url);
			} // effect image
			
			this._images[_key] = _image;
			
			_count++;
		} // unique
	} // foreach image
	
	return _count;
};

_ImageLoader.prototype.reloadAll = function() {
	// reload ALL images (probably for re-zoom)
	var _list = _hash_keys_to_array( this._images );
	this._images = {};
	this._baseProgress = 0;
	this._dynaLoader = {};
	return this.loadImages( _list );
};

_ImageLoader.prototype._reloadSelected = function(_list) {
	// reload selected list of images (probably for env switch)
	for (var _idx = 0, _len = _list.length; _idx < _len; _idx++) {
		var _url = _list[_idx];
		if (this._images[_url]) {
			delete this._images[_url];
			this._baseProgress--;
		}
	}
	this._dynaLoader = {};
	return this.loadImages( _list );
};

_ImageLoader.prototype._getLoadProgress = function() {
	// check image loading progress
	// result will be between 0.0 and 1.0
	if ((_num_keys(this._images) - this._baseProgress) == 0) return 1.0;
	var _numLoaded = 0;
	
	for (var _url in this._images) {
		if (this._images[_url].loaded) _numLoaded++;
		else {
			var _image = this._images[_url];
			var _img = _image.img;
			if (typeof(_img.complete) != 'undefined') {
				// good, browser supports 'complete' parameter
				if (_img.complete) {
					_image.loaded = true;
					_numLoaded++;
				}
			}
			else {
				// ugh, probably safari -- must check image width
				if (_img.width > 0) {
					_image.loaded = true;
					_numLoaded++;
				}
			}
		}
	}
	
	return ((_numLoaded - this._baseProgress) / (_num_keys(this._images) - this._baseProgress));
};

_ImageLoader.prototype._resetProgress = function() {
	// set current state as zero progress, for subsequent
	// loads of additional content
	this._baseProgress = _num_keys(this._images);
};

_ImageLoader.prototype.reset = function() {
	// clear all images and reset state
	// used when zoom is changed
	this._images = {};
	this._baseProgress = 0;
};

_ImageLoader.prototype.lookupImage = function(_url) {
	// lookup an image object by its partial url
	return this._images[_url] || this._shortcuts[_url.replace(/^(.+)\/([^\/]+)$/, '$2').replace(/\.\w+$/, '')];
};

_ImageLoader.prototype.getImageSize = function(_url) {
	// get unzoomed image size for any loaded image
	var _image = this.lookupImage(_url);
	if (!_image || !_image.loaded) return { width:0, height:0 };
	var _img = _image.img;
	return {
		width: _img.width / gPort._zoomLevel,
		height: _img.height / gPort._zoomLevel
	};
};

_ImageLoader.prototype.getImageTag = function(_url, _attribs) {
	// get HTML image tag for image
	var _image = this.lookupImage(_url);
	if (!_image || !_image.loaded) return '';
	var _img = _image.img;
	return '<img src="'+_img.src+'" width="'+_img.width+'" height="'+_img.height+'" border="0" '+_compose_attribs(_attribs)+'/>';
};

_ImageLoader.prototype.getImageURL = function(_url) {
	// get full URL to image given partial URI (ID)
	var _image = this.lookupImage(_url);
	if (!_image || !_image.loaded) return '';
	return _image.img.src;
};

_ImageLoader.prototype.dynaLoad = function(_imgID, _url, _priority) {
	// schedule image for loading
	// priority should be between 0.0 and 1.0
	if (!_priority) _priority = 1.0;
	else if (_priority > 1.0) _priority = 1.0;
	else if (_priority < 0.0) _priority = 0.0;
	
	var _pIdx = parseInt( _priority * this._maxPriorityLevels, 10 );
	
	// debugstr("dynaLoad: queuing image for async load: p" + _pIdx + ": " + _imgID + ": " + _url);
	
	// if (!this._dynaLoader[pIdx]) this._dynaLoader[pIdx] = {};
	// this._dynaLoader[pIdx][imgID] = url;
	this._dynaLoader[_imgID] = [ _pIdx, _url ];
};

_ImageLoader.prototype._dynaIdle = function(_auto) {
	// dynamically load images as needed
	this._dynaTimeout = null;
	var _count = 0;
	// var zImagePath = gGame.getGamePath();
	if (!_first_key(this._dynaLoader)) return;

	for (var _pIdx = 0, _len = this._maxPriorityLevels; _pIdx <= _len; _pIdx++) {
		// debugstr("dynaIdle: scanning for p" + _pIdx);
		var _toDelete = [];
		for (var _imgID in this._dynaLoader) {
			if (this._dynaLoader[_imgID][0] == _pIdx) {
				if (_count < this._maxLoadsPerFrame) {
					var _img = el(_imgID);
					assert(_img, "Cannot find image: " + _imgID);
					
					var _path = this._dynaLoader[_imgID][1];
					// debugstr("dynaIdle: loading image now: p" + _pIdx + ": " + _imgID + ": " + _path);
					_img.src = _path.match(/^\w+\:\/\//) ? _path : this.getImageURL(_path);
					
					_count++;
					_toDelete.push( _imgID );
				}
				else {
					// debugstr("dynaIdle: maxed out for this frame, skipping rest");
					_pIdx = this._maxPriorityLevels + 1;
					break;
				}
			} // priority matches
		} // foreach image
		for (var _idy = 0, _ley = _toDelete.length; _idy < _ley; _idy++) {
			delete this._dynaLoader[ _toDelete[_idy] ];
		}
	} // priority loop
	
	if (_auto && _first_key(this._dynaLoader) && !this._dynaTimeout) {
		this._dynaTimeout = setTimeout( function() { gGame._imageLoader._dynaIdle(true); }, 33 );
	}
};

_ImageLoader.prototype._dynaClear = function(_str) {
	// remove images from queue, based on substring match (starts with)
	var _toDelete = [];
		
	for (var _imgID in this._dynaLoader) {
		if (_imgID.indexOf(_str) == 0) _toDelete.push(_imgID);
	} // foreach image
		
	for (var _idx = 0, _len = _toDelete.length; _idx < _len; _idx++) {
		delete this._dynaLoader[ _toDelete[_idx] ];
	}
};

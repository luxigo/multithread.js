!function() {

	var URL = window.URL || window.webkitURL;
	if(!URL) {
		throw new Error('This browser does not support Blob URLs');
	}

	if(!window.Worker) {
		throw new Error('This browser does not support Web Workers');
	}

	function Multithread(threads) {
		this.threads = Math.max(2, threads | 0);
		this._queue = [];
		this._queueSize = 0;
		this._activeThreads = 0;
		this._debug = {
			start: 0,
			end: 0,
			time: 0
		};
	}

	Multithread.prototype._worker = {
		JSON: function() {
			var /**/name/**/ = (/**/func/**/);
			self.addEventListener('message', function(e) {
				var data = e.data;
				var view = new DataView(data);
				var len = data.byteLength;
				var str = Array(len);
				for(var i=0;i<len;i++) {
					str[i] = String.fromCharCode(view.getUint8(i));
				}
				var args = JSON.parse(str.join(''));
				var value = (/**/name/**/).apply(/**/name/**/, args);
				try {
					data = JSON.stringify(value);
				} catch(e) {
					throw new Error('Parallel function must return JSON serializable response');
				}
				len = typeof(data)==='undefined'?0:data.length;
				var buffer = new ArrayBuffer(len);
				view = new DataView(buffer);
				for(i=0;i<len;i++) {
					view.setUint8(i, data.charCodeAt(i) & 255);
				}
				self.postMessage(buffer, [buffer]);
				self.close();
			})
		},
		Int32: function() {
			var /**/name/**/ = (/**/func/**/);
			self.addEventListener('message', function(e) {
				var data = e.data;
				var view = new DataView(data);
				var len = data.byteLength / 4;
				var arr = Array(len);
				for(var i=0;i<len;i++) {
					arr[i] = view.getInt32(i*4);
				}
				var value = (/**/name/**/).apply(/**/name/**/, arr);
				if(!(value instanceof Array)) { value = [value]; }
				len = value.length;
				var buffer = new ArrayBuffer(len * 4);
				view = new DataView(buffer);
				for(i=0;i<len;i++) {
					view.setInt32(i*4, value[i]);
				}
				self.postMessage(buffer, [buffer]);
				self.close();
			})
		},
		Float64: function() {
			var /**/name/**/ = (/**/func/**/);
			self.addEventListener('message', function(e) {
				var data = e.data;
				var view = new DataView(data);
				var len = data.byteLength / 8;
				var arr = Array(len);
				for(var i=0;i<len;i++) {
					arr[i] = view.getFloat64(i*8);
				}
				var value = (/**/name/**/).apply(/**/name/**/, arr);
				if(!(value instanceof Array)) { value = [value]; }
				len = value.length;
				var buffer = new ArrayBuffer(len * 8);
				view = new DataView(buffer);
				for(i=0;i<len;i++) {
					view.setFloat64(i*8, value[i]);
				}
				self.postMessage(buffer, [buffer]);
				self.close();
			})
		},
		buffer: function() {
			var /**/name/**/ = (/**/func/**/);
			self.addEventListener('message', function(e){
				var buffer=(/**/name/**/).apply(/**/name/**/, [e.data]);
				self.postMessage(buffer, [buffer]);
				self.close();
			})
		},
		transferrable: function(){
			var /**/name/**/ = (/**/func/**/);
			self.addEventListener('message', function(e){
				var reply=(/**/name/**/).apply(/**/name/**/, [e.data]);
				self.postMessage(reply[0], reply[1]);
				self.close();
			})
		}

	};

	Multithread.prototype._encode = {
		JSON: function(args) {
			try {
				var data = JSON.stringify(args);
			} catch(e) {
				throw new Error('Arguments provided to parallel function must be JSON serializable');
			}
			len = data.length;
			var buffer = new ArrayBuffer(len);
			var view = new DataView(buffer);
			for(var i=0;i<len;i++) {
				view.setUint8(i, data.charCodeAt(i) & 255);
			}
			return buffer;
		},
		Int32: function(args) {
			len = args.length;
			var buffer = new ArrayBuffer(len*4);
			var view = new DataView(buffer);
			for(var i=0;i<len;i++) {
				view.setInt32(i*4, args[i]);
			}
			return buffer;
		},
		Float64: function(args) {
			len = args.length;
			var buffer = new ArrayBuffer(len*8);
			var view = new DataView(buffer);
			for(var i=0;i<len;i++) {
				view.setFloat64(i*8, args[i]);
			}
			return buffer;
		}
	};

	Multithread.prototype._decode = {
		JSON: function(data) {
			var view = new DataView(data);
			var len = data.byteLength;
			var str = Array(len);
			for(var i=0;i<len;i++) {
				str[i] = String.fromCharCode(view.getUint8(i));
			}
			if(!str.length) {
				return;
			} else {
				return JSON.parse(str.join(''));
			}
		},
		Int32: function(data) {
			var view = new DataView(data);
			var len = data.byteLength / 4;
			var arr = Array(len);
			for(var i=0;i<len;i++) {
				arr[i] = view.getInt32(i*4);
			}
			return arr;
		},
		Float64: function(data) {
			var view = new DataView(data);
			var len = data.byteLength / 8;
			var arr = Array(len);
			for(var i=0;i<len;i++) {
				arr[i] = view.getFloat64(i*8);
			}
			return arr;
		},
	};

	Multithread.prototype._execute = function(options){
		if(!this._activeThreads) {
			this._debug.start = (new Date).valueOf();
		}
		if(this._activeThreads < this.threads) {
			this._activeThreads++;
			var t = (new Date()).valueOf();
			var worker = new Worker(options.url);
			var msg = this._encode[options.type] ? this._encode[options.type](options.args) : options.args[0];
			var decode = this._decode[options.type];
			var self = this;
			var onmessage;

			switch(options.type){

				case'JSON':
					onmessage = function(e){
						options.callback.call(self, decode(e.data));
						self.ready();
					};
					break;

				default:
					onmessage = function(e){
						options.callback.apply(self, decode ? decode(e.data) : [e.data]);
						self.ready();
					};
					break;
			}

			if (options.onerror) {
				worker.addEventListener('error', options.onerror);
			}

			worker.addEventListener('message', options.onmessage || onmessage);

			if (options.type == 'transferrable') {
				worker.postMessage(msg, options.args[1]);
			} else {
				worker.postMessage(msg, [msg]);
			}

		} else {
			this._queueSize++;
			this._queue.push(options);
		}
	};

	Multithread.prototype.ready = function() {
		this._activeThreads--;
		if(this._queueSize) {
			this._execute.apply(this, [this._queue.shift()]);
			this._queueSize--;
		} else if(!this._activeThreads) {
			this._debug.end = (new Date).valueOf();
			this._debug.time = this._debug.end - this._debug.start;
		}
	};

	Multithread.prototype._prepare=function(worker, type){

		worker=worker; //??

		var name = worker.name;
		var workerString = worker.toString();
		if(!name) {
			name = '$' + ((Math.random()*10)|0);
			while (workerString.indexOf(name) !== -1) {
				name += ((Math.random()*10)|0);
			}
		}

		var script = this._worker[type]
			.toString()
			.replace(/^.*?[\n\r]+/gi, '')
			.replace(/\}[\s]*$/, '')
			.replace(/\/\*\*\/name\/\*\*\//gi, name)
			.replace(/\/\*\*\/func\/\*\*\//gi, workerString);

		var workerURL = URL.createObjectURL(new Blob([script], {type:'text/javascript'}));

		return workerURL;

	};

	Multithread.prototype.process = function(options){

		var workerURL = this._prepare(options.worker, 'transferrable');
		var self = this;

		return function(){
			self._execute({
				url: workerURL,
				args: Array.prototype.slice.call(arguments),
				type: 'transferrable',
				callback: options.callback
			});
		};

	};

	Multithread.prototype.processJSON = function(options){

		var workerURL = this._prepare(options.worker, 'JSON');
		var self = this;

		return function(){
			self._execute({
				url: workerURL,
				args: Array.prototype.slice.call(arguments),
				type: 'JSON',
				callback: options.callback

			});
		};

	};

	Multithread.prototype.processInt32 = function(options){

		var workerURL = this._prepare(options.worker, 'Int32');
		var self = this;

		return function() {
			self._execute({
				url: workerURL,
				args: Array.prototype.slice.call(arguments),
				type: 'Int32',
				callback: options.callback
			});
		};

	};

	Multithread.prototype.processFloat64 = function(options){

		var workerURL = this._prepare(options.worker, 'Float64');
		var self = this;

		return function() {
			self._execute({
				url: workerURL,
				args: Array.prototype.slice.call(arguments),
				type: 'Float64',
				callback: options.callback
			});
		};

	};

	Multithread.prototype.processBuffer = function(options){

		var workerURL = this._prepare(options.worker, 'buffer');
		var self = this;

		return function() {
			self._execute({
				url: workerURL,
				args: Array.prototype.slice.call(arguments),
				type: 'buffer',
				callback: options.callback
			});
		};

	};

	window['Multithread'] = Multithread;

}();

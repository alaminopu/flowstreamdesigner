var TIDYUPWHITE = new RegExp(String.fromCharCode(160), 'g');

FUNC.makeid = function(type) {
	return type + Date.now().toString(36);
};

FUNC.trigger = function(el, data) {
	if (data && data.constructor !== Object)
		data = null;
	if (!data || typeof(data) !== 'object')
		data = {};
	setTimeout(function(id, data) {
		if (id && flow.data[id] && flow.data[id].connected) {
			data.TYPE = 'trigger';
			data.id = id;
			SETTER('websocket/send', data);
		}
	}, 10, el instanceof jQuery ? el.attrd2('id') : el, data);
	return data;
};

FUNC.send = function(msg, callback, loading) {
	loading && SETTER('loading/show');
	if (callback)
		msg.callback = callback;
	SETTER('websocket/send', msg);
};

FUNC.import = function(callback) {
	SET('importform @default', { callback: callback });
	SET('common.form', 'importform');
};

FUNC.rtrim = function(value) {
	var lines = value.split('\n');
	var reg = /\s+$/;
	for (var i = 0; i < lines.length; i++)
		lines[i] = lines[i].replace(reg, '');
	return lines.join('\n').replace(TIDYUPWHITE, ' ');
};

FUNC.strim = function(value) {

	var c = value.charAt(0);
	if (c !== ' ' && c !== '\t')
		return value;

	for (var i = 0; i < value.length; i++) {
		c = value.charAt(i);
		if (c !== ' ' && c !== '\t')
			break;
	}

	var count = i;
	var lines = value.split('\n');

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		if (line.length > count)
			lines[i] = line.substring(count);
	}

	return lines.join('\n');
};

(function() {

	var TABSCOUNT = function(val) {
		var count = 0;
		for (var i = 0; i < val.length; i++) {
			if (val.charAt(i) === '\t')
				count++;
			else
				break;
		}
		return count;
	};

	var TABS = function(count) {
		var str = '';
		for (var i = 0; i < count; i++)
			str += '\t';
		return str;
	};

	FUNC.wrapbracket = function(cm, pos) {

		var line = cm.getLine(pos.line);

		if (!(/(function|switch|else|with|if|for|while)\s\(/).test(line) || (/\w/).test(line.substring(pos.ch)))
			return;

		var tabs = TABSCOUNT(line);
		var lines = cm.lineCount();
		var plus = '';
		var nl;

		if (line.indexOf('= function') !== -1)
			plus = ';';
		else if (line.indexOf(', function') !== -1 || line.indexOf('(function') !== -1)
			plus = ');';

		if (pos.line + 1 >= lines) {
			// end of value
			cm.replaceRange('\n' + TABS(tabs + 1) + '\n' + TABS(tabs) + '}' + plus, pos, null, '+input');
			pos.line++;
			pos.ch = tabs + 1;
			cm.setCursor(pos);
			return true;
		}

		if (plus) {
			var lchar = line.substring(line.length - 2);

			if (lchar !== ');') {
				lchar = line.charAt(line.length - 1);
				if (lchar !== ';' && lchar !== ')')
					lchar = '';
			}

			if (lchar) {
				pos.ch = line.length - lchar.length;
				var post = {};
				post.line = pos.line;
				post.ch = line.length;
				cm.replaceRange('', pos, post, '+move');
			}
		}

		for (var i = pos.line + 1; i < lines; i++) {

			var cl = cm.getLine(i);
			var tc = TABSCOUNT(cl);

			if (tc <= tabs) {
				var nl = cl && cl.indexOf('}') === -1 ? true : false;
				pos.line = i - 1;
				pos.ch = 10000;
				cm.replaceRange('\n' + TABS(tabs) + '}' + plus + (nl ? '\n' : ''), pos, null, '+input');
				pos.ch = tabs.length;
				cm.setCursor(pos);
				return true;
			}
		}
	};
})();

FUNC.hex2rgba = function(hex, opacity) {

	var c = (hex.charAt(0) === '#' ? hex.substring(1) : hex).split('');

	if(c.length === 3)
		c = [c[0], c[0], c[1], c[1], c[2], c[2]];

	var a = c.splice(6);
	if (a.length)
		a = parseFloat(parseInt((parseInt(a.join(''), 16) / 255) * 1000) / 1000);
	else
		a = opacity || '1';

	c = '0x' + c.join('');
	return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + a + ')';
};

FUNC.rgba2hex = function(rgba) {
	var m = rgba.match(/\d+,(\s)?\d+,(\s)?\d+,(\s)?[.0-9]+/);
	if (m) {
		m = m[0].split(',').trim();

		var a = m[3];
		if (a) {
			if (a.charAt(0) === '.')
				a = '0' + a;
			a = a.parseFloat();
			a = ((a * 255) | 1 << 8).toString(16).slice(1);
		} else
			a = '';

		return '#' + ((m[0] | 1 << 8).toString(16).slice(1) + (m[1] | 1 << 8).toString(16).slice(1) + (m[2] | 1 << 8).toString(16).slice(1) + a).toUpperCase();

	} else
		return rgba;
};

FUNC.colorize = function(css, cls) {
	var lines = css.split('\n');
	var builder = [];

	var findcolor = function(val) {
		var color = val.match(/#[0-9A-F]{1,6}/i);
		if (color)
			return color + '';
		var beg = val.indexOf('rgba(');
		if (beg === -1)
			return;
		return val.substring(beg, val.indexOf(')', beg) + 1);
	};

	for (var i = 0; i < lines.length; i++) {

		var line = lines[i];

		if (!line) {
			builder.push('');
			continue;
		}

		var beg = line.indexOf('{');
		if (beg === -1)
			continue;

		var end = line.lastIndexOf('}');
		if (end === -1)
			continue;

		var cmd = line.substring(beg + 1, end).split(';');
		var cmdnew = [];

		for (var j = 0; j < cmd.length; j++) {
			var c = cmd[j].trim().split(':').trim();
			switch (c[0]) {
				case 'border':
				case 'border-left':
				case 'border-top':
				case 'border-right':
				case 'border-bottom':
				case 'outline':
					var color = findcolor(c[1]);
					if (color)
						cmdnew.push(c[0] + '-color: ' + color);
					break;
				case 'background':
				case 'border-left-color':
				case 'border-right-color':
				case 'border-top-color':
				case 'border-bottom-color':
				case 'border-color':
				case 'background-color':
				case 'outline-color':
				case 'color':
				case 'stroke':
				case 'fill':
					cmdnew.push(c[0] + ': ' + c[1]);
					break;
			}
		}
		if (cmdnew.length) {
			var selector = line.substring(0, beg).trim();
			var sel = selector.split(',').trim();
			for (var k = 0; k < sel.length; k++)
				sel[k] = (cls ? (cls + ' ') : '') + sel[k].trim().replace(/\s{2,}/g, ' ');
			builder.push(sel.join(', ') + ' { ' + cmdnew.join('; ') + '; }');
		}
	}

	var arr = [];
	var prev = '';
	for (var i = 0; i < builder.length; i++) {
		var line = builder[i];
		if (prev === line)
			continue;
		prev = line;
		arr.push(line);
	}

	return arr.join('\n');
};

FUNC.comment = function(ext, sel) {
	for (var j = 0; j < sel.length; j++) {

		var line = sel[j].trimRight();
		if (!line)
			continue;

		var index = line.lastIndexOf('\t');
		switch (ext) {
			case 'js':
				if (line.indexOf('//') === -1) {
					if (index !== -1)
						index++;
					line = line.substring(0, index) + '// ' + line.substring(index);
				} else
					line = line.replace(/\/\/(\s)/g, '');
				break;

			case 'html':
				if (line.indexOf('<!--') === -1) {
					if (index !== -1)
						index++;
					line = line.substring(0, index) + '<!-- ' + line.substring(index) + ' -->';
				} else
					line = line.replace(/<!--(\s)|(\s)-->/g, '');
				break;
			case 'css':
				if (line.indexOf('/*') === -1) {
					if (index !== -1)
						index++;
					line = line.substring(0, index) + '/* ' + line.substring(index) + ' */';
				} else
					line = line.replace(/\/\*(\s)|(\s)\*\//g, '');
				break;
		}
		sel[j] = line;
	}
	return sel;
};

// Component: j-Flow
// Version: 1
// Updated: 2021-11-03 14:32
COMPONENT('flow', 'width:6000;height:6000;grid:25;paddingX:6;curvedlines:0;horizontal:1;steplines:1;snapping:0;animationradius:6;outputoffsetY:10;outputoffsetX:12;inputoffsetY:10;inputoffsetX:12;history:100;multiple:1;animationlimit:100;animationlimitconnection:5', function(self, config, cls) {

	// config.infopath {String}, output: { zoom: Number, selected: Object }
	// config.undopath {String}, output: {Object Array}
	// config.redopath {String}, output: {Object Array}

	var D = '__';
	var drag = {};

	self.bindvisible();
	self.readonly();

	self.meta = {};
	self.el = {};     // elements
	self.op = {};     // operations
	self.cache = {};  // cache
	self.paused = {};
	self.animations = {};
	self.animations_token = 0;
	self.info = { zoom: 100 };
	self.undo = [];
	self.redo = [];
	self.focused = null;
	self.groupid = '';

	self.make = function() {

		self.aclass(cls);
		self.html(('<div class="{0}-groups"></div><svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" class="{0}-connections"><g class="lines"></g><g class="anim"></g></svg><svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">' + (config.grid ? '<defs><pattern id="jflowgrid" width="{grid}" height="{grid}" patternunits="userSpaceOnUse"><path d="M {grid} 0 L 0 0 0 {grid}" fill="none" class="{0}-grid" shape-rendering="crispEdges" /></pattern></defs><rect width="100%" height="100%" fill="url(#jflowgrid)" shape-rendering="crispEdges" />' : '') + '</svg>').format(cls).arg(config));

		var svg = self.find('svg');
		self.el.svg = svg.eq(0);
		self.el.grid = svg.eq(1);
		self.el.anim = self.el.svg.find('g.anim');
		self.el.lines = self.el.svg.find('g.lines');
		self.el.groups = self.find('.' + cls + '-groups');
		self.template = Tangular.compile('<div class="component invisible{{ if inputs && inputs.length }} hasinputs{{ fi }}{{ if outputs && outputs.length }} hasoutputs{{ fi }}{{ if component }} f-{{ component }}{{ fi }}" data-id="{{ id }}" style="top:{{ y }}px;left:{{ x }}px"><div class="area"><div class="content">{{ html | raw }}</div>{{ if inputs && inputs.length }}<div class="inputs">{{ foreach m in inputs }}<div class="input" data-index="{{ if m.id }}{{ m.id }}{{ else }}{{ $index }}{{ fi }}"><i class="component-io"></i><span>{{ if m.name }}{{ m.name | raw }}{{ else }}{{ m | raw }}{{ fi }}</span></div>{{ end }}</div>{{ fi }}{{ if outputs && outputs.length }}<div class="outputs">{{ foreach m in outputs }}<div class="output" data-index="{{ if m.id }}{{ m.id }}{{ else }}{{ $index }}{{ fi }}"><i class="component-io"></i><span>{{ if m.name }}{{ m.name | raw }}{{ else }}{{ m | raw }}{{ fi }}</span></div>{{ end }}</div>{{ fi }}</div></div>');
		self.aclass(cls + '-' + (config.horizontal ? 'h' : 'v'));

		drag.touchmove = function(e) {
			var evt = e.touches[0];
			drag.lastX = evt.pageX;
			drag.lastY = evt.pageY;
		};

		drag.touchend = function(e) {
			e.target = document.elementFromPoint(drag.lastX, drag.lastY);

			if (e.target && e.target.tagName !== 'SVG')
				e.target = $(e.target).closest('svg')[0];

			drag.unbind();

			if (e.target) {
				var pos = self.op.position();
				e.pageX = drag.lastX;
				e.pageY = drag.lastY;
				e.offsetX = e.pageX - pos.left;
				e.offsetY = e.pageY - pos.top;
				drag.drop(e);
			}
		};

		drag.bind = function() {
			$(document).on('touchmove', drag.touchmove).on('touchend', drag.touchend);
		};

		drag.unbind = function() {
			$(document).off('touchmove', drag.touchmove).off('touchend', drag.touchend);
		};

		drag.handler = function(e) {
			if (!HIDDEN(self.element)) {
				drag.el = $(e.target);
				self.aclass(cls + '-dragged');
				e.touches && drag.bind();
				var dt = e.originalEvent.dataTransfer;
				dt && dt.setData('text', '1');
			}
		};

		drag.handler_end = function() {
			self.rclass(cls + '-dragged');
		};

		drag.drop = function(e) {
			var meta = {};
			meta.pageX = e.pageX;
			meta.pageY = e.pageY;
			meta.offsetX = e.offsetX;
			meta.offsetY = e.offsetY;
			meta.el = drag.el;
			meta.target = $(e.target);
			config.ondrop && self.EXEC(config.ondrop, meta, self);
		};

		var doc = $(document);
		doc.on('dragstart touchstart', '[draggable]', drag.handler);
		doc.on('dragend touchend', '[draggable]', drag.handler_end);

		self.el.grid.on('dragenter dragover dragexit drop dragleave', function(e) {
			switch (e.type) {
				case 'drop':
					drag.drop(e);
					break;
			}
			e.preventDefault();
		});
	};

	self.destroy = function() {
		$(document).off('dragstart touchstart', drag.handler).off('dragend touchend', drag.handler_end);
	};

	self.getOffset = function() {
		return self.element.offset();
	};

	var rebuilding = false;
	var rebuildagain = false;

	self.setter = function(value, path, type) {

		if (rebuilding) {
			rebuildagain = true;
			return;
		}

		if (type === 2 || !value)
			return;

		var keys = Object.keys(value);
		var onmake = config.onmake ? GET(self.makepath(config.onmake)) : null;
		var ondone = config.ondone ? GET(self.makepath(config.ondone)) : null;
		var onremove = config.onremove ? GET(self.makepath(config.onremove)) : null;
		var prev = self.cache;
		var ischanged = false;
		var recompile = false;
		var tmp;
		var el;

		rebuilding = true;

		self.cache = {};
		self.paused = {};
		self.animations_token = Date.now();
		self.animations = {};

		for (var i = 0; i < keys.length; i++) {

			var key = keys[i];

			if (key === 'paused') {
				self.paused = value[key];
				continue;
			}

			if (key === 'tabs')
				continue;

			if (key === 'groups') {
				self.refresh_groups();
				continue;
			}

			var com = value[key];
			var checksum = self.helpers.checksum(com);

			// com.id = key
			// com.outputs = ['0 output', '1 output', '2 output'] or [{ id: 'X', name: 'Output X' }]
			// com.inputs = ['0 input', '1 input', '2 input'] or [{ id: 'X', name: 'Input X' }]
			// com.connections = { 0: { ID: COMPONENT_ID, index: 'INDEX' } };
			// com.x
			// com.y
			// com.actions = { select: true, move: true, disabled: false, remove: true, connet: true };

			// Delegates
			// com.onmake = function(el, com)
			// com.ondone = function(el, com)
			// com.onmove = function(el, com)
			// com.onremove = function(el, com)
			// com.onconnect = function(meta)
			// com.ondisconnect = function(meta)

			// done && done(el, com);
			// make && make(el, com);

			var tmp = prev[key];
			var rebuild = true;

			com.id = key;

			if (tmp) {
				if (tmp.checksum === checksum)
					rebuild = false;
				else
					tmp.checksum = checksum;
				delete prev[key];
				el = tmp.el;
			}

			if (rebuild) {
				tmp && tmp.el.aclass('removed').attrd('id', 'removed');
				var html = self.template(com);

				if (!recompile && html && html.COMPILABLE())
					recompile = true;

				html = $(html);
				self.append(html);
				el = self.find('.component[data-id="{id}"]'.arg(com));

				if (com.tab) {
					el.aclass('tab-' + com.tab);
					el[0].$flowtab = com.tab;
				} else
					el[0].$flowtab = '';

				com.onmake && com.onmake(el, com);
				onmake && onmake(el, com);
				com.element = html.find('.content').eq(0);
				if (!ischanged && com.connections && Object.keys(com.connections).length)
					ischanged = true;
				if (type === 1)
					self.op.undo({ type: 'component', id: com.id, instance: com });
			} else if (el) {
				var tab = el[0].$flowtab;
				if (tab !== com.tab) {
					tab && el.rclass2(tab);
					if (com.tab) {
						el.aclass('tab-' + com.tab);
						el[0].$flowtab = com.tab;
					} else
						el[0].$flowtab = '';
				}
			}

			if (!com.connections)
				com.connections = {};

			self.cache[key] = { id: key, instance: com, el: el, checksum: checksum, actions: com.actions || {}};
		}

		if (!value.groups)
			self.el.groups.find('> div').remove();

		var removedconn = [];

		// Remove unused components
		for (var key in prev) {
			tmp = prev[key];
			tmp.instance.onremove && tmp.instance.onremove(tmp.el, tmp.instance);
			onremove && onremove(tmp.el, tmp.instance);
			var conn = self.el.lines.find('.from' + D + key + ',.to' + D + key).aclass('connection removed hidden');
			for (var i = 0; i < conn.length; i++) {
				var dom = conn[i];
				removedconn.push({ fromid: dom.getAttribute('data-from'), fromindex: dom.getAttribute('data-fromindex'), toid: dom.getAttribute('data-to'), toindex: dom.getAttribute('data-toindex') });
			}
			tmp.el.remove();
		}

		for (var key in self.cache) {
			tmp = self.cache[key];
			tmp.instance.ondone && tmp.instance.ondone(tmp.el, tmp.instance);
			ondone && ondone(tmp.el, tmp.instance);
		}

		self.el.lines.find('path').aclass('removed');
		keys = Object.keys(self.cache);

		var reconnect = function() {

			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				tmp = self.cache[key];
				tmp.el.rclass('invisible');
				tmp.width = tmp.el.width();
				tmp.instance.connections && self.reconnect(tmp);
			}

			self.find('.removed').remove();
			rebuilding = false;

			for (var i = 0; i < removedconn.length; i++) {
				var conn = removedconn[i];
				self.helpers.checkconnectedinput(conn.toid, conn.toindex);
				self.helpers.checkconnectedoutput(conn.fromid, conn.fromindex);
				var com = self.find('.component[data-id="' + conn.fromid + '"]');
				com.tclass('connected', self.el.lines.find('.from' + D + '_' + conn.fromid).length > 0);
			}

			if (rebuildagain)
				self.refresh();

			rebuildagain = false;

		};

		if (type === 'refresh') {
			reconnect();
		} else {
			setTimeout(reconnect, 300);
			self.undo = [];
			self.redo = [];
			self.op.undo();
			self.op.redo();
		}

		self.op.refreshinfo();
		COMPILE();
	};

	self.configure = function(key, value, init) {
		if (!init) {
			if (key === 'curvedlines')
				setTimeout(self.op.reposition, 100);
		}
	};

	self.reconnect = function(m) {
		for (var index in m.instance.connections) {
			var output = m.el.find('.output[data-index="{0}"]'.format(index));
			var inputs = m.instance.connections[index];
			var problem = false;
			for (var j = 0; j < inputs.length; j++) {
				var com = inputs[j];
				var el = self.find('.component[data-id="{0}"]'.format(com.id));
				var input = el.find('.input[data-index="{0}"]'.format(com.index));
				if (!self.el.connect(output, input, true)) {
					inputs[j] = null;
					problem = true;
				}
			}
			if (problem) {
				index = 0;
				while (true) {
					var item = inputs[index];
					if (item === undefined)
						break;
					if (item === null)
						inputs.splice(index, 1);
					else
						index++;
				}
			}
		}
	};

	self.selected = function(callback) {

		var output = {};
		var arr;
		var tmp;
		var el;

		output.components = [];
		output.connections = [];

		arr = self.find('.component-selected');
		for (var i = 0; i < arr.length; i++) {
			el = arr[i];
			tmp = self.cache[el.getAttribute('data-id')];
			tmp && output.components.push(tmp);
		}

		arr = self.find('.connection-selected');
		for (var i = 0; i < arr.length; i++) {

			el = arr[i];
			var cls = el.getAttribute('class').split(' ');
			for (var j = 0; j < cls.length; j++) {
				var c = cls[j];
				if (c.substring(0, 4 + D.length) === 'conn' + D) {
					var a = c.split(D);
					var tmp = {};
					tmp.output = self.cache[a[1]].instance;
					tmp.input = self.cache[a[2]].instance;
					tmp.fromid = a[1];
					tmp.toid = a[2];
					tmp.fromindex = a[3];
					tmp.toindex = a[4];
					output.connections.push(tmp);
				}
			}
		}

		callback && callback(output);
		return output;
	};
});

// Designer: Helpers
EXTENSION('flow:helpers', function(self, config) {

	var D = '__';

	self.helpers = {};

	self.helpers.checksum = function(obj) {
		var checksum = JSON.stringify({ a: obj.outputs || EMPTYARRAY, b: obj.inputs || EMPTYARRAY, c: obj.html, d: obj.x, e: obj.y, f: obj.connections || EMPTYOBJECT });
		return HASH(checksum, true).toString(36);
	};

	self.helpers.connect = function(x1, y1, x4, y4, findex, tindex) {

		if (tindex === -1)
			tindex = 0;

		if (findex === -1)
			findex = 0;

		var y = (y4 - y1) / 2;
		var x2 = x1;
		var y2 = y1 + y;
		var x3 = x4;
		var y3 = y1 + y;
		var s = ' ';

		if (config.curvedlines)
			return self.helpers.diagonal(x1, y1, x4, y4);

		var paddingO = config.steplines ? Math.ceil(15 * ((findex + 1) / 100) * 50) : 15;
		var paddingI = config.steplines ? Math.ceil(15 * ((tindex + 1) / 100) * 50) : 15;
		var can = config.steplines && Math.abs(x1 - x4) > 50 && Math.abs(y1 - y4) > 50;
		var builder = [];

		builder.push('M' + (x1 >> 0) + s + (y1 >> 0));

		if (config.horizontal) {

			if (can)
				x2 += paddingO;

			x2 += paddingO * 2;

			builder.push('L' + (x2 >> 0) + s + (y1 >> 0));

			if (can) {
				if ((x1 !== x4 || y1 !== y4)) {
					var d = Math.abs(paddingO - paddingI) / 2 >> 0;
					y2 += d;
					builder.push('L' + (x2 >> 0) + s + (y2 >> 0));
					y3 += d;
					x3 -= paddingI * 3;
					builder.push('L' + (x3 >> 0) + s + (y3 >> 0));
				}
				x4 -= paddingI;
			}

			if (can)
				x4 -= paddingI * 2;
			else
				x4 -= paddingI;

			builder.push('L' + (x4 >> 0) + s + (y4 >> 0));

			if (can)
				x4 += paddingI * 2;

			x4 += paddingI;

		} else if (can) {
			if ((x1 !== x4 || y1 !== y4)) {
				builder.push('L' + (x2 >> 0) + s + (y2 >> 0));
				builder.push('L' + (x3 >> 0) + s + (y3 >> 0));
			}
		}

		builder.push('L' + (x4 >> 0) + s + (y4 >> 0));
		return builder.join(s);
	};

	self.helpers.move1 = function(x1, y1, conn, findex, tindex) {
		var pos = conn.attrd('offset').split(',');
		conn.attr('d', self.helpers.connect(x1, y1, +pos[2], +pos[3], findex, tindex));
		conn.attrd('offset', x1 + ',' + y1 + ',' + pos[2] + ',' + pos[3]);
	};

	self.helpers.checkconnected = function(meta) {
		meta.el.tclass('connected', Object.keys(meta.instance.connections).length > 0);
	};

	self.helpers.checkconnectedoutput = function(id, index) {
		var is = !!self.el.lines.find('.from' + D + id + D + index).length;
		self.find('.component[data-id="{0}"]'.format(id)).find('.output[data-index="{0}"]'.format(index)).tclass('connected', is);
	};

	self.helpers.checkconnectedinput = function(id, index) {
		var is = !!self.el.lines.find('.to' + D + id + D + index).length;
		self.find('.component[data-id="{0}"]'.format(id)).find('.input[data-index="{0}"]'.format(index)).tclass('connected', is);
	};

	self.helpers.move2 = function(x4, y4, conn, findex, tindex) {
		var pos = conn.attrd('offset').split(',');
		conn.attr('d', self.helpers.connect(+pos[0], +pos[1], x4, y4, findex, tindex));
		conn.attrd('offset', pos[0] + ',' + pos[1] + ',' + x4 + ',' + y4);
	};

	self.helpers.isconnected = function(output, input) {

		var co = output.closest('.component');
		var ci = input.closest('.component');
		var coid = self.cache[co.attrd('id')];
		var ciid = self.cache[ci.attrd('id')];

		if (coid.id === ciid.id)
			return true;

		if (coid.actions.disabled || coid.actions.connect === false || ciid.actions.disabled || ciid.actions.connect === false)
			return true;

		var el = $('.conn' + D + co.attrd('id') + D + ci.attrd('id') + D + output.attrd('index') + D + input.attrd('index'));
		return el.length > 0;
	};

	self.helpers.position = function(el, isout) {

		var component = el.closest('.component');
		var pos = el.offset();
		var mainoffset = el.closest('.ui-flow').offset();

		var x = (pos.left - mainoffset.left) + (isout ? config.outputoffsetX : config.inputoffsetX);
		var y = (pos.top - mainoffset.top) + (isout ? config.outputoffsetY : config.inputoffsetY);

		if (config.horizontal) {
			var zoom = self.info.zoom / 100;
			if (isout)
				x += (component.width() * zoom) - 13;
		}

		var id = component.attrd('id');
		var indexid = el.attrd('index');

		return { x: x >> 0, y: y >> 0, id: id, index: indexid, indexoffset: el.index() };
	};

	self.helpers.parseconnection = function(line) {
		var arr = line.attr('class').split(' ');
		for (var i = 0; i < arr.length; i++) {
			if (arr[i].substring(0, 4 + D.length) === 'conn' + D) {
				var info = arr[i].split(D);
				var obj = {};
				obj.fromid = info[1];
				obj.toid = info[2];
				obj.fromindex = info[3];
				obj.toindex = info[4];
				return obj;
			}
		}
	};

	self.helpers.diagonal = function(x1, y1, x2, y2) {
		var diff = Math.abs(x1 - x2);
		var a = diff < 200 ? 2 : 1.9;
		var b = diff < 200 ? 2 : 2.1;
		if (config.horizontal)
			return 'M' + x1 + ',' + y1 + 'C' + ((x1 + x2) / a) + ',' + y1 + ' ' + ((x1 + x2) / b) + ',' + y2 + ' ' + x2 + ',' + y2;
		else
			return 'M' + x1 + ',' + y1 + 'C' + x1 +  ',' + ((y1 + y2) / a) + ' ' + x2 + ',' + ((y1 + y2) / b) + ' ' + x2 + ',' + y2;
	};

});

EXTENSION('flow:operations', function(self, config, cls) {

	var D = '__';

	// Internal method
	var removeconnections = function(next, removed) {

		var connections = next.instance.connections;
		var meta = {};
		var onremove = function(conn) {

			var is = conn.id === removed.id;
			if (is) {
				meta.output = next.instance;
				meta.input = removed.instance;
				meta.fromid = next.id;
				meta.toid = removed.id;
				meta.toindex = conn.index;
				next.instance.ondisconnect && next.instance.ondisconnect.call(next.instance, meta);
				removed.instance.ondisconnect && removed.instance.ondisconnect.call(removed.instance, meta);
				config.ondisconnect && self.EXEC(config.ondisconnect, meta);
			}

			return is;
		};

		for (var index in connections) {
			var conn = connections[index];
			meta.fromindex = index;
			connections[index] = conn = conn.remove(onremove);
			if (conn.length === 0) {
				delete connections[index];
				self.helpers.checkconnectedoutput(next.id, index);
			}
		}

		self.helpers.checkconnected(next);
	};

	var isoutcache = {};

	self.op.isoutcache = function() {
		var parent = self.parent('auto');
		var offset = parent[0] === W ? null : parent.offset();
		if (offset) {
			if (!offset.left && !offset.top)
				offset = parent.position();
			isoutcache.is = parent[0] !== W && parent[0].tagName !== 'BODY' && parent[0].tagName !== 'HTML';
			isoutcache.left = offset.left + 10;
			isoutcache.top = offset.top + 10;
			isoutcache.width = parent.width() - 10;
			isoutcache.height = parent.height() - 10;
		} else
			isoutcache.is = false;
	};

	self.op.isout = function(e) {
		if (isoutcache.is) {
			if (e.pageX < isoutcache.left || e.pageY < isoutcache.top)
				return true;
			if (isoutcache.width && isoutcache.height) {
				if (e.pageX > (isoutcache.left + isoutcache.width) || e.pageY > (isoutcache.top + isoutcache.height))
					return true;
			}
		}
	};

	self.op.unselect = function(type, id) {

		var cls = 'connection-selected';

		if (type == null || type === 'connections') {
			self.el.lines.find('.' + cls).rclass(cls);
			self.el.lines.find('.highlight').rclass('highlight');
		}

		cls = 'component-selected';

		if (type == null || type === 'component') {
			var el = id ? self.find('.' + cls + '[data-id="' + id + '"]') : self.find('.' + cls);
			el.rclass(cls);
		}

		cls = 'group-selected';

		if (type == null || type === 'group') {
			var el = id ? self.find('.' + cls + '[data-id="' + id + '"]') : self.find('.' + cls);
			el.rclass(cls);
		}

		if (self.info.selected && (!id || self.info.selected.id === id)) {
			self.info.selected = null;
			self.info.type = '';
			self.op.refreshinfo();
		}

	};

	self.op.modified = function() {
		self.change(true);
		self.update(true, 2);
	};

	self.op.clean = function() {

		var model = self.get();

		for (var key in model) {

			if (key === 'paused') {
				var count = 0;
				for (var subkey in model.paused) {
					var tmp = subkey.split(D);
					var rem = false;
					var m = model[tmp[1]];

					if (!m)
						rem = true;

					if (!rem) {
						var arr = tmp[0] === 'input' ? m.inputs : m.outputs;
						if (arr && arr.length > 0) {
							if (typeof(arr[0]) === 'object') {
								if (!arr.findItem('id', tmp[2]))
									rem = true;
							} else if (!arr[+tmp[2]])
								rem = true;
						} else
							rem = true;
					}

					if (rem)
						delete model.paused[subkey];
					else
						count++;
				}
				if (!count)
					delete model.paused;
				continue;
			}

			// check connections
			var com = model[key];
			for (var subkey in com.connections) {

				var tmp = model[key].connections[subkey];
				var index = 0;

				while (true) {
					var conn = tmp[index];
					if (conn == null)
						break;

					if (!model[conn.id] || !model[conn.id].inputs) {
						tmp.splice(index, 1);
						continue;
					}

					index++;
				}

				if (!tmp.length)
					delete model[key].connections;
			}
		}
	};

	self.op.remove = function(id, noundo) {

		var tmp = self.cache[id];
		if (tmp == null) {
			var arr = (self.get().groups || EMPTYARRAY);
			tmp = arr.findItem('id', id);
			if (tmp && (!tmp.actions || tmp.actions.remove === false)) {
				tmp.onremove && tmp.onremove(null, tmp);
				config.onremove && self.EXEC(config.onremove, null, tmp, 'group');
				arr.splice(arr.indexOf(tmp), 1);
				self.op.modified();
				self.find('.' + cls + '-group[data-id="{0}"]'.format(id)).remove();
				self.op.unselect();

				if (!noundo)
					self.op.undo({ type: 'remove', id: id, instance: tmp, place: 'group' });

				return true;
			}
			return false;
		}

		if (tmp.actions.remove === false)
			return false;

		tmp.instance.onremove && tmp.instance.onremove(tmp.el, tmp.instance);
		config.onremove && self.EXEC(config.onremove, tmp.el, tmp.instance, 'component');

		delete self.cache[id];
		delete self.get()[id];

		self.el.lines.find('.from' + D + id).remove();
		self.el.lines.find('.to' + D + id).remove();

		// browse all components and find dependencies to this component
		for (var key in self.cache)
			removeconnections(self.cache[key], tmp);

		var connections = tmp.instance.connections;

		for (var index in connections) {
			var conns = connections[index];
			for (var j = 0; j < conns.length; j++) {
				var conn = conns[j];
				self.helpers.checkconnectedinput(conn.id, conn.index);
			}
		}

		if (!noundo)
			self.op.undo({ type: 'remove', id: id, instance: tmp.instance });

		self.find('.component[data-id="{0}"]'.format(id)).remove();
		self.op.modified();
		return true;
	};

	self.op.select = function(id, noremove) {

		var com = self.cache[id];
		if (com == null) {
			var group = self.find('.' + cls + '-group[data-id="{0}"]'.format(id));
			if (group) {
				self.find('.group-selected,.connection-selected,.component-selected').rclass('group-selected connection-selected component-selected');
				group.aclass('group-selected');
				self.info.selected = (self.get().groups || EMPTYARRAY).findItem('id', group.attrd('id'));
				self.info.type = 'group';
				self.op.refreshinfo();
				return true;
			} else
				return false;
		}

		var selected = 'component-selected';

		if (!noremove)
			self.find('.' + selected).rclass(selected);

		self.find('.component[data-id="{0}"]'.format(id)).aclass(selected);
		self.find('.group-selected,.connection-selected').rclass('group-selected connection-selected');

		var connections = self.el.lines.find('.from{0},.to{0}'.format(D + id)).aclass('highlight');
		var parent = self.el.lines[0];

		for (var i = 0; i < connections.length; i++) {
			var dom = connections[i];
			parent.removeChild(dom);
			parent.appendChild(dom);
		}

		self.info.selected = com.instance;
		self.info.type = 'component';
		self.op.refreshinfo();
		return true;
	};

	self.op.modify = function(instance, type) {
		if (!instance.changes)
			instance.changes = {};
		instance.changes[type] = 1;
	};

	self.op.disconnect = function(fromid, toid, fromindex, toindex, noundo) {

		if (typeof(fromid) === 'object') {
			var meta = fromid;
			toid = meta.toid;
			fromindex = meta.fromindex;
			toindex = meta.toindex;
			fromid = meta.fromid;
		}

		var a = self.cache[fromid];
		var b = self.cache[toid];

		if (!a || !b)
			return false;

		var ac = a.instance;

		self.op.modify(a.instance, 'disconnect');
		self.op.modify(b.instance, 'disconnect');

		toindex += '';
		fromindex += '';

		var conn = ac.connections[fromindex].findItem(function(conn) {
			return conn.id === toid && conn.index === toindex;
		});

		if (!conn || conn.disabled)
			return false;

		ac.connections[fromindex].splice(ac.connections[fromindex].indexOf(conn), 1);

		if (!ac.connections[fromindex].length)
			delete ac.connections[fromindex];

		if (!noundo)
			self.op.undo({ type: 'disconnect', fromid: fromid, toid: toid, fromindex: fromindex, toindex: toindex });

		self.el.lines.find('.conn{0}{1}{2}{3}'.format(D + fromid, D + toid, D + fromindex, D + toindex)).remove();
		self.op.modified();
		self.helpers.checkconnected(a);
		self.helpers.checkconnectedoutput(fromid, fromindex);
		self.helpers.checkconnectedinput(toid, toindex);
		return true;
	};

	var repositionpending = false;
	var reposition = function() {

		if (self.$removed)
			return;

		if (HIDDEN(self.element)) {
			repositionpending = true;
			setTimeout(reposition, 300);
			return;
		}

		repositionpending = false;

		var dzoom = self.info.zoom / 100;
		var dzoomoffset = ((100 - self.info.zoom) / 10) + (self.info.zoom > 100 ? 1 : -1);

		var zoom = function(val) {
			return Math.ceil(val / dzoom) - dzoomoffset;
		};

		var arr = self.el.lines.find('.connection');

		for (var i = 0; i < arr.length; i++) {

			var path = $(arr[i]);
			if (path.hclass('removed'))
				continue;

			var meta = self.helpers.parseconnection(path);

			if (!meta)
				continue;

			var output = self.find('.component[data-id="{0}"]'.format(meta.fromid)).find('.output[data-index="{0}"]'.format(meta.fromindex));
			if (!output.length)
				continue;

			var input = self.find('.component[data-id="{0}"]'.format(meta.toid)).find('.input[data-index="{0}"]'.format(meta.toindex));
			if (!input.length)
				continue;

			var a = self.helpers.position(output, true);
			var b = self.helpers.position(input);

			// I don't know why :-D
			b.x -= config.paddingX;

			if (dzoom !== 1) {
				b.x = zoom(b.x);
				b.y = zoom(b.y);
				a.x = zoom(a.x);
				a.y = zoom(a.y);
			}

			path.attrd('offset', a.x + ',' + a.y + ',' + b.x + ',' + b.y);
			path.attrd('from', a.id);
			path.attrd('to', b.id);
			path.attrd('fromindex', a.index);
			path.attrd('toindex', b.index);
			path.attrd('fromindexoffset', a.indexoffset);
			path.attrd('toindexoffset', b.indexoffset);
			path.attr('d', self.helpers.connect(a.x, a.y, b.x, b.y, a.indexoffset, b.indexoffset));
			path.rclass('hidden');
		}
	};

	self.op.reposition = function() {
		if (!repositionpending) {
			repositionpending = true;
			reposition();
		}
	};

	self.op.position = function() {
		var obj = {};
		var scroll = self.closest('.ui-scrollbar-area')[0];

		if (scroll) {
			obj.scrollTop = scroll.scrollTop;
			obj.scrollLeft = scroll.scrollLeft;
		}

		var offset = self.el.svg.offset();
		obj.left = offset.left;
		obj.top = offset.top;
		return obj;
	};

	var notifytimeout = null;
	var notifyinfo = function() {
		notifytimeout = null;
		config.infopath && self.SEEX(config.infopath, self.info);
	};

	self.op.refreshinfo = function() {
		notifytimeout && clearTimeout(notifytimeout);
		notifytimeout = setTimeout(notifyinfo, 100);
	};

	self.op.undo = function(value) {

		if (value) {

			if (self.groupid)
				value.groupid = self.groupid;

			self.undo.push(value);

			if (self.undo.length > config.history)
				self.undo.shift();
		}

		config.undopath && self.SEEX(config.undopath, self.undo);
	};

	self.op.redo = function(value) {
		if (value) {
			self.redo.push(value);
			if (self.redo.length > config.history)
				self.redo.shift();
		}
		config.redopath && self.SEEX(config.redopath, self.redo);
	};

	self.op.resize = function() {
		setTimeout2(self.ID + 'reposition', self.op.reposition, 300);
	};

	self.on('resize + resize2', self.op.resize);
});

EXTENSION('flow:map', function(self, config, cls) {

	var events = {};
	var drag = {};

	events.move = function(e) {

		if (!drag.is) {
			self.aclass(cls + '-drag');
			drag.is = true;
		}

		var x = (drag.x - e.pageX);
		var y = (drag.y - e.pageY);
		var plusY = (y / drag.zoom) >> 0;
		var plusX = (x / drag.zoom) >> 0;

		if (drag.target[0]) {
			drag.target[0].scrollLeft = drag.left + plusX;
			drag.target[0].scrollTop = drag.top + plusY;
		}
	};

	events.movetouch = function(e) {
		events.move(e.touches[0]);
	};

	events.up = function() {
		self.rclass(cls + '-drag');
		events.unbind();
	};

	events.leave = function(e) {
		if (!e.relatedTarget)
			events.up(e);
	};

	events.bind = function() {
		if (!events.is) {
			events.is = true;
			self.element.on('mouseup', events.up);
			self.element.on('mousemove', events.move);
			self.element.on('touchend', events.up);
			self.element.on('touchmove', events.movetouch);
			$(W).on('mouseleave', events.leave);
		}
	};

	events.unbind = function() {
		if (events.is) {
			events.is = false;
			self.element.off('mouseup', events.up);
			self.element.off('mousemove', events.move);
			self.element.off('touchend', events.up);
			self.element.off('touchmove', events.movetouch);
			$(W).off('mouseleave', events.leave);
		}
	};

	self.event('contextmenu', function(e) {
		events.is && events.up();
		config.contextmenu && self.SEEX(config.contextmenu, e, 'map');
		e.preventDefault();
		e.stopPropagation();
	});

	self.event('mousedown touchstart', function(e) {

		if (events.is) {
			events.up();
			return;
		}

		if (e.button || e.target.tagName !== 'rect')
			return;

		// Unselects all selected components/connections
		self.op.unselect();

		var evt = e.touches ? e.touches[0] : e;
		var et = $(e.target);
		var target = et.closest('.ui-scrollbar-area');

		if (!target[0]) {
			target = et.closest('.ui-viewbox');
			if (!target[0])
				return;
		}

		drag.is = false;
		drag.target = target;
		drag.zoom = self.info.zoom / 100;
		drag.x = evt.pageX;
		drag.y = evt.pageY;
		drag.top = drag.target[0].scrollTop;
		drag.left = drag.target[0].scrollLeft;

		events.bind();
		e.preventDefault();

	});
});

EXTENSION('flow:components', function(self, config) {

	var D = '__';
	var events = {};
	var drag = {};

	var zoom = function(val) {
		return Math.ceil(val / drag.zoom) - drag.zoomoffset;
	};

	drag.css = {};

	self.components_reposition = function(obj, zoom) {

		// move all output connections

		for (var j = 0; j < obj.selected.length; j++) {
			var node = obj.selected[j];
			for (var i = 0; i < node.output.length; i++) {
				var conn = $(node.output[i]);
				var pos = self.helpers.position(conn, true);
				var arr = self.el.lines.find('.from' + D + pos.id + D + pos.index);
				for (var k = 0; k < arr.length; k++) {
					var ce = $(arr[k]);
					var findex = +ce.attrd('fromindexoffset');
					var tindex = +ce.attrd('toindexoffset');
					self.helpers.move1(zoom(pos.x + obj.zoomoffset), zoom(pos.y), ce, findex, tindex);
				}
			}

			// move all input connections
			for (var i = 0; i < node.input.length; i++) {
				var conn = $(node.input[i]);
				var pos = self.helpers.position(conn);
				var arr = self.el.lines.find('.to' + D + pos.id + D + pos.index);
				var findex = +conn.attrd('fromindexoffset');
				var tindex = +conn.attrd('toindexoffset');
				for (var k = 0; k < arr.length; k++) {
					var ce = $(arr[k]);
					var findex = +ce.attrd('fromindexoffset');
					var tindex = +ce.attrd('toindexoffset');
					self.helpers.move2(zoom(pos.x - 6), zoom(pos.y), ce, findex, tindex);
				}
			}
		}
	};

	events.move = function(e) {

		if (self.op.isout(e)) {
			events.up(e);
			return;
		}

		var x = (e.pageX - drag.x);
		var y = (e.pageY - drag.y);

		for (var i = 0; i < drag.selected.length; i++) {
			var instance = drag.selected[i];
			instance.node.css({ left: zoom(instance.pos.left + x), top: zoom(instance.pos.top + y) });
		}

		if (!drag.is)
			drag.is = true;

		self.components_reposition(drag, zoom);
	};

	events.movetouch = function(e) {
		events.move(e.touches[0]);
	};

	self.components_moved = events.up = function(e, obj, zoom2) {

		if (!obj)
			obj = drag;

		if (!zoom2)
			zoom2 = zoom;

		if (obj.is) {

			var undo = [];

			for (var i = 0; i < obj.selected.length; i++) {
				var instance = obj.selected[i];
				var pos = instance.node.position();

				if (config.snapping) {
					pos.left = zoom2(pos.left - (pos.left % config.snapping));
					pos.top = zoom2(pos.top - (pos.top % config.snapping));
					instance.node.css(pos);
				}

				var data = self.get()[instance.id];
				undo.push({ id: instance.id, x: data.x, y: data.y, newx: pos.left, newy: pos.top, groupid: self.groupid });
				data.x = pos.left;
				data.y = pos.top;
				data.onmove && data.onmove(instance.node, data);
				config.onmove && self.EXEC(config.onmove, instance.node, data, 'component');
				self.op.modify(data, 'move');
			}

			self.op.undo({ type: 'move', multiple: undo });
			self.components_reposition(obj, zoom2);
			setTimeout(self.op.modified, 1);
		}

		events.unbind();
	};

	events.leave = function(e) {
		events.up(e);
	};

	events.bind = function() {
		if (!events.is) {
			events.is = true;
			self.op.isoutcache();
			self.element.on('mouseup', events.up);
			self.element.on('mousemove', events.move);
			self.element.on('touchend', events.up);
			self.element.on('touchmove', events.movetouch);
		}
	};

	events.unbind = function() {
		if (events.is) {
			events.is = false;
			self.element.off('mouseup', events.up);
			self.element.off('mousemove', events.move);
			self.element.off('touchend', events.up);
			self.element.off('touchmove', events.movetouch);
		}
	};

	self.event('contextmenu', '.area', function(e) {

		events.is && events.up();

		var tagName = e.target.tagName;
		if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT')
			return;

		var el = $(this);
		var id = el.closest('.component').attrd('id');
		config.contextmenu && self.SEEX(config.contextmenu, e, 'component', self.cache[id].instance);
		e.preventDefault();
		e.stopPropagation();
	});

	self.event('dblclick', '.area', function(e) {

		var parent = e.target;
		var target;

		while (true) {

			var cl = parent.classList;

			if (parent === self.dom || cl.contains('selectable') || parent.tagName === 'BUTTON' || parent.tagName === 'A' || cl.contains('output') || cl.contains('input'))
				return;

			if (cl.contains('component')) {
				target = $(parent);
				break;
			}

			parent = parent.parentNode;
		}

		config.dblclick && self.SEEX(config.dblclick, self.cache[target.attrd('id')].instance, e);
	});

	self.event('mousedown touchstart', '.area', function(e) {

		if (events.is) {
			events.up();
			return;
		}

		var parent = e.target;
		var clssel = 'component-selected';
		var target;

		while (true) {

			var cl = parent.classList;

			if (parent === self.dom || cl.contains('selectable') || parent.tagName === 'BUTTON' || parent.tagName === 'A')
				return;

			if (cl.contains('component')) {
				target = $(parent);
				break;
			}

			parent = parent.parentNode;
		}

		var selectconnections = function() {
			var clscon = 'connection-selected';
			var more = self.find('.' + clssel);
			self.el.lines.find('.' + clscon).rclass(clscon);
			for (var i = 0; i < more.length; i++) {
				var sel = $(more[i]);
				var selid = sel.attrd('id');
				var selector = '.from__{0},.to__{0}'.format(selid);
				self.el.lines.find(selector).aclass(clscon);
			}
		};

		drag.id = target.attrd('id');

		var more = self.find('.' + clssel);
		var ismeta = config.multiple && (e.metaKey || e.ctrlKey || e.shiftKey);
		if (ismeta) {
			if (target.hclass(clssel)) {
				self.op.unselect('component', more.length > 1 ? drag.id : null);
				setTimeout(selectconnections, 5);
				return;
			}
		}

		e.preventDefault();

		var evt = e.touches ? e.touches[0] : e;
		var tmp = self.cache[drag.id];

		self.op.unselect('connections');

		if (tmp.actions.select !== false) {
			var is = ismeta;
			if (!is)
				is = target.hclass(clssel);
			self.op.select(drag.id, is);
		}

		setTimeout(selectconnections, 5);

		if (tmp.actions.move === false)
			return;

		var nodes = self.find('.' + clssel);
		drag.target = target;
		drag.x = evt.pageX;
		drag.y = evt.pageY;
		drag.zoom = self.info.zoom / 100;
		drag.zoomoffset = ((100 - self.info.zoom) / 10) + (self.info.zoom > 100 ? 1 : -1);
		drag.is = false;
		drag.selected = [];

		for (var i = 0; i < nodes.length; i++) {
			var node = $(nodes[i]);
			drag.selected.push({ id: node.attrd('id'), node: node, pos: node.position(), output: node.find('.output'), input: node.find('.input') });
		}

		self.focused && self.focused.rclass('component-focused');
		self.focused = target.aclass('component-focused');
		events.bind();
	});

});

EXTENSION('flow:connections', function(self, config) {

	var D = '__';
	var events = {};
	var drag = {};
	var prevselected = null;

	drag.css = {};

	var zoom = function(val) {
		return Math.ceil(val / drag.zoom) - drag.zoomoffset;
	};

	events.move = function(e) {

		if (self.op.isout(e)) {
			events.up(e);
			return;
		}

		var x = (e.pageX - drag.x) + drag.offsetX;
		var y = (e.pageY - drag.y) + drag.offsetY;
		drag.path.attr('d', drag.input ? self.helpers.connect(zoom(x), zoom(y), zoom(drag.pos.x), zoom(drag.pos.y), -1, drag.realindex) : self.helpers.connect(zoom(drag.pos.x), zoom(drag.pos.y), zoom(x), zoom(y), drag.realindex, -1));
		if (drag.click)
			drag.click = false;
	};

	events.movetouch = function(e) {
		var evt = e.touches[0];
		drag.lastX = evt.pageX;
		drag.lastY = evt.pageY;
		events.move(evt);
	};

	events.up = function(e) {

		drag.path.remove();
		events.unbind();

		if (drag.click && (Date.now() - drag.ticks) < 150) {
			var icon = drag.target.find('.component-io');
			var clsp = 'disabled';
			icon.tclass(clsp);

			var key = (drag.input ? 'input' : 'output') + D + drag.pos.id + D + drag.pos.index;
			var model = self.get();

			if (!model.paused)
				model.paused = {};

			if (icon.hclass(clsp))
				model.paused[key] = 1;
			else
				delete model.paused[key];

			self.op.modify(model[drag.pos.id], 'pause');
			config.onpause && self.SEEX(config.onpause, key, model.paused[key] === 1);
			setTimeout2(self.ID + 'clean', self.op.clean, 2000);
			self.op.modified();
			return;
		}

		if (drag.lastX != null && drag.lastY != null)
			e.target = document.elementFromPoint(drag.lastX, drag.lastY);

		drag.target.add(drag.targetcomponent).rclass('connecting');

		if (drag.input) {

			// DRAGGED FROM INPUT
			var output = $(e.target).closest('.output');
			if (!output.length)
				return;

			// Checks if the connection is existing
			if (self.helpers.isconnected(output, drag.target))
				return;

			self.el.connect(output, drag.target);

		} else {

			// DRAGGED FROM OUTPUT
			var input = $(e.target).closest('.input');
			if (!input.length)
				return;

			// Checks if the connection is existing
			if (self.helpers.isconnected(drag.target, input))
				return;

			self.el.connect(drag.target, input);
		}
	};

	events.bind = function() {
		if (!events.is) {
			events.is = true;
			self.op.isoutcache();
			self.element.on('mouseup', events.up);
			self.element.on('mousemove', events.move);
			self.element.on('touchend', events.up);
			self.element.on('touchmove', events.movetouch);
		}
	};

	events.unbind = function() {
		if (events.is) {
			events.is = false;
			self.element.off('mouseup', events.up);
			self.element.off('mousemove', events.move);
			self.element.off('touchend', events.up);
			self.element.off('touchmove', events.movetouch);
		}
	};

	self.event('mousedown touchstart', '.output,.input', function(e) {

		if (e.button)
			return;

		e.preventDefault();
		e.stopPropagation();

		if (config.horizontal && !e.target.classList.contains('component-io'))
			return;

		drag.click = true;
		drag.ticks = Date.now();

		var target = $(this);
		var evt = e.touches ? e.touches[0] : e;
		var com = target.closest('.component');
		var tmp = self.cache[com.attrd('id')];

		if (tmp.actions.disabled || tmp.actions.connect === false)
			return;

		var offset = self.getOffset();
		var targetoffset = target.offset();

		drag.input = target.hclass('input');
		drag.target = target;
		drag.index = +target.attrd('index');
		drag.realindex = target.index();
		drag.x = evt.pageX;
		drag.y = evt.pageY;
		drag.zoom = self.info.zoom / 100;
		drag.zoomoffset = ((100 - self.info.zoom) / 10) + (self.info.zoom > 100 ? 1 : -1);

		drag.pos = self.helpers.position(target, !drag.input);
		drag.target.add(com).aclass('connecting');
		drag.targetcomponent = com;

		// For touch devices
		drag.lastX = null;
		drag.lastY = null;

		if (drag.input)
			drag.pos.x -= config.paddingX;

		if (evt.offsetX == null || evt.offsetY == null) {
			var off = self.op.position();
			drag.offsetX = drag.x - off.left;
			drag.offsetY = drag.y - off.top;
		} else {
			drag.offsetX = (targetoffset.left - offset.left) + evt.offsetX + (drag.input ? 2 : 5);
			drag.offsetY = (targetoffset.top - offset.top) + evt.offsetY + (drag.input ? 2 : 2);
		}

		if (config.horizontal) {
			if (drag.input)
				drag.offsetX -= 10;
			else
				drag.offsetX = drag.offsetX + (com.width() * drag.zoom) - 10;
		}

		drag.path = self.el.lines.asvg('path');
		drag.path.aclass('connection connection-draft');

		events.bind();
	});

	self.el.connect = function(output, input, init) {

		if (!output[0] || !input[0])
			return false;

		drag.zoom = self.info.zoom / 100;
		drag.zoomoffset = ((100 - self.info.zoom) / 10) - 1;

		var a = self.helpers.position(output, true);
		var b = self.helpers.position(input);

		b.x -= config.paddingX;

		if (drag.zoom !== 1) {
			b.x = zoom(b.x);
			b.y = zoom(b.y);
			a.x = zoom(a.x);
			a.y = zoom(a.y);
		}

		var path = self.el.lines.asvg('path');

		path.aclass('connection from' + D + a.id + ' to' + D + b.id + ' from' + D + a.id + D + a.index + ' to' + D + b.id + D + b.index + ' conn' + D + a.id + D + b.id + D + a.index + D + b.index + (HIDDEN(self.element) ? ' hidden' : ''));
		path.attrd('offset', a.x + ',' + a.y + ',' + b.x + ',' + b.y);
		path.attrd('fromindex', a.index);
		path.attrd('toindex', b.index);
		path.attrd('fromindexoffset', a.indexoffset);
		path.attrd('toindexoffset', b.indexoffset);
		path.attrd('from', a.id);
		path.attrd('to', b.id);
		path.attr('d', self.helpers.connect(a.x, a.y, b.x, b.y, a.indexoffset, b.indexoffset));

		input.add(output).aclass('connected');

		if (init) {
			var kp = 'input' + D + b.id + D + b.index;
			input.find('.component-io').tclass('disabled', !!self.paused[kp]);
			kp = 'output' + D + a.id + D + a.index;
			output.find('.component-io').tclass('disabled', !!self.paused[kp]);
		}

		var data = self.get();
		var ac = data[a.id];
		var bc = data[b.id];
		var key = a.index + '';

		ac.tab && path.aclass('tab-' + ac.tab);
		bc.tab && path.aclass('tab-' + bc.tab);

		if (ac.connections == null)
			ac.connections = {};

		if (ac.connections[key] == null)
			ac.connections[key] = [];

		self.op.modify(ac, 'connect');
		self.op.modify(bc, 'connect');

		var arr = ac.connections[key];
		var bindex = b.index + '';
		var is = true;

		for (var i = 0; i < arr.length; i++) {
			var tmp = arr[i];
			if (tmp.id === b.id && tmp.index === bindex) {
				is = false;
				break;
			}
		}

		if (is)
			ac.connections[key].push({ id: b.id + '', index: bindex });

		output.closest('.component').aclass('connected');

		var meta = {};
		meta.output = ac;
		meta.input = data[b.id];
		meta.fromid = a.id;
		meta.toid = b.id;
		meta.fromindex = a.index;
		meta.toindex = b.index;
		meta.path = path;
		meta.init = init;
		ac.onconnect && ac.onconnect.call(ac, meta);
		bc.onconnect && bc.onconnect.call(bc, meta);
		config.onconnect && self.EXEC(config.onconnect, meta);

		if (!init) {
			self.op.undo({ type: 'connect', fromid: meta.fromid, toid: meta.toid, fromindex: meta.fromindex + '', toindex: meta.toindex + '' });
			self.op.modified();
		}

		return true;
	};

	self.event('contextmenu', '.connection', function(e) {
		events.is && events.up();

		var el = $(this);
		var meta = {};
		var classes = el.attr('class').split(' ');

		for (var i = 0; i < classes.length; i++) {
			var cls = classes[i];
			if (cls.substring(0, 6) === 'conn__') {
				var arr = cls.split('__');
				meta.fromid = arr[1];
				meta.toid = arr[2];
				meta.fromindex = arr[3];
				meta.toindex = arr[4];
				meta.from = self.cache[meta.fromid].instance;
				meta.to = self.cache[meta.toid].instance;
				break;
			}
		}

		meta.fromid && config.contextmenu && self.SEEX(config.contextmenu, e, 'connection', meta);

		e.preventDefault();
		e.stopPropagation();
	});

	self.event('mousedown touchstart', '.connection', function(e) {

		var el = $(this);
		var cls = 'connection-selected';

		self.op.unselect();

		if (el.hclass(cls))
			return;

		prevselected && prevselected.rclass(cls);
		el.aclass(cls);
		prevselected = el;

		var conn = self.helpers.parseconnection(el);
		conn.isconnection = true;
		conn.frominstance = self.cache[conn.fromid].instance;
		conn.toinstance = self.cache[conn.toid].instance;

		self.info.selected = conn;
		self.info.type = 'connection';
		self.op.refreshinfo();

		var dom = el[0];
		var parent = el.parent()[0];

		parent.removeChild(dom);
		parent.appendChild(dom);

		e.preventDefault();
		e.stopPropagation();
	});

});

EXTENSION('flow:commands', function(self, config, cls) {

	var zoom = 1;
	var animationcount = 0;

	var disconnect = function() {
		var arr = self.el.lines.find('.connection-selected');
		for (var i = 0; i < arr.length; i++) {
			var obj = self.helpers.parseconnection($(arr[i]));
			obj && self.op.disconnect(obj.fromid, obj.toid, obj.fromindex, obj.toindex);
		}
	};

	var remove = function() {
		var arr = self.find('.component-selected,.group-selected');
		for (var i = 0; i < arr.length; i++)
			self.op.remove($(arr[i]).attrd('id'));
	};

	self.command('flow.check', function() {
		for (var key in self.cache) {
			var instance = self.cache[key];
			var width = instance.el.width();
			if (instance.width !== width) {
				instance.width = width;
				self.op.reposition();
				break;
			}
		}
	});

	self.command('flow.refresh', function() {
		self.op.reposition();
		self.refresh_groups();
	});

	var flow_find_groups = function(id) {
		var item = self.groups.findItem('id', id);
		if (item) {
			var pos = self.el.groups.find('> div[data-id="{0}"]'.format(id)).offset();
			var scroll = self.closest('.ui-scrollbar-area');
			if (scroll) {
				var offset = self.element.offset();
				scroll.animate({ scrollLeft: pos.left - 200 - offset.left, scrollTop: pos.top - 150 - offset.top }, 300);
				self.op.unselect();
				self.op.select(id);
			}
		}
	};

	var flow_find_component = function(id) {
		var com = self.cache[id];
		if (com) {
			var pos = com.el.offset();
			var scroll = self.closest('.ui-scrollbar-area');
			if (scroll) {
				var offset = self.element.offset();
				scroll.animate({ scrollLeft: pos.left - 200 - offset.left, scrollTop: pos.top - 150 - offset.top }, 300);
				self.op.unselect();
				self.op.select(id);
			}
		}
	};

	self.command('flow.groups.find', flow_find_groups);
	self.command('flow.components.find', flow_find_component);

	self.command('flow.find', function(id) {
		if (self.groups.findItem('id', id))
			flow_find_groups(id);
		else
			flow_find_component(id);
	});

	self.command('flow.selected.disconnect', function() {
		disconnect();
		self.op.unselect();
	});

	self.command('flow.selected.remove', function() {
		remove();
		self.op.unselect();
	});

	function translate_path(count, path) {
		var l = path.getTotalLength();
		var t = (l / 100) * count;
		var p = path.getPointAtLength(t);
		return 'translate(' + p.x + ',' + p.y + ')';
	}

	self.command('flow.traffic', function(id, opt) {

		if (!opt)
			opt = { speed: 3, count: 1, delay: 50 };

		if (!opt.limit)
			opt.limit = 20;

		var path = self.el.lines.find('.from__' + id);

		if (opt.count > opt.limit)
			opt.count = opt.limit;

		if (!path.length || (self.animations[id] > opt.limit) || document.hidden)
			return;

		var add = function(next) {
			for (var i = 0; i < path.length; i++) {

				if ((config.animationlimit && animationcount >= config.animationlimit))
					break;

				var line = path[i];
				if (line.$flowanimcount > config.animationlimitconnection)
					break;

				var el = self.el.anim.asvg('circle').aclass('traffic').attr('r', opt.radius || config.animationradius);
				var dom = el[0];

				animationcount++;

				if (line.$flowanimcount)
					line.$flowanimcount++;
				else
					line.$flowanimcount = 1;

				dom.$path = line;
				dom.$count = 0;
				dom.$token = self.animations_token;

				if (self.animations[id])
					self.animations[id]++;
				else
					self.animations[id] = 1;

				(function(self, el, dom, opt) {

					var fn = function() {

						dom.$count += (opt.speed || 3);

						if (document.hidden || !dom.$path || !dom.$path.parentNode || dom.$token !== self.animations_token) {
							el.remove();
							if (self.animations[id])
								self.animations[id]--;
							if (animationcount > 0)
								animationcount--;
							if (line.$flowanimcount > 0)
								line.$flowanimcount--;
							return;
						}

						if (dom.$count >= 100) {
							if (animationcount > 0)
								animationcount--;
							if (self.animations[id] > 0)
								self.animations[id]--;
							if (line.$flowanimcount > 0)
								line.$flowanimcount--;
							el.remove();
							return;
						} else
							el.attr('transform', translate_path(dom.$count, dom.$path));

						requestAnimationFrame(fn);
					};
					requestAnimationFrame(fn);
				})(self, el, dom, opt);
			}

			next && setTimeout(next, opt.delay || 50);
		};

		if (!opt.count || opt.count === 1) {
			add();
			return;
		}

		var arr = [];
		for (var i = 0; i < opt.count; i++)
			arr.push(add);

		arr.wait(function(fn, next) {
			fn(next);
		});

	});

	self.command('flow.selected.clear', function() {
		self.groupid = GUID(5);
		disconnect();
		remove();
		self.op.unselect();
		self.groupid = '';
	});

	self.command('flow.clean', function() {
		self.op.clean();
	});

	self.command('flow.components.add', function(com) {
		if (!com.id)
			com.id = 'f' + Date.now().toString(36);
		var data = self.get();
		data[com.id] = com;
		self.op.modify(com, 'newbie');
		self.op.modified();
		self.refresh(true);
		self.op.undo({ type: 'component', id: com.id });
	});

	self.command('flow.groups.add', function(item) {
		if (!item.id)
			item.id = 'g' + Date.now().toString(36);
		var data = self.get();
		if (data.groups)
			data.groups.push(item);
		else
			data.groups = [item];
		self.op.modified();
		self.refresh(true);
		self.op.undo({ type: 'group', id: item.id });
	});

	self.command('flow.zoom', function(type, value) {

		switch (type) {
			case 'in':
				if (value)
					zoom = value / 100;
				else
					zoom += 0.05;
				break;
			case 'out':
				if (value)
					zoom = value / 100;
				else
					zoom -= 0.05;
				break;
			case 'reset':
				zoom = 1;
				break;
		}

		if (zoom < 0.3 || zoom > 1.7)
			return;

		self.info.zoom = 100 * zoom;
		self.op.refreshinfo();
		self.element.css('transform', 'scale({0})'.format(zoom));
	});

	self.command('flow.undo', function() {

		var item;
		var prev;

		while (true) {

			prev = self.undo.pop();

			if (!prev)
				return;

			self.op.undo();
			self.op.redo(prev);

			if (prev.type === 'disconnect') {
				var output = self.find('.component[data-id="{0}"]'.format(prev.fromid)).find('.output[data-index="{0}"]'.format(prev.fromindex));
				var input = self.find('.component[data-id="{0}"]'.format(prev.toid)).find('.input[data-index="{0}"]'.format(prev.toindex));
				self.el.connect(output, input, true);
			} else if (prev.type === 'connect') {
				self.op.disconnect(prev.fromid, prev.toid, prev.fromindex, prev.toindex, true);
			} else if (prev.type === 'component' || prev.type === 'group') {
				self.op.remove(prev.id, true);
			} else if (prev.type === 'move') {
				var arr = prev.multiple || [prev];
				for (var i = 0; i < arr.length; i++) {
					var tmp = arr[i];
					if (tmp.type === 'group') {
						item = (self.get().groups || EMPTYARRAY).findItem('id', tmp.id);
						if (item) {
							var el = self.find('.' + cls + '-group[data-id="{0}"]'.format(tmp.id)).css({ left: tmp.x, top: tmp.y, width: tmp.width, height: tmp.height });
							item.x = tmp.x;
							item.y = tmp.y;
							item.width = tmp.width;
							item.height = tmp.height;
							item.onmove && item.onmove(el, item);
							config.onmove && self.EXEC(config.onmove, el, item, 'group');
						}
					} else {
						self.find('.component[data-id="{0}"]'.format(tmp.id)).css({ left: tmp.x, top: tmp.y });
						item = self.get()[tmp.id];
						item.x = tmp.x;
						item.y = tmp.y;
						item.onmove && item.onmove(item.element, item);
						config.onmove && self.EXEC(config.onmove, item.element, item, 'component');
					}
				}
				self.op.reposition();
			} else if (prev.type === 'remove') {
				var com = prev.instance;
				com.id = prev.id;
				var data = self.get();

				if (prev.place === 'group') {
					if (!data.groups)
						data.groups = {};
					data.groups.push(com);
				} else
					data[com.id] = com;

				self.op.modified();
				self.update('refresh');
			}

			if (!prev.groupid || (!self.undo.length || prev.groupid !== self.undo[self.undo.length - 1].groupid))
				return;
		}

	});

	self.command('flow.redo', function() {

		var next;
		var item;

		while (true) {

			next = self.redo.pop();

			if (next == null)
				return;

			self.op.redo();
			self.op.undo(next);
			self.op.refreshinfo();

			if (next.type === 'disconnect') {
				self.op.disconnect(next.fromid, next.toid, next.fromindex, next.toindex, true);
			} else if (next.type === 'connect') {
				var output = self.find('.component[data-id="{0}"]'.format(next.fromid)).find('.output[data-index="{0}"]'.format(next.fromindex));
				var input = self.find('.component[data-id="{0}"]'.format(next.toid)).find('.input[data-index="{0}"]'.format(next.toindex));
				self.el.connect(output, input, true);
			} else if (next.type === 'component') {
				var com = next.instance;
				com.id = next.id;
				var data = self.get();
				data[com.id] = com;
				self.op.modified();
				self.refresh(true);
			} else if (next.type === 'group') {
				var com = next.instance;
				com.id = next.id;
				var data = self.get().groups;
				data.push(com);
				self.op.modified();
				self.refresh(true);
			} else if (next.type === 'move') {
				var arr = next.multiple || [next];
				for (var i = 0; i < arr.length; i++) {
					var tmp = arr[i];
					if (tmp.type === 'group') {
						item = (self.get().groups || EMPTYARRAY).findItem('id', tmp.id);
						if (item) {
							var el = self.find('.' + cls + '-group[data-id="{0}"]'.format(tmp.id)).css({ left: tmp.newx, top: tmp.newy, width: tmp.newwidth, height: tmp.newheight });
							item.x = tmp.newx;
							item.y = tmp.newy;
							item.width = tmp.newwidth;
							item.height = tmp.newheight;
							item.onmove && item.onmove(el, item);
							config.onmove && self.EXEC(config.onmove, el, item, 'group');
						}
					} else {
						self.find('.component[data-id="{0}"]'.format(tmp.id)).css({ left: tmp.newx, top: tmp.newy });
						item = self.get()[tmp.id];
						item.x = tmp.newx;
						item.y = tmp.newy;
						item.onmove && item.onmove(item.element, item);
						config.onmove && self.EXEC(config.onmove, item.element, item, 'component');
					}
				}
				self.op.reposition();
			} else if (next.type === 'remove')
				self.op.remove(next.id, true);

			if (!next.groupid || (!self.redo.length || next.groupid !== self.redo[self.redo.length - 1].groupid))
				return;
		}

	});

	// Resets editor
	self.command('flow.reset', function() {
		self.refresh();
		self.info.selected = null;
		self.info.type = '';
		self.op.refreshinfo();
		self.undo = [];
		self.redo = [];
		self.op.undo();
		self.op.redo();
	});

});

EXTENSION('flow:groups', function(self, config, cls) {

	var events = {};
	var drag = {};

	var zoom = function(val) {
		return Math.ceil(val / drag.zoom) - drag.zoomoffset;
	};

	events.bind = function() {
		if (!events.is) {
			self.op.isoutcache();
			events.is = true;
			self.element.on('mousemove touchmove', events.move).on('mouseup touchend', events.up);
			self.element.on('mouseleave', events.leave);
		}
	};

	events.unbind = function() {
		if (events.is) {
			events.is = false;
			self.element.off('mousemove touchmove', events.move).off('mouseup touchend', events.up);
			self.element.off('mouseleave', events.leave);
		}
	};

	events.leave = function(e) {
		events.up(e);
	};

	events.move = function(e) {

		var evt = e.type === 'touchmove' ? e.touches[0] : e;

		var x = (evt.pageX + drag.plusX) - drag.pageX;
		var y = (evt.pageY + drag.plusY) - drag.pageY;

		if (drag.type === 'move') {

			if (self.op.isout(evt)) {
				events.up(evt);
				return;
			}

			drag.element.css({ left: zoom(drag.pos.left + x), top: zoom(drag.pos.top + y) });
			if (drag.selected.length) {
				for (var i = 0; i < drag.selected.length; i++) {
					var instance = drag.selected[i];
					instance.node.css({ left: zoom(instance.pos.left + x), top: zoom(instance.pos.top + y) });
				}
				self.components_reposition(drag, zoom);
			}

		} else if (drag.type === 'resize') {

			var obj = {};
			var w;
			var h;

			switch (drag.dir) {

				case 'tl':

					w = drag.width - zoom(x);
					h = drag.height - zoom(y);

					if (w < drag.min || h < drag.min)
						break;

					obj.left = zoom(drag.pos.left + x);
					obj.top = zoom(drag.pos.top + y);
					obj.width = w;
					obj.height = h;
					drag.element.css(obj);
					break;

				case 'tr':

					w = drag.width + zoom(x);
					h = drag.height - zoom(y);

					if (w < drag.min || h < drag.min)
						break;

					obj.top = zoom(drag.pos.top + y);
					obj.width = w;
					obj.height = h;
					drag.element.css(obj);
					break;

				case 'bl':

					w = drag.width + zoom(x);
					h = drag.height + zoom(y);

					if (w < drag.min || h < drag.min)
						break;

					obj.left = zoom(drag.pos.left + x);
					obj.width = drag.width - zoom(x);
					obj.height = h;
					drag.element.css(obj);
					break;

				case 'br':

					w = drag.width + zoom(x);
					h = drag.height + zoom(y);

					if (w < drag.min || h < drag.min)
						break;

					obj.width = w;
					obj.height = h;
					drag.element.css(obj);
					break;
			}

		}

		if (!drag.is)
			drag.is = true;

	};

	events.up = function(e) {
		var evt = e.type === 'touchend' ? e.touches[0] : e;
		if (drag.is) {
			var id = drag.element.attrd('id');
			var group = self.groups.findItem('id', id);
			var pos = drag.element.position();
			var w = drag.element.width();
			var h = drag.element.height();
			var history = { id: id, x: group.x, y: group.y, newx: pos.left, newy: pos.top, width: group.width, height: group.height, newwidth: w, newheight: h, type: 'group' };

			if (config.snapping) {
				pos.left = zoom(pos.left - (pos.left % config.snapping));
				pos.top = zoom(pos.top - (pos.top % config.snapping));
				drag.element.css(pos);
			}

			if (drag.selected.length) {
				self.components_moved(evt, drag, zoom);
				self.undo.last().multiple.push(history);
			} else
				self.op.undo({ type: 'move', multiple: [history] });

			group.x = pos.left;
			group.y = pos.top;
			group.width = w;
			group.height = h;
			group.onmove && group.onmove(drag.element, group);
			config.onmove && self.EXEC(config.onmove, drag.element, group, 'group');
		}
		events.unbind();
	};

	self.event('dblclick',  '.' + cls + '-group', function(e) {
		var item = (self.get().groups || EMPTYARRAY).findItem('id', $(this).attrd('id'));
		item && config.dblclickgroup && self.SEEX(config.dblclickgroup, item, e);
	});

	self.event('mousedown touchstart', '.' + cls + '-group', function(e) {

		var evt = e.type === 'touchstart' ? e.touches[0] : e;

		self.op.unselect();
		evt.preventDefault();
		evt.stopPropagation();

		var parent = self.op.position();
		var plusX = (parent.scrollLeft || 0) + parent.left;
		var plusY = (parent.scrollTop || 0) + parent.top;

		events.bind();
		drag.element = $(this);
		drag.id = drag.element.attrd('id');

		drag.element.aclass('group-selected');
		self.info.selected = (self.get().groups || EMPTYARRAY).findItem('id', drag.id);
		self.info.type = 'group';
		self.op.refreshinfo();

		drag.css = {};
		drag.is = false;
		drag.plusX = plusX;
		drag.plusY = plusY;
		drag.pageX = evt.pageX + plusX;
		drag.pageY = evt.pageY + plusY;
		drag.type = '';
		drag.offset = self.getOffset();
		drag.zoom = self.info.zoom / 100;
		drag.zoomoffset = ((100 - self.info.zoom) / 10) + (self.info.zoom > 100 ? 1 : -1);
		drag.min = 200;
		drag.pos = drag.element.position();
		drag.ismeta = (evt.metaKey || evt.ctrlKey || evt.shiftKey);
		drag.selected = [];

		var rect1 = { x: drag.pos.left, y: drag.pos.top, width: drag.element.width(), height: drag.element.height() };

		if (evt.target.tagName === 'SPAN') {

			if (self.info.selected.actions && self.info.selected.actions.resize === false)
				return;

			drag.type = 'resize';
			drag.width = rect1.width;
			drag.height = rect1.height;
			drag.dir = evt.target.getAttribute('class').replace(cls + '-resize-', '');
			return;
		}

		if (self.info.selected.actions && self.info.selected.actions.move === false)
			return;

		drag.type = 'move';

		if (!drag.ismeta) {
			for (var key in self.cache) {
				var item = self.cache[key];
				var w = item.el.width();
				var h = item.el.height();
				var node = item.el;
				var pos = node.position();
				var rect2 = { x: zoom(pos.left), y: zoom(pos.top), width: zoom(w), height: zoom(h) };
				if (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y) {
					if (!item.actions || item.actions.move !== false)
						drag.selected.push({ id: node.attrd('id'), node: node, pos: pos, output: node.find('.output'), input: node.find('.input') });
				}
			}
		}
	});

	self.refresh_groups = function() {

		self.groups = self.get().groups || EMPTYARRAY;
		var groups = self.el.groups.find('> div');
		var db = {};

		for (var i = 0; i < groups.length; i++) {
			var tmp = $(groups[i]);
			db[tmp.attrd('id')] = tmp;
		}

		for (var i = 0; i < self.groups.length; i++) {
			var g = self.groups[i];
			var css = [];

			if (!g.id)
				g.id = 'g' + GUID(10);

			css.push('left:{0}px'.format(g.x));
			css.push('top:{0}px'.format(g.y));
			css.push('width:{0}px'.format(g.width));
			css.push('height:{0}px'.format(g.height));
			g.background && css.push('background:{0}'.format(g.background));
			g.color && css.push('color:{0}'.format(g.color));
			g.border && css.push('border-color:{0}'.format(g.border));

			if (db[g.id]) {
				db[g.id].attr('style', css.join(';')).find('label').text(g.name);
				delete db[g.id];
			} else
				self.el.groups.append('<div class="{0}-group{4}" style="{1}" data-id="{3}"><div><span class="{0}-resize-tl"></span><span class="{0}-resize-tr"></span><span class="{0}-resize-bl"></span><span class="{0}-resize-br"></span><label>{2}</label></div></div>'.format(cls, css.join(';'), g.name.encode(), g.id, g.tab ? (' tab-' + g.tab) : ''));
		}

		for (var key in db)
			db[key].remove();

	};

});
// End: j-Flow


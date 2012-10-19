/*
 * Raphael SVG Import 0.0.4 - Extension to Raphael JS
 *
 * Copyright (c) 2011 Wout Fierens
 * - Load order fix by Georgi Momchilov
 * - Prototype dependency removed by Matt Cook
 * - Groups/getElement() added by Jonathan Greene
 *
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */

/*\
* Paper.importSVG
[ method ]
**
* Renders valid SVG markup into elements/groups into a Raphael paper.
**
> Parameters
**
- rawSVG (string) string of SVG markup. eg) <svg>.*</svg> 
- [set] (set) a set in which to push all the rendered elements into
= (object) an object containing a 'getElement(id)'. Use this method to find any element/group in the imported items with the supplied id. The id will correlate to the id property of the node in the raw SVG string.
\*/
Raphael.fn.importSVG = function (rawSVG, set) {
	try {
		// valid SVG?
		if (typeof rawSVG === 'undefined') throw 'No data was provided.';
		
		rawSVG = rawSVG.replace(/\n|\r|\t/gi, '');

		if (!rawSVG.match(/<svg(.*?)>(.*)<\/svg>/i)) throw "The data you entered doesn't contain valid SVG.";
				
		var xmldoc;
		
		if(window.DOMParser){
			var xmlp = new DOMParser();
			xmldoc = xmlp.parseFromString(rawSVG, 'text/xml');
		} else {
			xmldoc = new ActiveXObject('Microsoft.XMLDOM');
			xmldoc.async = false;
			xmldoc.loadXML(rawSVG);
		}
		
		// root node of SVG doc
		var first = xmldoc.firstChild;//$.parseXML(rawSVG).firstChild;
		
		// reference to paper
		var r = this;
		
		// set to contain all items/sub-sets (eg group nodes)
		var rootset = r.set();
		rootset.import_id = 'root';
		
		// RegExps for finding nodes/style/attributes
		var findAttr  = new RegExp('([a-z\-:]+)="(.*?)"','gi'),
		findStyle = new RegExp('([a-z\-]+) ?: ?([^ ;]+)[ ;]?','gi'),
		findNodes = new RegExp('<(rect|polyline|circle|ellipse|path|polygon|image|text).*?\/>','gi');
		
		// internal function for recursing through SVG doc
		function parseNode(node, rset){
			for(var i=0, l = node.childNodes.length; i<l; i++){
				var child = node.childNodes[i];
				if(child && child.childNodes && child.childNodes.length){
					var s = r.set(); 
					s.import_id = child.id;
					rset.push(parseNode(child, s)); 
				} else {
					rset.push(convertNode(child));
				}
			}
		return rset;
		}
		
		// convert SVG DOM node to a string, and use the existing logic to render paths
		function convertNode(node){
			var nodestr;
			nodestr = new XMLSerializer().serializeToString(node);
			
			while(match = findNodes.exec(nodestr)){
				var shape, style,
				attr = { 'fill':'#000' },
				node = RegExp.$1;
				
				while(findAttr.exec(match)){
					switch(RegExp.$1) {
						case 'stroke-dasharray':
							attr[RegExp.$1] = '- ';
						break;
						case 'style':
							style = RegExp.$2;
						break;
						default:
							attr[RegExp.$1] = RegExp.$2;
						break;
					}
				};
				
				if (typeof attr['stroke-width'] === 'undefined') attr['stroke-width'] = (typeof attr['stroke'] === 'undefined' ? 0 : 1);
				
				if (style) while(findStyle.exec(style)) attr[RegExp.$1] = RegExp.$2;
				
				switch(node) {
					case 'rect':
						shape = r.rect();
					break;
					case 'circle':
						shape = r.circle();
					break;
					case 'ellipse':
						shape = r.ellipse();
					break;
					case 'path':
						shape = r.path(attr['d']);
					break;
					case 'polygon':
						shape = r.polygon(attr['points']);
					break;
					case 'image':
						shape = r.image(attr['xlink:href']);
					break;
				}
				
				shape.attr(attr);
				
				if(attr.id) shape.import_id = attr.id
				
				if (typeof set !== 'undefined') set.push(shape);
			};
			
			return shape;
		}
		
		function getElement(set, id){
			var ret;
			set.forEach(function(item){
				if(item.import_id == id){
					ret = item;
					return false;
				} else if(item.type == 'set'){
					ret = getElement(item, id)
					if(ret) return false;
				} else {
					return true;
				}
			});
			return ret;
		}
		
		// recurse through the SVG doc and store path nodes as elements, and groups as sets
		parseNode(first, rootset);
		
		return {
			getElement: function(id) { return getElement(rootset, id); }
		}
	} catch (error) {
		alert('The SVG data you entered was invalid! (' + error + ')');
	}
};

// extending raphael with a polygon function
Raphael.fn.polygon = function(pointString) {
	var poly  = ['M'],
	point = pointString.split(' ');
	
	for(var i=0; i < point.length; i++) {
		var c = point[i].split(',');
		for(var j=0; j < c.length; j++) {
			var d = parseFloat(c[j]);
			if (d) poly.push(d);
		};
		if (i == 0) poly.push('L');
	}
	poly.push('Z');
	
	return this.path(poly);
};
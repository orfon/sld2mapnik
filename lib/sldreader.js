var {DocumentBuilder, DocumentBuilderFactory} = javax.xml.parsers;
var {Document, NodeList, Node, Element} =  org.w3c.dom;

var $o = require('ringo/utils/objects');

// default Path style applied if nothing matches
var defaultStyle = exports.defaultStyle = {
   stroke: true,
   color: "#03f",
   weight: 5,
   opacity: 1,
   fillOpacity: 1,
   fillColor: '#03f',
   strokeOpacity: 1,
   strokeWidth: 1,
   strokeDashstyle: "solid",
   pointRadius: 3,
   dashArray: null,
   lineJoin: null,
   lineCap: null,
};

// attributes converted to numeric values
var numericAttributes = ['weight', 'opacity', 'fillOpacity', 'strokeOpacity'];

// mapping between SLD attribute names and SVG names
var attributeNameMapping = {
   'stroke': 'color',
   'stroke-width': 'weight',
   'stroke-opacity': 'opacity',
   'fill-opacity': 'fillOpacity',
   'fill': 'fillColor',
   'stroke-opacity': 'strokeOpacity',
   'stroke-dasharray': 'dashArray',
   //strokeDashstyle,
   //pointRadius,
   'stroke-linejoin': 'lineJoin',
   'stroke-linecap': 'lineCap'
};

// mapping SLD operators to shortforms
var comparisionOperatorMapping = {
   'ogc:PropertyIsEqualTo': '==',
   'ogc:PropertyIsNotEqualTo': '!=',
   'ogc:PropertyIsLessThan': '<',
   'ogc:PropertyIsGreaterThan': '>',
   'ogc:PropertyIsLessThanOrEqualTo': '<=',
   'ogc:PropertyIsGreaterThanOrEqualTo': '>=',
   //'ogc:PropertyIsNull': 'isNull',
   //'ogc:PropertyIsBetween'
   // ogc:PropertyIsLike
};

// namespaces for Tag lookup in XML
var namespaceMapping = {
   se: 'http://www.opengis.net/se',
   ogc: 'http://www.opengis.net/ogc'
};

exports.documentFromPath = function(path) {
   var xmlFile = new java.io.File(path);
   var dbFactory = DocumentBuilderFactory.newInstance();
   var dBuilder = dbFactory.newDocumentBuilder();
   dBuilder.setErrorHandler(new org.xml.sax.ErrorHandler({
      error: function() {
         console.error(arguments);
      },
      fatalError: function() {
         console.error(arguments);
      },
      warning: function() {
         console.error(arguments)
      }
   }))

   var doc = dBuilder.parse(xmlFile);
   return doc;
};

exports.documentFromString = function(string) {
   var jString = new java.lang.String(string);
   var stream = new java.io.ByteArrayInputStream(jString.getBytes('utf-8'));

   var dbFactory = DocumentBuilderFactory.newInstance();
   var dBuilder = dbFactory.newDocumentBuilder();
   dBuilder.setErrorHandler(new org.xml.sax.ErrorHandler({
      error: function() {
         console.error(arguments);
      },
      fatalError: function() {
         console.error(arguments);
      },
      warning: function() {
         console.error(arguments)
      }
   }))

   var doc = dBuilder.parse(stream);
   return doc;
}

function getTagNameArray(element, tagName) {
   var elements = element.getElementsByTagName(tagName);
   var arr = [];
   for (var i = 0; i < elements.getLength(); i++) {
      arr.push(elements.item(i));
   }
   return arr;
};

var SLDReader = exports.SLDReader = {

   // translates PolygonSymbolizer attributes into Path attributes
   parseSymbolizer: function(symbolizer) {
      // SvgParameter names below se:Fill and se:Stroke
      // are unique so don't bother parsing them seperatly.
      var parameters = getTagNameArray(symbolizer, 'se:SvgParameter');
      var cssParams = $o.merge({}, defaultStyle);
      parameters.forEach(function(param) {
         var key = param.getAttribute('name');
         var mappedKey = attributeNameMapping[key];
         if (false == (mappedKey in cssParams)) {
            console.error("Ignorning unknown SvgParameter name", key);
         } else {
            var value = param.textContent;
            if (numericAttributes.indexOf(mappedKey) > -1) {
               value = parseFloat(value, 10);
            } else if (mappedKey === 'dashArray') {
               value = value.split(' ').join(', ');
            }
            cssParams[mappedKey] = value;
         }
      });
      return cssParams;
   },
   parseFilter: function(filter) {

      var hasAnd = getTagNameArray(filter, 'ogc:And').length;
      var hasOr = getTagNameArray(filter, 'ogc:Or').length;
      var filterJson = {
         operator: hasAnd == true ? 'and' : hasOr ?  'or' : null,
         comparisions: []
      };
      Object.keys(comparisionOperatorMapping).forEach(function(key) {
         var comparisionElements = getTagNameArray(filter, key);
         var comparisionOperator = comparisionOperatorMapping[key];
         comparisionElements.forEach(function(comparisionElement) {
            var property = getTagNameArray(comparisionElement, 'ogc:PropertyName')[0].textContent;
            var literal = getTagNameArray(comparisionElement, 'ogc:Literal')[0].textContent;
            filterJson.comparisions.push({
               operator: comparisionOperator,
               property: property,
               literal: literal
            })
         })
      });
      return filterJson;
   },
   parseRule: function(rule) {

      var filter = getTagNameArray(rule, 'ogc:Filter')[0];
      var symbolizer = getTagNameArray(rule, 'se:PolygonSymbolizer')[0];
      return {
         filter: this.parseFilter(filter),
         symbolizer: this.parseSymbolizer(symbolizer)
      }
   },
   parse: function(sldStringOrXml) {
      var xmlDoc = sldStringOrXml;
      if (typeof(sldStringOrXml) === 'string') {
         var parser = new DOMParser();
         xmlDoc = parser.parseFromString(sldStringOrXml, "text/xml");
      }
      var featureTypeStyles = getTagNameArray(xmlDoc, 'se:FeatureTypeStyle');
      return featureTypeStyles.map(function(featureTypeStyle) {
         var rules = getTagNameArray(featureTypeStyle, 'se:Rule');
         return rules.map(function(rule) {
            return this.parseRule(rule);
         }, this);
      }, this);
   }
};

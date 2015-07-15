var {Document, NodeList, Node, Element} =  org.w3c.dom;
var {xmlFromString, getElementsByTagName} = require('./utils');

var $o = require('ringo/utils/objects');

// default Path style
var defaultStyle = exports.defaultStyle = {
   stroke: true,
   type: "polygon",
   color: "#03f",
   weight: 1,
   opacity: 1,
   fillOpacity: 1,
   fillColor: '#03f',
   strokeOpacity: 1,
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
   'ogc:PropertyIsEqualTo': '=',
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


/**
 * Parses the styling information of a "se:PolygonSymbolizer" Tag into an object representation.
 * Names of styling attributes are mapped to their SVG equivalent.
 * e.g. SLD property "stroke" is called "color" in SVG.
 *
 * @param {org.w3c.dom.Node} the se:PolygonSymbolizer element
 * @returns {Object}
 */
var parseSymbolizer = exports.parseSymbolizer = function(symbolizer) {
   // SvgParameter names below se:Fill and se:Stroke
   // are unique so don't bother parsing them seperatly.
   var parameters = getElementsByTagName(symbolizer, 'se:SvgParameter');
   var cssParams = $o.merge({}, defaultStyle);
   if (symbolizer.tagName === 'se:PolygonSymbolizer') {
      cssParams.type = 'polygon';
   } else if (symbolizer.tagName == 'se:PointSymbolizer') {
      cssParams.type = 'point';
   } else {
      console.error('Unkonown Symbolizer', symbolizer.tagName)
   }
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

   // point symbolizer only
   if (cssParams.type == 'point') {
      cssParams.image = getElementsByTagName(symbolizer, 'se:WellKnownName')[0].textContent;
   }
   return cssParams;
};

/**
 * Parses a ogc:Filter element into an object representation.
 * @param {org.w3c.dom.Node} the ogc:Filter element
 * @returns {Object} object holding the filter comparisions
 */
var parseFilter = exports.parseFilter = function(filter) {
   var hasAnd = getElementsByTagName(filter, 'ogc:And').length;
   var hasOr = getElementsByTagName(filter, 'ogc:Or').length;
   var filterJson = {
      operator: hasAnd == true ? 'and' : hasOr ?  'or' : null,
      comparisions: []
   };
   Object.keys(comparisionOperatorMapping).forEach(function(key) {
      var comparisionElements = getElementsByTagName(filter, key);
      var comparisionOperator = comparisionOperatorMapping[key];
      comparisionElements.forEach(function(comparisionElement) {
         var property = getElementsByTagName(comparisionElement, 'ogc:PropertyName')[0].textContent;
         var literal = getElementsByTagName(comparisionElement, 'ogc:Literal')[0].textContent;
         filterJson.comparisions.push({
            operator: comparisionOperator,
            property: property,
            literal: literal
         })
      })
   });
   return filterJson;
};

/**
 * Parses a se:Rule element into an object representation. The filter and symbolizer elements
 * contained in the se:Rule are parsed using `parseFilter` and `parseSymbolizer` respectively.
 *
 * @param {org.w3c.dom.Node} the se:Rule element
 * @returns {Object} an object containing an `filter` and `symbozlier` property.
 */
var parseRule = exports.parseRule =  function(rule) {

   var filter = getElementsByTagName(rule, 'ogc:Filter')[0];
   var symbolizer = getElementsByTagName(rule, 'se:PolygonSymbolizer')[0] || getElementsByTagName(rule, 'se:PointSymbolizer')[0];
   return {
      filter: filter !== undefined ? parseFilter(filter) : null,
      symbolizer: parseSymbolizer(symbolizer)
   }
};

/**
 * Parses a StyledLayerDescriptor document into an object represetnation. Only FeatureTypeStyles and their
 * Rules and symbolizers are transformed.
 *
 * @param {String|org.w3c.dom.Node} the XML document, either parsed or as a string
 * @returns {Array} an array with all FeatureTypeStyles in the XML document.
 */

var parse = exports.parse = function(sldStringOrXml) {
   var xmlDoc = sldStringOrXml;
   if (typeof(sldStringOrXml) === 'string') {
      xmlDoc = xmlFromString(sldStringOrXml);
   }
   var featureTypeStyles = getElementsByTagName(xmlDoc, 'se:FeatureTypeStyle');
   return featureTypeStyles.map(function(featureTypeStyle) {
      var rules = getElementsByTagName(featureTypeStyle, 'se:Rule');
      return rules.map(function(rule) {
         return parseRule(rule);
      });
   });
};

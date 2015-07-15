var {DocumentBuilder, DocumentBuilderFactory} = javax.xml.parsers;
var fs = require('fs');

var slreader = require('./sldreader');
var {xmlFromPath, xmlToString} = require('./utils')

var attributeMapping = {
   // @@ enable/disable stroke with this
   "stroke": null,
   "color": "stroke",
   "weight": "stroke-width",
   "opacity": "fill-opacity",
   "fillOpacity": "fill-opacity",
   "fillColor": "fill",
   "strokeOpacity": "stroke-opacity",
   "strokeWidth": "stroke-width",
   // does not exist in mapnik: "strokeDashstyle": ""
   "dashArray": "stroke-dasharray",
   "lineJoin": "stroke-linejoin",
   "lineCap": "stroke-linecap"
};

/**
 * Produces mapnik.xml files given the JSON representation of FeatureTypeStyles as produced by sldreader.
 * @param {String} optional metadata information about about a map and its layers.
 */
var MapnikWriter = exports.MapnikWriter = function(mapMetadata) {

   // assuming mercator projection for all maps
   var attrs = {
      'srs': '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over',
      'background-color': 'transparent',
      'buffer-size': "128"
   }

   /**
    * Create a Filter tag based on the rule.
    * @param {Object} SLD rule object representation
    * @returns {org.w3c.dom.Node} a Filter tag
    */
   this.createFilter = function(filter) {
      var $filter = $doc.createElement('Filter');
      var isAnd = filter.operator == null || filter.operator == 'and';
      var filterString = "";
      filter.comparisions.forEach(function(comparision, idx) {
         filterString += '[' + comparision.property + '] ';
         filterString += comparision.operator;
         if (typeof(comparision.literal) == 'string') {
            filterString += ' "' + comparision.literal + '"';
         } else {
            filterString += ' ' + comparision.literal;
         }

         if (idx !== filter.comparisions.length-1) {
            if (true == isAnd) {
               filterString += ' and ';
            } else {
               filterString += ' or ';
            }
         }
      });
      var $filterText = $doc.createTextNode(filterString);
      $filter.appendChild($filterText);
      return $filter;
   }

   /**
    * Create Polygon- and LineSymbolizer tags for the given symbolizer representation
    * @param {symbolizer}
    */
   this.createSymbolizers = function(symbolizer) {
      var $polygon = $doc.createElement('PolygonSymbolizer');
      var $line = $doc.createElement('LineSymbolizer');

      Object.keys(symbolizer).forEach(function(key) {
         var attribute = attributeMapping[key];
         if (null == attribute) {
            //console.error('Unmapped attribute', key);
            return;
         }
         var val = symbolizer[key];
         if (val === null || val === undefined) {
            return;
         }
         if (attribute.substring(0, 6) == 'stroke') {
            $line.setAttribute(attribute, val);
         } else {
            $polygon.setAttribute(attribute, val);
         }
      });

      return [$polygon, $line];
   }

   /**
    * Adds a rule to an existing style element
    * @param {org.w3c.dom.Node} the mapnik "Style" tag below which the rule should be attached
    * @param {Object} rule information object
    */
   this.addRule = function($style, rule) {
      var $rule = $doc.createElement('Rule');

      var $filter = this.createFilter(rule.filter);
      var [$polygon, $line] = this.createSymbolizers(rule.symbolizer);

      $rule.appendChild($filter);
      $rule.appendChild($polygon);
      $rule.appendChild($line);

      $style.appendChild($rule);
      return $rule;
   };

   /**
    * Adds an array of FeatureTypeStyles to an existing map.
    * @param {Array} an array of FeatureTypeStyle object representations
    * @param {String} unique name of the style
    */
   this.addStyle = function(featureTypeStyles, name) {
      featureTypeStyles.forEach(function(rules) {
         var $style = $doc.createElement('Style');
         $style.setAttribute('name', name);

         rules.forEach(function(rule) {
            this.addRule($style, rule);
         }, this);

         $map.appendChild($style);
      }, this);
   };

   /**
    * Add a relatively referenced layer geojson to the map.
    *
    * @param {String} path to the geojson file relative to the mapnik.xml or absolute
    * @returns {String} unique name of the style for this layer
    */
   this.addLayer = function(geoJsonPath, name) {
      var $layer = $doc.createElement('Layer');
      $layer.setAttribute('name', name);
      $layer.setAttribute('status', 'on');
      $layer.setAttribute('srs', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');
      $layer.setAttribute('buffer-size', "128");

      var $styleName = $doc.createElement('StyleName');
      var styleName = java.util.UUID.randomUUID().toString()
      $styleName.setTextContent(styleName);
      $layer.appendChild($styleName);

      var $dataSource = $doc.createElement('Datasource');
      var $paramType = $doc.createElement('Parameter');
      $paramType.setAttribute('name', 'type');
      $paramType.setTextContent('ogr');
      $dataSource.appendChild($paramType);

      var $paramLayer = $doc.createElement('Parameter');
      $paramLayer.setAttribute('name', 'layer');
      $paramLayer.setTextContent('OGRGeoJSON');
      $dataSource.appendChild($paramLayer)

      //@@@ relative file and add name=base parameter

      var $paramFile = $doc.createElement('Parameter');
      $paramFile.setAttribute('name', 'file');
      var $cdata = $doc.createCDATASection(geoJsonPath);
      $paramFile.appendChild($cdata);
      $dataSource.appendChild($paramFile);
      $layer.appendChild($dataSource);

      $map.appendChild($layer);
      return styleName;
   }

   this.addMap = function(map) {
      map.layers.forEach(function(layer) {
         var geoJsonPath = fs.join(baseDirectory, layer.geojson);
         var sld = xmlFromPath(fs.join(baseDirectory, layer.sld));

         var styleName = this.addLayer(geoJsonPath, layer.title);
         var featureTypeStyles = SLDReader.parse(sld);
         this.addStyle(featureTypeStyles, styleName);
      }, this);
   }

   this.toString = function() {
      return xmlToString(this.$doc);
   }

   var docFactory = DocumentBuilderFactory.newInstance();
   var docBuilder = docFactory.newDocumentBuilder();
   var $doc = docBuilder.newDocument();
   this.$doc = $doc;
   var $map = $doc.createElement('Map');
   this.$map = $map;
   // set default attributes on map
   Object.keys(attrs).forEach(function(key) {
      $map.setAttribute(key, attrs[key]);
   });
   $doc.appendChild($map);

   if (mapMetadata !== undefined) {
      this.addMap(mapMetadata);
   }

   return this;
}

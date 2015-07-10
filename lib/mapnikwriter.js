var {DocumentBuilder, DocumentBuilderFactory} = javax.xml.parsers;
var {TransformerFactory} = javax.xml.transform;
var {StreamResult} = javax.xml.transform.stream;
var {DOMSource} = javax.xml.transform.dom;
var {SLDReader, documentFromPath} = require('./sldreader');
var fs = require('fs');

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
   // does not exist "strokeDashstyle": ""
   "dashArray": "stroke-dasharray",
   "lineJoin": "stroke-linejoin",
   "lineCap": "stroke-linecap"
};

var MapnikWriter = exports.MapnikWriter = function() {

   var attrs = {
      'srs': '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over',
      'background-color': 'transparent',
      'buffer-size': "128"
   }

   /**
    * Adds a rule to an existing style element
    */
   this.addRule = function($style, rule) {
      var $rule = $doc.createElement('Rule');
      var isAnd = rule.filter.operator == null || rule.filter.operator == 'and';

      var $filter = $doc.createElement('Filter');
      var filterString = "";
      rule.filter.comparisions.forEach(function(comparision, idx) {
         filterString += '[' + comparision.property + '] ';
         filterString += comparision.operator;
         filterString += ' ' + comparision.literal;

         if (idx !== rule.filter.comparisions.length-1) {
            if (true == isAnd) {
               filterString += ' and ';
            } else {
               filterString += ' or ';
            }
         }
      });
      var $filterText = $doc.createTextNode(filterString);
      $filter.appendChild($filterText);

      var $polygon = $doc.createElement('PolygonSymbolizer');
      var $line = $doc.createElement('LineSymbolizer');

      Object.keys(rule.symbolizer).forEach(function(key) {
         var attribute = attributeMapping[key];
         if (null == attribute) {
            //console.error('Unmapped attribute', key);
            return;
         }
         var val = rule.symbolizer[key];
         if (val === null || val === undefined) {
            return;
         }
         if (attribute.substring(0, 6) == 'stroke') {
            $line.setAttribute(attribute, val);
         } else {
            $polygon.setAttribute(attribute, val);
         }
      });

      $rule.appendChild($filter);
      $rule.appendChild($polygon);
      $rule.appendChild($line);

      $style.appendChild($rule);
      return $rule;
   };

   /**
    * Adds a style to an existing map
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
    * Add layer data to the map.
    * @returns {String} name of the style to be used for this layer
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

   this.addMap = function(mapPath) {
      map.layers.forEach(function(layer) {
         var geoJsonPath = fs.join(baseDirectory, layer.geojson);
         var sld = documentFromPath(fs.join(baseDirectory, layer.sld));

         var styleName = this.addLayer(geoJsonPath, layer.title);
         var featureTypeStyles = SLDReader.parse(sld);
         this.addStyle(featureTypeStyles, styleName);
      }, this);
   }

   this.toString = function() {
      try {
         var transformer = TransformerFactory.newInstance().newTransformer();
         var result = new StreamResult(new java.io.StringWriter());
         var source = new DOMSource($doc);
         transformer.transform(source, result);
         return result.getWriter().toString();
      } catch(ex) {
         console.error(ex);
         return null;
      }
   }

   var docFactory = DocumentBuilderFactory.newInstance();
   var docBuilder = docFactory.newDocumentBuilder();
   //root elements
   var $doc = docBuilder.newDocument();
   this.$doc = $doc;
   var $map = $doc.createElement('Map');
   this.$map = $map;

   Object.keys(attrs).forEach(function(key) {
      $map.setAttribute(key, attrs[key]);
   });
   $doc.appendChild($map);

   return this;
}

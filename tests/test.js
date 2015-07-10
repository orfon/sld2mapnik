var assert = require("assert");
var fs = require('fs');
var {SLDReader, documentFromPath, documentFromString, defaultStyle} = require('../lib/sldreader');
var {MapnikWriter} = require("../lib/mapnikwriter");
var {TransformerFactory} = javax.xml.transform;
var {StreamResult} = javax.xml.transform.stream;
var {DOMSource} = javax.xml.transform.dom;
var $o = require('ringo/utils/objects');
var {Map} = require("../lib/map");

var xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?>\
               <FakeWrapper xmlns:ogc="http://www.opengis.net/ogc" xmlns:se="http://www.opengis.net/se">';
var xmlSuffix = '</FakeWrapper>';

var symbolizerFixtures = [
   {
      input: '<se:Fill>\
         <se:SvgParameter name="fill">#fff5f0</se:SvgParameter>\
         </se:Fill>\
         <se:Stroke>\
         <se:SvgParameter name="stroke">#00ff00</se:SvgParameter>\
         <se:SvgParameter name="stroke-width">0.26</se:SvgParameter>\
         </se:Stroke>',
      output: $o.merge({
        fillColor: "#fff5f0",
        color: "#00ff00",
        weight: 0.26,
      }, defaultStyle),
   },
   {
      input: '<se:Stroke>\
         <se:SvgParameter name="stroke">#ff0000</se:SvgParameter>\
         <se:SvgParameter name="stroke-width">0.26</se:SvgParameter>\
         <se:SvgParameter name="stroke-linejoin">bevel</se:SvgParameter>\
         <se:SvgParameter name="stroke-linecap">square</se:SvgParameter>\
         </se:Stroke>',
      output: $o.merge({
         color: '#ff0000',
         weight: 0.26,
         lineJoin: 'bevel',
         lineCap: 'square'
      }, defaultStyle)
   },
   {
      input: '<se:Fill>\
         <se:SvgParameter name="fill">#fff5f0</se:SvgParameter>\
         <se:SvgParameter name="fill-opacity">0.96</se:SvgParameter>\
         </se:Fill>\
         <se:Stroke>\
         <se:SvgParameter name="stroke">#000000</se:SvgParameter>\
         <se:SvgParameter name="stroke-opacity">0.96</se:SvgParameter>\
         <se:SvgParameter name="stroke-width">0.26</se:SvgParameter>\
         <se:SvgParameter name="stroke-dasharray">1 2</se:SvgParameter>\
         </se:Stroke>',
      output: $o.merge({
         color: "#000000",
         fillColor: '#fff5f0',
         fillOpacity: 0.96,
         weight: 0.26,
         dashArray: '1, 2',
         strokeOpacity: 0.96
      }, defaultStyle)
   }
];

var filterFixtures = [
   {
      input: '<ogc:Filter>\
              <ogc:PropertyIsGreaterThan>\
                <ogc:PropertyName>PR_AUT</ogc:PropertyName>\
                <ogc:Literal>36.36</ogc:Literal>\
              </ogc:PropertyIsGreaterThan>\
          </ogc:Filter>',
      output: {
            operator: null,
            comparisions: [
               {
                  operator: '>',
                  property: 'PR_AUT',
                  literal: "36.36"
               }
            ]
         }
   },
   {
      input: '<ogc:Filter>\
            <ogc:And>\
              <ogc:PropertyIsGreaterThan>\
                <ogc:PropertyName>PR_AUT</ogc:PropertyName>\
                <ogc:Literal>36.36</ogc:Literal>\
              </ogc:PropertyIsGreaterThan>\
              <ogc:PropertyIsLessThanOrEqualTo>\
                <ogc:PropertyName>PR_AUT</ogc:PropertyName>\
                <ogc:Literal>48.464</ogc:Literal>\
              </ogc:PropertyIsLessThanOrEqualTo>\
            </ogc:And>\
          </ogc:Filter>',
      output: {
            operator: 'and',
            comparisions: [
               {
                  operator: '>',
                  property: 'PR_AUT',
                  literal: "36.36"
               },
               {
                  operator: '<=',
                  property: 'PR_AUT',
                  literal: "48.464"
               }
            ]
         }
   }
   //OrRule:
];

var ruleFixtures = [
   {
      input: '<se:Rule>\
          <se:Name> 36.4 - 48.5 </se:Name>\
          <se:Description>\
            <se:Title> 36.4 - 48.5 </se:Title>\
          </se:Description>\
          <ogc:Filter>\
            <ogc:And>\
              <ogc:PropertyIsGreaterThan>\
                <ogc:PropertyName>PR_AUT</ogc:PropertyName>\
                <ogc:Literal>36.36</ogc:Literal>\
              </ogc:PropertyIsGreaterThan>\
              <ogc:PropertyIsLessThanOrEqualTo>\
                <ogc:PropertyName>PR_AUT</ogc:PropertyName>\
                <ogc:Literal>48.464</ogc:Literal>\
              </ogc:PropertyIsLessThanOrEqualTo>\
            </ogc:And>\
          </ogc:Filter>\
          <se:PolygonSymbolizer>\
            <se:Fill>\
              <se:SvgParameter name="fill">#fff5f0</se:SvgParameter>\
              <se:SvgParameter name="fill-opacity">0.96</se:SvgParameter>\
            </se:Fill>\
            <se:Stroke>\
              <se:SvgParameter name="stroke">#000000</se:SvgParameter>\
              <se:SvgParameter name="stroke-opacity">0.96</se:SvgParameter>\
              <se:SvgParameter name="stroke-width">0.26</se:SvgParameter>\
              <se:SvgParameter name="stroke-dasharray">1 2</se:SvgParameter>\
            </se:Stroke>\
          </se:PolygonSymbolizer>\
        </se:Rule>',
      output: {
         filter: {
            operator: 'and',
            comparisions: [
               {
                  operator: '>',
                  property: 'PR_AUT',
                  literal: "36.36"
               },
               {
                  operator: '<=',
                  property: 'PR_AUT',
                  literal: "48.464"
               }
            ]
         },
         symbolizer: $o.merge({
            color: "#000000",
            fillColor: '#fff5f0',
            fillOpacity: 0.96,
            weight: 0.26,
            dashArray: '1, 2',
            strokeOpacity: 0.96
         }, defaultStyle)
      },
      mapnikOutput: '<?xml version="1.0" encoding="UTF-8"?>\
      <Rule>\
      <Filter>[PR_AUT] &gt; 36.36 and [PR_AUT] &lt;= 48.464</Filter>\
      <PolygonSymbolizer fill="#fff5f0" fill-opacity="0.96"/>\
      <LineSymbolizer stroke="#000000" stroke-dasharray="1, 2" stroke-opacity="0.96" stroke-width="1"/>\
      </Rule>'
   }
];


function xmlToString($xml) {
   try {
      var transformer = TransformerFactory.newInstance().newTransformer();
      var result = new StreamResult(new java.io.StringWriter());
      var source = new DOMSource($xml);
      transformer.transform(source, result);
      return result.getWriter().toString();
   } catch(ex) {
      console.error(ex);
      return null;
   }
}

exports.testRuleWriter = function() {

   var mapnikWriter = new MapnikWriter();
   ruleFixtures.forEach(function(fixture) {
      var $rule = mapnikWriter.addRule(mapnikWriter.$map, fixture.output);
      assert.deepEqual(xmlToString($rule), fixture.mapnikOutput.replace(/[\s]{2}/g, ''));
   })
};

exports.testWriter = function() {
   var mapPath = module.resolve('./data/map.json');
   var map = new Map(mapPath);
   map.createMapnikXmls();

   assert.deepEqual(map.data, {
       "name": "Wien Ausländeranteil",
       "enableLayerControl": false,
       "enableZoom": false,
       "enablePopups": true,
       "basemaps": [
           {
               "url": "http://maps{s}.wien.gv.at/basemap/bmapgrau/normal/google3857/{z}/{y}/{x}.png",
               "attribution": "Basemap: <a target='_top' href='http://basemap.at'>basemap.at</a>'",
               "subdomains": [
                   "",
                   "1",
                   "2",
                   "3",
                   "4"
               ]
           }
       ],
       "layers": [
           {
               "title": "Österreicher",
               "sld": "austrians-vienna.sld",
               "geojson": "vienna.geojson",
               "mapnik": "austrians-vienna.xml",
               "tiles": null,
               "hasPopups": true,
               "disabled": false
           },
           {
               "title": "Deutsche",
               "sld": "germans-vienna.sld",
               "geojson": "vienna.geojson",
               "mapnik": "germans-vienna.xml",
               "tiles": null,
               "hasPopups": true,
               "disabled": false
           }
       ]
   });

   //map.renderTiles()

   var baseDirectory = fs.directory(mapPath);
   map.data.layers.forEach(function(layer) {
      var mapnikPath = fs.join(baseDirectory, layer.mapnik);
      assert.isTrue(fs.exists(mapnikPath));
      fs.remove(mapnikPath);
   })
}



var sldFixture = [[{"filter":{"operator":"and","comparisions":[{"operator":">","property":"PR_AUT","literal":"36.36"},{"operator":"<=","property":"PR_AUT","literal":"48.464"}]},"symbolizer":{"stroke":true,"color":"#000000","weight":0.26,"opacity":1,"fillOpacity":0.96,"fillColor":"#fff5f0","strokeOpacity":0.96,"strokeWidth":1,"strokeDashstyle":"solid","pointRadius":3,"dashArray":"1, 2","lineJoin":null,"lineCap":null}},{"filter":{"operator":"and","comparisions":[{"operator":">","property":"PR_AUT","literal":"48.464"},{"operator":"<=","property":"PR_AUT","literal":"60.568"}]},"symbolizer":{"stroke":true,"color":"#000000","weight":0.26,"opacity":1,"fillOpacity":1,"fillColor":"#fcbda4","strokeOpacity":1,"strokeWidth":1,"strokeDashstyle":"solid","pointRadius":3,"dashArray":null,"lineJoin":null,"lineCap":null}},{"filter":{"operator":"and","comparisions":[{"operator":">","property":"PR_AUT","literal":"60.568"},{"operator":"<=","property":"PR_AUT","literal":"72.672"}]},"symbolizer":{"stroke":true,"color":"#000000","weight":0.26,"opacity":1,"fillOpacity":1,"fillColor":"#fb7050","strokeOpacity":1,"strokeWidth":1,"strokeDashstyle":"solid","pointRadius":3,"dashArray":null,"lineJoin":null,"lineCap":null}},{"filter":{"operator":"and","comparisions":[{"operator":">","property":"PR_AUT","literal":"72.672"},{"operator":"<=","property":"PR_AUT","literal":"84.776"}]},"symbolizer":{"stroke":true,"color":"#000000","weight":0.26,"opacity":1,"fillOpacity":1,"fillColor":"#d32020","strokeOpacity":1,"strokeWidth":1,"strokeDashstyle":"solid","pointRadius":3,"dashArray":null,"lineJoin":null,"lineCap":null}},{"filter":{"operator":"and","comparisions":[{"operator":">","property":"PR_AUT","literal":"84.776"},{"operator":"<=","property":"PR_AUT","literal":"96.88"}]},"symbolizer":{"stroke":true,"color":"#000000","weight":0.26,"opacity":1,"fillOpacity":1,"fillColor":"#67000d","strokeOpacity":1,"strokeWidth":1,"strokeDashstyle":"solid","pointRadius":3,"dashArray":null,"lineJoin":null,"lineCap":null}}]];


exports.testSymbolizer = function() {
   symbolizerFixtures.forEach(function(fixture) {
      var input = xmlPrefix + fixture.input + xmlSuffix;
      var xmlDoc = documentFromString(input);
      assert.deepEqual(SLDReader.parseSymbolizer(xmlDoc), fixture.output);
   })
};

exports.testFilter = function() {
   filterFixtures.forEach(function(fixture) {
      var input = xmlPrefix + fixture.input + xmlSuffix;
      var xmlDoc = documentFromString(input);

      assert.deepEqual(SLDReader.parseFilter(xmlDoc), fixture.output);
   });
};



exports.testRule = function() {
   ruleFixtures.forEach(function(fixture) {
      var input = xmlPrefix + fixture.input + xmlSuffix;
      var xmlDoc = documentFromString(input);

      assert.deepEqual(SLDReader.parseRule(xmlDoc), fixture.output);
   });
};



exports.testCompleteSld = function() {

   var doc = documentFromPath(module.resolve('./data/austrians-vienna.sld'));
   var featureRules = SLDReader.parse(doc);
   assert.deepEqual(featureRules, sldFixture);
}
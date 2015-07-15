var assert = require("assert");
var fs = require('fs');
var $o = require('ringo/utils/objects');

var sldreader = require('../lib/sldreader');
var {defaultStyle} = require('../lib/sldreader');
var {xmlFromString, xmlToString} = require('../lib/utils');
var {MapnikWriter} = require("../lib/mapnikwriter");

var xmlPrefix = '<?xml version="1.0" encoding="UTF-8"?>\
               <FakeWrapper xmlns:ogc="http://www.opengis.net/ogc" xmlns:se="http://www.opengis.net/se">';
var xmlSuffix = '</FakeWrapper>';

var symbolizerFixtures = [
   {
      input: '<se:PolygonSymbolizer>\
         <se:Fill>\
         <se:SvgParameter name="fill">#fff5f0</se:SvgParameter>\
         </se:Fill>\
         <se:Stroke>\
         <se:SvgParameter name="stroke">#00ff00</se:SvgParameter>\
         <se:SvgParameter name="stroke-width">0.26</se:SvgParameter>\
         </se:Stroke>\
         </se:PolygonSymbolizer>',
      output: $o.merge({
        fillColor: "#fff5f0",
        color: "#00ff00",
        weight: 0.26,
      }, defaultStyle),
      mapnikOutput: [
         '<?xml version=\"1.0\" encoding=\"UTF-8\"?><PolygonSymbolizer fill=\"#fff5f0\" fill-opacity=\"1\"/>',
         '<?xml version=\"1.0\" encoding=\"UTF-8\"?><LineSymbolizer stroke=\"#00ff00\" stroke-opacity=\"1\" stroke-width=\"0.26\"/>'
      ]
   },
   {
      input: '<se:PolygonSymbolizer><se:Stroke>\
         <se:SvgParameter name="stroke">#ff0000</se:SvgParameter>\
         <se:SvgParameter name="stroke-width">0.26</se:SvgParameter>\
         <se:SvgParameter name="stroke-linejoin">bevel</se:SvgParameter>\
         <se:SvgParameter name="stroke-linecap">square</se:SvgParameter>\
         </se:Stroke></se:PolygonSymbolizer>',
      output: $o.merge({
         color: '#ff0000',
         weight: 0.26,
         lineJoin: 'bevel',
         lineCap: 'square'
      }, defaultStyle),
      mapnikOutput: [
         '<?xml version=\"1.0\" encoding=\"UTF-8\"?><PolygonSymbolizer fill=\"#03f\" fill-opacity=\"1\"/>',
         '<?xml version=\"1.0\" encoding=\"UTF-8\"?><LineSymbolizer stroke=\"#ff0000\" stroke-linecap=\"square\" stroke-linejoin=\"bevel\" stroke-opacity=\"1\" stroke-width=\"0.26\"/>'
      ]
   },
   {
      input: '<se:PolygonSymbolizer><se:Fill>\
         <se:SvgParameter name="fill">#fff5f0</se:SvgParameter>\
         <se:SvgParameter name="fill-opacity">0.96</se:SvgParameter>\
         </se:Fill>\
         <se:Stroke>\
         <se:SvgParameter name="stroke">#000000</se:SvgParameter>\
         <se:SvgParameter name="stroke-opacity">0.96</se:SvgParameter>\
         <se:SvgParameter name="stroke-width">0.26</se:SvgParameter>\
         <se:SvgParameter name="stroke-dasharray">1 2</se:SvgParameter>\
         </se:Stroke></se:PolygonSymbolizer>',
      output: $o.merge({
         color: "#000000",
         fillColor: '#fff5f0',
         fillOpacity: 0.96,
         weight: 0.26,
         dashArray: '1, 2',
         strokeOpacity: 0.96
      }, defaultStyle),
      mapnikOutput: [
         '<?xml version=\"1.0\" encoding=\"UTF-8\"?><PolygonSymbolizer fill=\"#fff5f0\" fill-opacity=\"0.96\"/>',
         '<?xml version=\"1.0\" encoding=\"UTF-8\"?><LineSymbolizer stroke=\"#000000\" stroke-dasharray=\"1, 2\" stroke-opacity=\"0.96\" stroke-width=\"0.26\"/>'
      ]
   },
   {
      input: '<se:PointSymbolizer>\
         <se:Graphic>\
           <se:Mark>\
             <se:WellKnownName>circle</se:WellKnownName>\
             <se:Fill>\
               <se:SvgParameter name="fill">#93ebe0</se:SvgParameter>\
             </se:Fill>\
             <se:Stroke>\
               <se:SvgParameter name="stroke">#000000</se:SvgParameter>\
             </se:Stroke>\
           </se:Mark>\
           <se:Size>2</se:Size>\
         </se:Graphic>\
       </se:PointSymbolizer>',
       output: $o.merge({
         type: 'point',
         fillColor: '#93ebe0',
         color: '#000000',
         image: 'circle'
       }, defaultStyle),
       mapnikOutput: [
         '<?xml version=\"1.0\" encoding=\"UTF-8\"?><MarkersSymbolizer fill=\"#93ebe0\" fill-opacity=\"1\" stroke=\"#000000\" stroke-opacity=\"1\" stroke-width=\"5\"/>'
       ]
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
      },
      mapnikOutput: '<?xml version=\"1.0\" encoding=\"UTF-8\"?><Filter>[PR_AUT] &gt; 36.36</Filter>'
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
      },
      mapnikOutput: '<?xml version=\"1.0\" encoding=\"UTF-8\"?><Filter>[PR_AUT] &gt; 36.36 and [PR_AUT] &lt;= 48.464</Filter>'
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
      mapnikOutput: '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\
         <Rule><Filter>[PR_AUT] &gt; 36.36 and [PR_AUT] &lt;= 48.464</Filter>\
         <PolygonSymbolizer fill=\"#fff5f0\" fill-opacity=\"0.96\"/>\
         <LineSymbolizer stroke=\"#000000\" stroke-dasharray=\"1, 2\" stroke-opacity=\"0.96\" stroke-width=\"0.26\"/>\
         </Rule>'
   },
   {
      input: '<se:Rule>\
          <se:Name> 36.4 - 48.5 </se:Name>\
          <se:Description>\
            <se:Title> 36.4 - 48.5 </se:Title>\
          </se:Description>\
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
         "filter": null,
         "symbolizer": $o.merge({
           "color": "#000000",
           "weight": 0.26,
           "fillOpacity": 0.96,
           "fillColor": "#fff5f0",
           "strokeOpacity": 0.96,
           "strokeDashstyle": "solid",
           "dashArray": "1, 2",
         }, defaultStyle),
      },
      mapnikOutput: '<?xml version=\"1.0\" encoding=\"UTF-8\"?><Rule><PolygonSymbolizer fill=\"#fff5f0\" fill-opacity=\"0.96\"/><LineSymbolizer stroke=\"#000000\" stroke-dasharray=\"1, 2\" stroke-opacity=\"0.96\" stroke-width=\"0.26\"/></Rule>'
   }
];


var sldFixture = [ [ { "filter": { "operator": "and", "comparisions": [ { "operator": ">", "property": "PR_AUT", "literal": "36.36" }, { "operator": "<=", "property": "PR_AUT", "literal": "48.464" } ] }, "symbolizer": { "stroke": true, "type": "polygon", "color": "#000000", "weight": 0.26, "opacity": 1, "fillOpacity": 0.96, "fillColor": "#fff5f0", "strokeOpacity": 0.96, "strokeDashstyle": "solid", "pointRadius": 3, "dashArray": "1, 2", "lineJoin": null, "lineCap": null } }, { "filter": { "operator": "and", "comparisions": [ { "operator": ">", "property": "PR_AUT", "literal": "48.464" }, { "operator": "<=", "property": "PR_AUT", "literal": "60.568" } ] }, "symbolizer": { "stroke": true, "type": "polygon", "color": "#000000", "weight": 0.26, "opacity": 1, "fillOpacity": 1, "fillColor": "#fcbda4", "strokeOpacity": 1, "strokeDashstyle": "solid", "pointRadius": 3, "dashArray": null, "lineJoin": null, "lineCap": null } }, { "filter": { "operator": "and", "comparisions": [ { "operator": ">", "property": "PR_AUT", "literal": "60.568" }, { "operator": "<=", "property": "PR_AUT", "literal": "72.672" } ] }, "symbolizer": { "stroke": true, "type": "polygon", "color": "#000000", "weight": 0.26, "opacity": 1, "fillOpacity": 1, "fillColor": "#fb7050", "strokeOpacity": 1, "strokeDashstyle": "solid", "pointRadius": 3, "dashArray": null, "lineJoin": null, "lineCap": null } }, { "filter": { "operator": "and", "comparisions": [ { "operator": ">", "property": "PR_AUT", "literal": "72.672" }, { "operator": "<=", "property": "PR_AUT", "literal": "84.776" } ] }, "symbolizer": { "stroke": true, "type": "polygon", "color": "#000000", "weight": 0.26, "opacity": 1, "fillOpacity": 1, "fillColor": "#d32020", "strokeOpacity": 1, "strokeDashstyle": "solid", "pointRadius": 3, "dashArray": null, "lineJoin": null, "lineCap": null } }, { "filter": { "operator": "and", "comparisions": [ { "operator": ">", "property": "PR_AUT", "literal": "84.776" }, { "operator": "<=", "property": "PR_AUT", "literal": "96.88" } ] }, "symbolizer": { "stroke": true, "type": "polygon", "color": "#000000", "weight": 0.26, "opacity": 1, "fillOpacity": 1, "fillColor": "#67000d", "strokeOpacity": 1, "strokeDashstyle": "solid", "pointRadius": 3, "dashArray": null, "lineJoin": null, "lineCap": null } } ] ];


exports.testReadSymbolizer = function() {
   symbolizerFixtures.forEach(function(fixture, idx) {
      var input = xmlPrefix + fixture.input + xmlSuffix;
      var xmlDoc = xmlFromString(input);
      var $symbolizer = xmlDoc.getElementsByTagName('FakeWrapper').item(0).getChildNodes().item(0);
      assert.deepEqual(sldreader.parseSymbolizer($symbolizer), fixture.output);
   })
};

exports.testReadFilter = function() {
   filterFixtures.forEach(function(fixture) {
      var input = xmlPrefix + fixture.input + xmlSuffix;
      var xmlDoc = xmlFromString(input);

      assert.deepEqual(sldreader.parseFilter(xmlDoc), fixture.output);
   });
};

exports.testReadRule = function() {
   ruleFixtures.forEach(function(fixture) {
      var input = xmlPrefix + fixture.input + xmlSuffix;
      var xmlDoc = xmlFromString(input);

      assert.deepEqual(sldreader.parseRule(xmlDoc), fixture.output);
   });
};

exports.testReadCompleteSld = function() {

   var doc = fs.read((module.resolve('./data/austrians-vienna.sld')))
   var featureRules = sldreader.parse(doc);
   assert.deepEqual(featureRules, sldFixture);
};

exports.testWriteSymbolizer = function() {
   var mapnikWriter = new MapnikWriter();
   symbolizerFixtures.forEach(function(fixture) {
      var symbolizers = mapnikWriter.createSymbolizers(fixture.output);
      symbolizers.forEach(function(symbolizer, idx) {
         assert.deepEqual(xmlToString(symbolizer), fixture.mapnikOutput[idx])
      })
   })
};

exports.testWriteFilter = function() {
   var mapnikWriter = new MapnikWriter();
   filterFixtures.forEach(function(fixture) {
      var filter = mapnikWriter.createFilter(fixture.output);
      assert.deepEqual(xmlToString(filter), fixture.mapnikOutput);
   });
};

exports.testWriteRule = function() {

   var mapnikWriter = new MapnikWriter();
   ruleFixtures.forEach(function(fixture) {
      var $rule = mapnikWriter.addRule(mapnikWriter.$map, fixture.output);
      assert.deepEqual(xmlToString($rule), fixture.mapnikOutput.replace(/[\s]{2,}/g, ''));
   });
};


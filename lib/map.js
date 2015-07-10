var {MapnikWriter} = require('./mapnikwriter');
var {SLDReader, documentFromPath} = require('./sldreader');
var fs = require('fs');
var {command} = require('ringo/subprocess');

var generateTilesPy = module.resolve('../external/generate_tiles.py')

exports.Map = function(mapPath) {

   this.createMapnikXmls = function() {
      map.layers.forEach(function(layer) {
         var mapnikWriter = new MapnikWriter();
         var geoJsonPath = fs.join(baseDirectory, layer.geojson);
         var sldXML = documentFromPath(fs.join(baseDirectory, layer.sld));
         var sldJson = SLDReader.parse(sldXML);

         var styleName = mapnikWriter.addLayer(geoJsonPath, layer.title);
         mapnikWriter.addStyle(sldJson, styleName);


         var mapnikFile = fs.base(layer.sld, '.sld') + '.xml';
         var mapnikXmlPath = fs.join(baseDirectory, mapnikFile);
         layer.mapnik = mapnikFile;
         fs.write(mapnikXmlPath, mapnikWriter.toString());
      }, this);

   }

   this.save = function() {
      fs.write(mapPath, JSON.stringify(map));
   };

   this.renderTiles = function() {
      map.layers.forEach(function(layer) {
         var tileDirectory = java.util.UUID.randomUUID().toString()
         var tilesPath = fs.join(baseDirectory, tileDirectory, '/tiles/');
         layer.tiles = tilesPath;
         fs.makeTree(tilesPath);
         var output = command(generateTilesPy, {
            env: {
               MAPNIK_MAP_FILE: fs.join(baseDirectory, layer.mapnik),
               MAPNIK_TILE_DIR: tilesPath,
               // @@ figure this out from the geojson file
               MAPNIK_BBOX: "(1.0,10.0, 20.6,50.0)",
               MAPNIK_UTFGRID: true
            }
         });
         console.log(output);

      })
   }

   var map = this.data = JSON.parse(fs.read(mapPath));
   var baseDirectory = fs.directory(mapPath);
   return this;
}
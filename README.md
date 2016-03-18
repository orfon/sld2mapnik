** Obsolete repository. All functionality was merged into https://github.com/orfon/ringo-mapnik **

# What is this?

[SLD](http://docs.geoserver.org/latest/en/user/styling/sld-introduction.html) ("Styled Layer Descriptor") is a XML markup language to store the styling of geospatial data. It's an increasingly popular format to export styling and used by desktop and web GIS clients alike. 

This library converts the SLD format into the Mapnik styling format. [Mapnik](https://github.com/mapnik/mapnik/wiki/About-Mapnik) is a popular renderer for styled geospatial data.

# Convert SLD styling files into mapnik.xml

`sldreader` parses SLD style files into an intermediate object representation which can be turned into mapnik.xml with the `mapnikwriter`.

If you are familiar with mapnik's XML or SLD, the intermediate representation should be self explanatory.

For example a styling Rule with two AND comparisions and a polygon symbolizer might look like this:

    {
      filter: {
         operator: 'and',
         comparisions: [
            {
               operator: '>',
               property: 'republicanVotes',
               literal: "36.36"
            },
            {
               operator: '<=',
               property: 'republicanVotes',
               literal: "48.464"
            }
         ]
      },
      symbolizer: {
         type: 'polygon',
         color: "#000000",
         fillColor: '#fff5f0',
         fillOpacity: 0.96,
         weight: 0.26,
         dashArray: '1, 2',
         strokeOpacity: 0.96
      }
    },


Helpful links:

 * [Mapnik XML reference](https://github.com/mapnik/mapnik/wiki/XMLConfigReference)
 * [SLD introduction](http://docs.geoserver.org/stable/en/user/styling/sld-introduction.html)
 * [SLD spec](http://www.opengeospatial.org/standards/sld)

## Supported SLD concepts

Only FeatureTypeStyles are parsed. Rules can be ORed or ANDed.

The following comparisions are possible in rules:

 * ogc:PropertyIsEqualTo
 * ogc:PropertyIsNotEqualTo
 * ogc:PropertyIsLessThan
 * ogc:PropertyIsGreaterThan
 * ogc:PropertyIsLessThanOrEqualTo
 * ogc:PropertyIsGreaterThanOrEqualTo

The following PolygonSymbolizer or PointSymbolizer properties are applied:

 * stroke
 * stroke-width
 * stroke-opacity
 * fill-opacity
 * fill
 * stroke-opacity
 * stroke-dasharray
 * stroke-linejoin
 * stroke-linecap

To be done:

 * Better PointSymbolizer support

# Convert SLD styling files into mapnik.xml

`sldreader` parses SLD style files into an intermediate object representation which can be turned into mapnik.xml with the `mapnikwriter`.

See the unit tests for the format of the intermediate object representation.

## Supported SLD concepts

Only FeatureTypeStyles are parsed. Rules can be ORed or ANDed.

The following comparisions are possible in rules:

 * ogc:PropertyIsEqualTo
 * ogc:PropertyIsNotEqualTo
 * ogc:PropertyIsLessThan
 * ogc:PropertyIsGreaterThan
 * ogc:PropertyIsLessThanOrEqualTo
 * ogc:PropertyIsGreaterThanOrEqualTo

The following PolygonSymbolizer properties are applied:

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

 * Symbolizers beside Polygon
 * more styling properties and comparisions
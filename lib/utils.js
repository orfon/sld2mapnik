var {TransformerFactory} = javax.xml.transform;
var {DocumentBuilder, DocumentBuilderFactory} = javax.xml.parsers;
var {StreamResult} = javax.xml.transform.stream;
var {DOMSource} = javax.xml.transform.dom;


/**
 * Transforms a w3c.dom XML node with its children into a normalized String representation.
 * Normalized meaning that there are neither adjacent Text nodes nor empty Text nodes.

 * @param {org.w3c.dom.Node} XML node to transform
 * @returns {String} the normalized string representation
 */
exports.xmlToString = function($xml) {
   var transformer = TransformerFactory.newInstance().newTransformer();
   var result = new StreamResult(new java.io.StringWriter());
   var source = new DOMSource($xml);
   transformer.transform(source, result);
   return result.getWriter().toString();
};

/**
 * Creates a XML Document from the given filepath. Errors and warning are logged to the console.
 *
 * @param {String} absolute filesystem path to the XML document
 * @returns {org.w3c.dom.Document}
 */
exports.xmlFromPath = function(path) {
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
   }));

   var doc = dBuilder.parse(xmlFile);
   return doc;
};

/**
 * Creates a XML Document from the given string. Errors and warning are logged the the console.
 *
 * @param {String} the XML document as a string
 * @returns {org.w3c.dom.Document} the parsed XML Document
 */
exports.xmlFromString = function(string) {
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
};


/**
 * Returns the array of elements matching the tagName below the given element.
 *
 * @param {org.w3c.dom.Node} the element on which to query
 * @returns {Array} the array of tags matching the tagName
 */
var getElementsByTagName = exports.getElementsByTagName = function(element, tagName) {
   var elements = element.getElementsByTagName(tagName);
   var arr = [];
   for (var i = 0; i < elements.getLength(); i++) {
      arr.push(elements.item(i));
   }
   return arr;
};

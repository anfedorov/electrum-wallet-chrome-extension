var Step = require('step');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var uglify = require("uglify-js");
var jsp = uglify.parser;
var pro = uglify.uglify;

exports.minify = function (target, options) {
  if ('object' !== typeof target) {
    throw new Error('Invalid target definition');
  }

  options = options || {};

  if ("string" === typeof options.header) {
    if (options.header.substr(-1) !== "\n") {
      options.header += "\n";
    }
  } else {
    options.header = "";
  }

  file(target, function () {
    minifyHandler.apply(this, [options]);
  }, true);
};

function minifyHandler(opts) {
  var inputPaths = this.prereqs;
  var outputPath = this.name;

  Step(
    function readFiles(err) {
      var group = this.group();

      inputPaths.forEach(function (v) {
        loadAndMinify(v, group());
      });
    },
    function ensureOutputDirExists(err, data) {
      var cb = this;
      var dir = path.dirname(outputPath);

      fs.stat(dir, function (err, stat) {
        if (stat && stat.isDirectory()) {
          cb(null, data);
        } else {
          // Target directory not found or not a directory,
          // try to create it.
          mkdirp(dir, 0755, cb.bind(null, null, data));
        }
      });
    },
    function writeResult(err, data) {
      if (err) throw err;
      var output = "" + opts.header + data.join(';\n') + '\n';

      fs.writeFile(outputPath, output, this);
    },
    function handleErrors(err) {
      if (err) {
        console.error(err.stack ?
                      err.stack :
                      err.toString());
      }
    },
    // Jake callback
    complete
  );
};


/**
 * Helper: Load and minify a file.
 *
 * @returns String Minified code
 */
function loadAndMinify(filename, callback) {
  fs.readFile(filename, 'utf8', function (err, src) {
    try {
      if (err) throw err;

      var res = pro.gen_code(pro.ast_squeeze(pro.ast_mangle(jsp.parse(src))));
      callback(null, res);
    } catch (err) {
      callback(err);
    }
  });
};

This is a simple little helper to quickly create minify tasks for
[Jake](https://github.com/mde/jake) using
[UglifyJS](https://github.com/mishoo/UglifyJS).

# Usage

Here is a simple example Jakefile.js:

``` js
var minify = require('jake-uglify').minify;

task('default', ['bitcoinjs-min.js']);

desc('General-purpose build containing most features');
minify({'bitcoinjs-min.js': [
    'src/bitcoin.js',
    'src/wallet.js'
]});
```

# Options

You can provide a second object with additional settings:

``` js
minify({'bitcoinjs-min.js': [
    'src/bitcoin.js',
    'src/wallet.js'
]},{
  header: "/* BitcoinJS v1.0.0 */"
});
```

* `header`: Header that should be prepended to the minified result

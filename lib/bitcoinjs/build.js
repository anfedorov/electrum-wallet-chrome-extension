 // settings
 var FILE_ENCODING = 'utf-8',
     EOL = '\n';

 // setup
 var _fs = require('fs');

 function concat(opts) {
     var fileList = opts.src;
     var distPath = opts.dest;
     var out = fileList.map(function(filePath){
             return _fs.readFileSync(filePath, FILE_ENCODING);
         });
     _fs.writeFileSync(distPath, out.join(EOL), FILE_ENCODING);
     console.log(' '+ distPath +' built.');
 }

concat({
  src: [
  'src/crypto-js/crypto.js',
  'src/crypto-js/sha256.js',
  'src/crypto-js/ripemd160.js',
  'src/jsbn/prng4.js',
  'src/jsbn/rng.js',
  'src/jsbn/jsbn.js',
  'src/jsbn/jsbn2.js',

  'src/jsbn/ec.js',
  'src/jsbn/sec.js',
  'src/events/eventemitter.js',
  'src/bitcoin.js',
  'src/util.js',
  'src/base58.js',
  
  'src/address.js',
  'src/ecdsa.js',
  'src/eckey.js',
  'src/opcode.js',
  'src/script.js',
  'src/transaction.js',

  'src/wallet.js',
  'src/txdb.js'
  ],
  'dest': 'build/bitcoinjs.js'
})
// the library assumes we have a global window object, so we do a little trick
window = {};
importScripts("bitcoinjs-lib/src/crypto-js/crypto-min.js");
var Crypto = window.Crypto;
importScripts("bitcoinjs-lib/src/crypto-js/sha256-min.js");

self.onmessage = function (e) {
  var first_seed = Crypto.charenc.UTF8.stringToBytes(e.data.seed),
      seed = first_seed;
  
  stretchProgress = 0;

  for (var i=0; i < 100000; i++) {
    seed = Crypto.SHA256(seed.concat(first_seed), {asBytes: true});
    if (!(i % 1000)) {
      stretchProgress++;
      self.postMessage(stretchProgress);
    }
  }
  
  self.postMessage(seed);
}
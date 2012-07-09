var KeyManager = function () {
  var curve = getSECCurveByName("secp256k1"),
      G = curve.getG(),
      ks = JSON.parse(localStorage.masterKeys || "[0,0]"),
      master_priv_key = ks[0],
      master_pub_key = ks[1];
  
  function decrypt(c, passwd) {
    var k = Crypto.SHA256(Crypto.util.hexToBytes(Crypto.SHA256(passwd)), {asBytes: true});
    return Crypto.AES.decrypt(c, k, {mode: new Crypto.mode.CBC(Crypto.pad.iso10126)});
  }
  
  function encrypt(s, passwd) {
    var k = Crypto.SHA256(Crypto.util.hexToBytes(Crypto.SHA256(passwd)), {asBytes: true});
    return Crypto.AES.encrypt(s, k, {mode: new Crypto.mode.CBC(Crypto.pad.iso10126)});    
  }
  
  function priv_to_pub(priv_key) {
    var secexp = BigInteger.fromByteArrayUnsigned(priv_key);
    return G.multiply(secexp).getEncoded();
  }
  
  function big_int_hash(n, forChange, pubKey) {
    return BigInteger.fromByteArrayUnsigned(
             Crypto.SHA256(
               Crypto.SHA256(
                 Crypto.charenc.UTF8.stringToBytes(
                   n + ':' + Number(forChange) + ':'
                 ).concat(pubKey.slice(1)),
                 {asBytes: true}
               ),
               {asBytes: true}
             )
           );
  }

  function pt_to_addr(pt) {
    return new Bitcoin.Address(Bitcoin.Util.sha256ripe160(pt.getEncoded()));
  }

  return {
    "seedEncrypted": function (seed) {
      if (/[a-f0-9]{32}/.test(seed)) {
        return false
      }
      if (seed.slice(seed.length - 2, seed.length) == "=="
          && Crypto.util.base64ToBytes(seed).length == 64) {
        return true;
      }
      throw "This doesn't look like a seed."
    },

    "encrypt": encrypt,
    "decrypt": decrypt,
    
    "encryptMasterPrivKey": function (passwd) {
      var key = master_priv_key;
      master_priv_key = encrypt(JSON.stringify(master_priv_key), passwd);
      // clear private key from memory
      for (var i=0; i < key.length; i++) key[i] = 0;
    },
    
    "decryptMasterPrivKey": function (passwd) {
      master_priv_key = JSON.parse(decrypt(master_priv_key, passwd));
    },
    
    "checkPw": function (passwd) {
      try {
        JSON.parse(decrypt(master_priv_key, passwd));
        return true;
      } catch (e) {
        return false;
      }
    },
    
    "saveKeys": function (passwd) {
      localStorage.masterKeys = JSON.stringify([master_priv_key, master_pub_key]);
    },
    
    "isEncrypted": function () {
      return master_priv_key.constructor === String;
    },
    
    "genKeysFromSeed": function (seed, onProgress, onDone) {
      var done = false,
          newWorker = false;

      if (!this.stretchWorker) {
        newWorker = true;
        this.stretchWorker = new Worker('stretcher.js');
        this.stretchWorker.progress = 0;
      } else {
        onProgress(this.stretchWorker.progress);
        if (this.stretchWorker.progress == 100) onDone();
      }
      
      this.stretchWorker.onmessage = function (e) {
        if (done) {
          master_priv_key = e.data;
          master_pub_key = priv_to_pub(master_priv_key);
          onDone();
        } else {
          this.progress = e.data;
          onProgress(e.data);
          if (e.data == 100) done = true;
        }
      };
      
      if (newWorker) {
        this.stretchWorker.postMessage({seed: seed});
      }
    },
    
    "isReady": function is_ready() {
      return !!master_priv_key;
    },
    
    "gen": function gen(n, isChange) {
        var pt_master_pub = ECPointFp.decodeFrom(curve.getCurve(), master_pub_key),
            a = big_int_hash(n, isChange, master_pub_key),
            pt_new_pub = pt_master_pub.add(G.multiply(a));

        if (!this.isEncrypted()) {
            var order = curve.getN(),
                new_priv_key = BigInteger.fromByteArrayUnsigned(master_priv_key).add(a).mod(order),
                new_priv_addr = new Bitcoin.Address(new_priv_key.toByteArrayUnsigned());

            new_priv_addr.version = 128;
        }

        return [
          pt_to_addr(pt_new_pub).toString(),
          new_priv_addr ? Crypto.util.base64ToBytes(new_priv_addr.getHashBase64()) : ""
        ];
    }
  }
};
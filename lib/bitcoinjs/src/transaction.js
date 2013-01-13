(function () {
  var Script = Bitcoin.Script;

  var Transaction = Bitcoin.Transaction = function (doc) {
    this.version = 1;
    this.lock_time = 0;
    this.ins = [];
    this.outs = [];
    this.timestamp = null;
    this.block = null;

    if (doc) {
      if (doc.hash) this.hash = doc.hash;
      if (doc.version) this.version = doc.version;
      if (doc.lock_time) this.lock_time = doc.lock_time;
      if (doc.ins && doc.ins.length) {
        for (var i = 0; i < doc.ins.length; i++) {
          this.addInput(new TransactionIn(doc.ins[i]));
        }
      }
      if (doc.outs && doc.outs.length) {
        for (var i = 0; i < doc.outs.length; i++) {
          this.addOutput(new TransactionOut(doc.outs[i]));
        }
      }
      if (doc.timestamp) this.timestamp = doc.timestamp;
      if (doc.block) this.block = doc.block;
    }
  };

  /**
   * Turn transaction data into Transaction objects.
   *
   * Takes an array of plain JavaScript objects containing transaction data and
   * returns an array of Transaction objects.
   */
  Transaction.objectify = function (txs) {
    var objs = [];
    for (var i = 0; i < txs.length; i++) {
      objs.push(new Transaction(txs[i]));
    }
    return objs;
  };

  /**
   * Create a new txin.
   *
   * Can be called with an existing TransactionIn object to add it to the
   * transaction. Or it can be called with a Transaction object and an integer
   * output index, in which case a new TransactionIn object pointing to the
   * referenced output will be created.
   *
   * Note that this method does not sign the created input.
   */
  Transaction.prototype.addInput = function (tx, outIndex) {
    if (arguments[0] instanceof TransactionIn) {
      this.ins.push(arguments[0]);
    } else {
      this.ins.push(new TransactionIn({
        outpoint: {
          hash: tx.hash,
          index: outIndex
        },
        script: new Bitcoin.Script(),
        sequence: 4294967295
      }));
    }
  };

  /**
   * Create a new txout.
   *
   * Can be called with an existing TransactionOut object to add it to the
   * transaction. Or it can be called with an Address object and a BigInteger
   * for the amount, in which case a new TransactionOut object with those
   * values will be created.
   */
  Transaction.prototype.addOutput = function (address, value) {
    if (arguments[0] instanceof TransactionOut) {
      this.outs.push(arguments[0]);
    } else {
      if (value instanceof BigInteger) {
        value = value.toByteArrayUnsigned().reverse();
        while (value.length < 8) value.push(0);
      } else if (Bitcoin.Util.isArray(value)) {
        // Nothing to do
      }

      this.outs.push(new TransactionOut({
        value: value,
        script: Script.createOutputScript(address)
      }));
    }
  };

  /**
   * Serialize this transaction.
   *
   * Returns the transaction as a byte array in the standard Bitcoin binary
   * format. This method is byte-perfect, i.e. the resulting byte array can
   * be hashed to get the transaction's standard Bitcoin hash.
   */
  Transaction.prototype.serialize = function ()
  {
    var buffer = [];
    buffer = buffer.concat(Crypto.util.wordsToBytes([parseInt(this.version)]).reverse());
    buffer = buffer.concat(Bitcoin.Util.numToVarInt(this.ins.length));
    for (var i = 0; i < this.ins.length; i++) {
      var txin = this.ins[i];
      buffer = buffer.concat(Crypto.util.base64ToBytes(txin.outpoint.hash));
      buffer = buffer.concat(Crypto.util.wordsToBytes([parseInt(txin.outpoint.index)]).reverse());
      var scriptBytes = txin.script.buffer;
      buffer = buffer.concat(Bitcoin.Util.numToVarInt(scriptBytes.length));
      buffer = buffer.concat(scriptBytes);
      buffer = buffer.concat(Crypto.util.wordsToBytes([parseInt(txin.sequence)]).reverse());
    }
    buffer = buffer.concat(Bitcoin.Util.numToVarInt(this.outs.length));
    for (var i = 0; i < this.outs.length; i++) {
      var txout = this.outs[i];
      buffer = buffer.concat(txout.value);
      var scriptBytes = txout.script.buffer;
      buffer = buffer.concat(Bitcoin.Util.numToVarInt(scriptBytes.length));
      buffer = buffer.concat(scriptBytes);
    }
    buffer = buffer.concat(Crypto.util.wordsToBytes([parseInt(this.lock_time)]).reverse());

    return buffer;
  };
  
  Transaction.from_serlized_hex = function (str) {
    function spliceVarInt(buf) {
      if (buf[0] < 0xfd) {
        return buf.splice(0,1)[0];
      } else {
        throw "big varints not supported"
      }
    }
    
    var tx = new Transaction();

    buf = Crypto.util.hexToBytes('01000000028bc50187152a0c18f85bc7761d05e02c197fa9647be7cd48c86e234e4d36f8cd010000008a4730440220a400d3c6566d9d9f4a64c595b759b87836efe28a79e0e6612f41796cf5eae8280220b4a98420c06b00319971fa9a003fa1832f127d23a231bcde0aabee94cd35cffe01410483cef22b9ba7ec81907781fedf7933032259d2cd4c4240056cfc00ef7b20aa94a61328ce3ae87491b057cae1e26800e7ddda862c6e16f583726efe929ab0c180ffffffff9535a2e982c4233879caf1c913abef41fec61b19681ea9ca15e630e907f8fb33010000008a473044022040dd5ab4281f7d310f18b8dc098c14237435349725534681696fb2248e48366802203bb0b457139116adebf816a397b6ad4791946a820a12a4181adb62414853ba31014104588733f009e2700cdd71c39e19d962052398090f8c8c1a81455500f9cd093984fe4032c53f9addd67bb35d6acedc92228dd5b7ff4a7e87444122a30395877f93ffffffff0200e1f505000000001976a914455f971ec6cf93c3f0e27d36071b54450b83dd9588ac001a3704000000001976a914bf24cf8124792498778634e69cac57d5caccbbaa88ac00000000')
    tx.version = Crypto.util.bytesToWords(buf.splice(0,4).reverse())[0];  // 1
    tx.ins = [];

    for (i = spliceVarInt(buf); i > 0; i--) {
      var txin = {};
      txin.outpoint = {}
      txin.outpoint.hash = Crypto.util.bytesToBase64(buf.splice(0,32));
      txin.outpoint.index = Crypto.util.bytesToWords(buf.splice(0,4).reverse())[0];
      txin.script = new Bitcoin.Script(buf.splice(0, spliceVarInt(buf)));
      txin.sequence = Crypto.util.bytesToWords(buf.splice(0,4).reverse())[0];
      tx.ins.push(new Bitcoin.TransactionIn(txin))
    }

    this.outs = []
    for (i = spliceVarInt(buf); i > 0; i--) {
      var txout = {};
      txout.value = buf.splice(0,8);
      txout.script = new Bitcoin.Script(buf.splice(0, spliceVarInt(buf)));
      tx.outs.push(new Bitcoin.TransactionOut(txout));
    }

    tx.lock_time = Crypto.util.bytesToWords(buf.splice(0,4).reverse())[0]
  };

  var OP_CODESEPARATOR = 171;

  var SIGHASH_ALL = 1;
  var SIGHASH_NONE = 2;
  var SIGHASH_SINGLE = 3;
  var SIGHASH_ANYONECANPAY = 80;

  /**
   * Hash transaction for signing a specific input.
   *
   * Bitcoin uses a different hash for each signed transaction input. This
   * method copies the transaction, makes the necessary changes based on the
   * hashType, serializes and finally hashes the result. This hash can then be
   * used to sign the transaction input in question.
   */
  Transaction.prototype.hashTransactionForSignature =
  function (connectedScript, inIndex, hashType)
  {
    var txTmp = this.clone();

    // In case concatenating two scripts ends up with two codeseparators,
    // or an extra one at the end, this prevents all those possible
    // incompatibilities.
    /*scriptCode = scriptCode.filter(function (val) {
     return val !== OP_CODESEPARATOR;
     });*/

    // Blank out other inputs' signatures
    for (var i = 0; i < txTmp.ins.length; i++) {
      txTmp.ins[i].script = new Script();
    }

    txTmp.ins[inIndex].script = connectedScript;

    // Blank out some of the outputs
    if ((hashType & 0x1f) == SIGHASH_NONE) {
      txTmp.outs = [];

      // Let the others update at will
      for (var i = 0; i < txTmp.ins.length; i++)
        if (i != inIndex)
          txTmp.ins[i].sequence = 0;
    } else if ((hashType & 0x1f) == SIGHASH_SINGLE) {
      // TODO: Implement
    }

    // Blank out other inputs completely, not recommended for open transactions
    if (hashType & SIGHASH_ANYONECANPAY) {
      txTmp.ins = [txTmp.ins[inIndex]];
    }

    // console.log(txTmp);
    var buffer = txTmp.serialize();

    buffer = buffer.concat(Crypto.util.wordsToBytes([parseInt(hashType)]).reverse());

    // console.log("signtx: "+Crypto.util.bytesToHex(buffer));

    var hash1 = Crypto.SHA256(buffer, {asBytes: true});

    // console.log("sha256_1: ", Crypto.util.bytesToHex(hash1));

    return Crypto.SHA256(hash1, {asBytes: true});
  };

  /**
   * Calculate and return the transaction's hash.
   */
  Transaction.prototype.getHash = function ()
  {
    var buffer = this.serialize();
    return Crypto.SHA256(Crypto.SHA256(buffer, {asBytes: true}), {asBytes: true});
  };

  /**
   * Create a copy of this transaction object.
   */
  Transaction.prototype.clone = function ()
  {
    var newTx = new Transaction();
    newTx.version = this.version;
    newTx.lock_time = this.lock_time;
    for (var i = 0; i < this.ins.length; i++) {
      var txin = this.ins[i].clone();
      newTx.addInput(txin);
    }
    for (var i = 0; i < this.outs.length; i++) {
      var txout = this.outs[i].clone();
      newTx.addOutput(txout);
    }
    return newTx;
  };

  /**
   * Analyze how this transaction affects a wallet.
   *
   * Returns an object with properties 'impact', 'type' and 'addr'.
   *
   * 'impact' is an object, see Transaction#calcImpact.
   * 
   * 'type' can be one of the following:
   * 
   * recv:
   *   This is an incoming transaction, the wallet received money.
   *   'addr' contains the first address in the wallet that receives money
   *   from this transaction.
   *
   * self:
   *   This is an internal transaction, money was sent within the wallet.
   *   'addr' is undefined.
   *
   * sent:
   *   This is an outgoing transaction, money was sent out from the wallet.
   *   'addr' contains the first external address, i.e. the recipient.
   *
   * other:
   *   This method was unable to detect what the transaction does. Either it
   */
  Transaction.prototype.analyze = function (wallet) {
    if (!(wallet instanceof Bitcoin.Wallet)) return null;

    var allFromMe = true,
    allToMe = true,
    firstRecvHash = null,
    firstMeRecvHash = null,
    firstSendHash = null;

    for (var i = this.outs.length-1; i >= 0; i--) {
      var txout = this.outs[i];
      var hash = txout.script.simpleOutPubKeyHash();
      if (!wallet.hasHash(hash)) {
        allToMe = false;
      } else {
        firstMeRecvHash = hash;
      }
      firstRecvHash = hash;
    }
    for (var i = this.ins.length-1; i >= 0; i--) {
      var txin = this.ins[i];
      firstSendHash = txin.script.simpleInPubKeyHash();
      if (!wallet.hasHash(firstSendHash)) {
        allFromMe = false;
        break;
      }
    }

    var impact = this.calcImpact(wallet);

    var analysis = {};

    analysis.impact = impact;

    if (impact.sign > 0 && impact.value.compareTo(BigInteger.ZERO) > 0) {
      analysis.type = 'recv';
      analysis.addr = new Bitcoin.Address(firstMeRecvHash);
    } else if (allFromMe && allToMe) {
      analysis.type = 'self';
    } else if (allFromMe) {
      analysis.type = 'sent';
      // TODO: Right now, firstRecvHash is the first output, which - if the
      //       transaction was not generated by this library could be the
      //       change address.
      analysis.addr = new Bitcoin.Address(firstRecvHash);
    } else  {
      analysis.type = "other";
    }

    return analysis;
  };

  /**
   * Get a human-readable version of the data returned by Transaction#analyze.
   *
   * This is merely a convenience function. Clients should consider implementing
   * this themselves based on their UI, I18N, etc.
   */
  Transaction.prototype.getDescription = function (wallet) {
    var analysis = this.analyze(wallet);

    if (!analysis) return "";

    switch (analysis.type) {
    case 'recv':
      return "Received with "+analysis.addr;
      break;

    case 'sent':
      return "Payment to "+analysis.addr;
      break;

    case 'self':
      return "Payment to yourself";
      break;

    case 'other':
    default:
      return "";
    }
  };

  /**
   * Get the total amount of a transaction's outputs.
   */
  Transaction.prototype.getTotalOutValue = function () {
    var totalValue = BigInteger.ZERO;
    for (var j = 0; j < this.outs.length; j++) {
      var txout = this.outs[j];
      totalValue = totalValue.add(Bitcoin.Util.valueToBigInt(txout.value));
    }
    return totalValue;
  };

   /**
    * Old name for Transaction#getTotalOutValue.
    *
    * @deprecated
    */
   Transaction.prototype.getTotalValue = Transaction.prototype.getTotalOutValue;

  /**
   * Calculates the impact a transaction has on this wallet.
   *
   * Based on the its public keys, the wallet will calculate the
   * credit or debit of this transaction.
   *
   * It will return an object with two properties:
   *  - sign: 1 or -1 depending on sign of the calculated impact.
   *  - value: amount of calculated impact
   *
   * @returns Object Impact on wallet
   */
  Transaction.prototype.calcImpact = function (wallet) {
    if (!(wallet instanceof Bitcoin.Wallet)) return BigInteger.ZERO;

    // Calculate credit to us from all outputs
    var valueOut = BigInteger.ZERO;
    for (var j = 0; j < this.outs.length; j++) {
      var txout = this.outs[j];
      var hash = Crypto.util.bytesToBase64(txout.script.simpleOutPubKeyHash());
      if (wallet.hasHash(hash)) {
        valueOut = valueOut.add(Bitcoin.Util.valueToBigInt(txout.value));
      }
    }

    // Calculate debit to us from all ins
    var valueIn = BigInteger.ZERO;
    for (var j = 0; j < this.ins.length; j++) {
      var txin = this.ins[j];
      var hash = Crypto.util.bytesToBase64(txin.script.simpleInPubKeyHash());
      if (wallet.hasHash(hash)) {
        var fromTx = wallet.txIndex[txin.outpoint.hash];
        if (fromTx) {
          valueIn = valueIn.add(Bitcoin.Util.valueToBigInt(fromTx.outs[txin.outpoint.index].value));
        }
      }
    }
    if (valueOut.compareTo(valueIn) >= 0) {
      return {
        sign: 1,
        value: valueOut.subtract(valueIn)
      };
    } else {
      return {
        sign: -1,
        value: valueIn.subtract(valueOut)
      };
    }
  };

  var TransactionIn = Bitcoin.TransactionIn = function (data)
  {
    this.outpoint = data.outpoint;
    if (data.script instanceof Script) {
      this.script = data.script;
    } else {
      this.script = new Script(data.script);
    }
    this.sequence = data.sequence;
  };

  TransactionIn.prototype.clone = function ()
  {
    var newTxin = new TransactionIn({
      outpoint: {
        hash: this.outpoint.hash,
        index: this.outpoint.index
      },
      script: this.script.clone(),
      sequence: this.sequence
    });
    return newTxin;
  };

  var TransactionOut = Bitcoin.TransactionOut = function (data)
  {
    if (data.script instanceof Script) {
      this.script = data.script;
    } else {
      this.script = new Script(data.script);
    }

    if (Bitcoin.Util.isArray(data.value)) {
      this.value = data.value;
    } else if ("string" == typeof data.value) {
      var valueHex = (new BigInteger(data.value, 10)).toString(16);
      while (valueHex.length < 16) valueHex = "0" + valueHex;
      this.value = Crypto.util.hexToBytes(valueHex);
    }
  };

  TransactionOut.prototype.clone = function ()
  {
    var newTxout = new TransactionOut({
      script: this.script.clone(),
      value: this.value.slice(0)
    });
    return newTxout;
  };
})();



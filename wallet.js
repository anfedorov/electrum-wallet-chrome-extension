var ElectrumWallet = function ElectrumWallet(km) {
  var walletData = JSON.parse(localStorage.wallet || "{}");
  
  if (!walletData.addresses) walletData.addresses = [];
  if (!walletData.change_addresses) walletData.change_addresses = [];
  if (!walletData.imported_keys) walletData.imported_keys = {};
  if (!walletData.history) walletData.history = {};
  if (!walletData.labels) walletData.labels = {};
  
  return {
    "saveSeed": function (seed) {
      walletData.seed = seed;
      this.save();
    },
    
    "getSeed": function () {
      return walletData.seed;
    },
    
    "getData": function () {
      return walletData;
    },
    
    "isEncrypted": function () {
      return km.isEncrypted();
    },
    
    "findKey": function (pubKey) {
      var i = this.getAddrs().indexOf(pubKey);
      if (i > -1) {
        return [i, false];
      } else if ((i = this.getChangeAddrs().indexOf(pubKey)) > -1) {
        return [i, true];
      } else {
        return false;
      }
    },
    
    "getBalance": function () {
      var history = walletData['history'],
          balance = 0;
          // definite_balance = 0.0,
          // pending_balance = 0.0;
      
      for (var adrs in history) {
        if (history.hasOwnProperty(adrs)) {
          var txs = history[adrs];
              // numblocks = this.getNumblocks();
          
          txs.forEach(function (tx) {
            balance += tx.value;
            // var confs = tx.height ? numblocks - tx.height + 1 : 0;
            // if (tx.height != 0 && confs >= config.confs_required) {
            //   definite_balance += tx.value;
            // } else {
            //   pending_balance += tx.value;
            // }
          });
        }
      }
      
      return balance;
      // return [definite_balance / 100000000, pending_balance / 100000000];
    },
    
    "save": function () {
      localStorage.wallet = JSON.stringify(walletData);
    },
    
    "getAllAddrs": function () {
      return walletData.addresses.concat(walletData.change_addresses)
                                  .concat(misc.obj_keys(walletData.imported_keys));
    },
    
    "getAddrs": function () {
      return walletData.addresses;
    },
    
    "getChangeAddrs": function () {
      return walletData.change_addresses;
    },
    
    "getImportedAddrs": function () {
      return misc.obj_keys(walletData.imported_keys);
    },
    
    "nextUnusedAddr": function () {
      var addrs = walletData.addresses;
      for (var i=0; i < addrs.length; i++) {
        var a = addrs[i],
            hist = this.getHistory(a),
            label = this.getLabel(a);
            
        if ((!hist || !hist.length) && !label) {
          return a;
        }
      }
      
      // all addresses have a history or label, generate a new one
      var pubKey = km.gen(addrs.length, false)[0];
      
      addrs.push(pubKey);
      this.save();
      this.onNewAddress([pubKey]);
      
      return pubKey;
    },
    
    "nextUnusedChangeAddr": function () {
      var addrs = walletData.change_addresses;
      for (var i=0; i < addrs.length; i++) {
        var a = addrs[i],
            hist = this.getHistory(a),
            label = this.getLabel(a);
            
        if ((!hist || !hist.length) && !label) {
          return a;
        }
      }
      
      // all addresses have a history of label, generate a new one
      var pubKey = km.gen(addrs.length, true)[0];
      
      addrs.push(pubKey);
      this.save();
      this.onNewAddress([pubKey]);
      
      return pubKey;
    },
    
    "getHistory": function (addr) {
      if (addr) {
        return walletData['history'][addr];
      } else {
        return walletData['history'];
      }
    },
    
    "lastBlockHash": function (addr) {
      if (addr in walletData['history']) {
        var txs = walletData['history'][addr];
        if (txs.length) {
          return txs[txs.length - 1]['block_hash'];
        }
      }
      return null;
    },
    
    "extendAddressChain": function () {
      var addrs = walletData.addresses,
          n_fresh = 0;
      
      for (var i=0; i < addrs.length; i++) {
        var a = addrs[i],
            hist = this.getHistory(a),
            label = this.getLabel(a);
            
        if ((!hist || !hist.length) && !label) {
          n_fresh++;
          if (n_fresh == 5) break;
        } else {
          n_fresh = 0;
        }
      }
      
      var new_addrs = [];
      
      // make sure there are 5 consecutive fresh addresses
      // at the end of addrs
      for (var i = n_fresh; i < 5; i++) {
        var pubKey = km.gen(addrs.length, false)[0];
        addrs.push(pubKey);
        new_addrs.push(pubKey);
      }
      
      var change_addrs = walletData.change_addresses,
          last_change_addr_hist = this.getHistory(change_addrs[change_addrs.length - 1]);
      
      if (!change_addrs.length || (last_change_addr_hist && last_change_addr_hist.length)) {
        var pubKey = km.gen(change_addrs.length, true)[0];
        change_addrs.push(pubKey);
        new_addrs.push(pubKey);
      }
      
      if (new_addrs.length) {
        this.save();
        this.onNewAddress(new_addrs);
      }
    },
    
    "updateTxHistory": function (addr, tx_history) {
      if (!walletData.history[addr] || tx_history.length >= walletData.history[addr].length) {
        walletData.history[addr] = tx_history;
        this.extendAddressChain();
        this.save();
      }
    },
    
    "updateNumblocks": function (n) {
      if (isNaN(localStorage.numblocks)) {
        localStorage.numblocks = n;
      } else {
        localStorage.numblocks = Math.max(n, localStorage.numblocks);
      }
    },
    
    "getNumblocks": function () {
      return Number(localStorage.numblocks);
    },
    
    "getTxHistory": function () {
      var history = walletData.history,
          all_txs = [];
      
      for (var adrs in history) {
        if (history.hasOwnProperty(adrs)) {
          all_txs = all_txs.concat(history[adrs]);
        }
      }
      
      // all_txs.sort(function (x,y) {
      //   return (y.timestamp || Infinity) - (x.timestamp || Infinity);
      // });
      
      return all_txs;
    },
    
    "getLatestTxs": function () {
      var all_txs = this.getTxHistory(),
          numblocks = this.getNumblocks(),
          merged_txs = {},
          that = this;
      
      all_txs.forEach(function (tx) {
        var hash = tx.tx_hash,
            height = tx.height;
        
        if (hash in merged_txs) {
          merged_txs[hash].value += tx.value;
        } else {
          merged_txs[hash] = {
            hash: hash,
            value: tx.value,
            timestamp: tx.timestamp,
            height: height,
            tx_id: tx.tx_id,
            confs: height ? numblocks - height + 1 : 0,
            label: that.getLabel(hash) || ""
          };
        }
        // if one of the output addr has a label, use that instead of the tx's
        if (!tx.is_input && that.getLabel(tx.outputs[tx.index])) {
          merged_txs[hash].label = that.getLabel(tx.outputs[tx.index]);
        }
      });
      
      var sorted_merged_txs = [];
      for (var x in merged_txs) {
        if (merged_txs.hasOwnProperty(x)) {
          sorted_merged_txs.push(merged_txs[x]);
        }
      }
      sorted_merged_txs.sort(function (x,y) {
        var dt = (y.timestamp || Infinity) - (x.timestamp || Infinity),
            di = (y.tx_id || Infinity) - (x.tx_id || Infinity);
        return dt || di;
      });
      
      return sorted_merged_txs;
    },
    
    "setLabel": function (x, label) {
      walletData.labels[x] = label;
      this.extendAddressChain();
      this.save();
    },
    
    "getLabel": function (x) {
      return walletData.labels[x];
    },
    
    "getAddrValue": function (adrs) {
      var history = walletData['history'],
          sum = 0;
      
      if (history.hasOwnProperty(adrs)) {
        var txs = history[adrs];
        for (var i=0; i < txs.length; i++) {
          sum += txs[i].value;
        }
      }
      
      return sum
    },
    
    "onNewAddress": function () {},
    
    "gatherInputs": function (total) {
      var history = walletData['history'],
          unspent_outputs = [];
      
      for (var addr in history) {
        if (history.hasOwnProperty(addr)) {
          var txs = history[addr];
          for (var i=0; i < txs.length; i++) {
            if ('raw_output_script' in txs[i]) {
              var tx = misc.obj_select_keys(txs[i], ['tx_hash', 'index', 'value', 'raw_output_script']);
              tx.addr = addr;
              unspent_outputs.push(tx);
            }
          }
        }
      }
      
      // small ones first
      unspent_outputs.sort(function (x,y) { return x['value'] - y['value']; });
      
      var inputs = [];
      var sum = 0;
      for (var i=0; i < unspent_outputs.length; i++) {
        var output = unspent_outputs[i];
        if (sum < total) {
          sum += output.value;
          inputs.push({
            outpoint: {
              hash: Crypto.util.bytesToBase64(
                      Crypto.util.hexToBytes(output.tx_hash).reverse()
                    ),
              index: output.index
            },
            script: Crypto.util.hexToBytes(output.raw_output_script),
            sequence: 4294967295
          });
        } else {
          break;
        }
      }
      
      if (sum < total) {
        throw "Not enough funds";
      } else {
        return [sum, inputs];
      }
    },
    
    "genTx": function (toAddr, sendValue, feeValue, passwd, changeAddr) {
      var sum_inputs = this.gatherInputs(sendValue + feeValue),
          sumValue = sum_inputs[0],
          inputs = sum_inputs[1],
          tx = new Bitcoin.Transaction({
            ins: inputs
          }),
          encrypted = km.isEncrypted();
      
      if (!changeAddr) {
        changeAddr = this.nextUnusedChangeAddr();
      }
      
      tx.addOutput(new Bitcoin.Address(toAddr),
                   new BigInteger(String(sendValue)));
      
      if (sumValue - sendValue - feeValue > 0) {
        tx.addOutput(new Bitcoin.Address(changeAddr),
                     new BigInteger(String(sumValue - sendValue - feeValue)));
      }
      
      if (encrypted) {
        km.decryptMasterPrivKey(passwd);
      }
      
      try {
        var SIGHASH_ALL = 1;
        for (var i = 0; i < tx.ins.length; i++) {
          var scriptPubKey = tx.ins[i].script;
          var hash = tx.hashTransactionForSignature(scriptPubKey, i, SIGHASH_ALL);
          var pubKeyHash = scriptPubKey.simpleOutPubKeyHash();
          var pubKey = new Bitcoin.Address(pubKeyHash).toString();
          var eckey = new Bitcoin.ECKey(km.gen.apply(km, this.findKey(pubKey))[1]);
          var signature = eckey.sign(hash);
          signature.push(SIGHASH_ALL);
          var scriptSig = new Bitcoin.Script();
          scriptSig.writeBytes(signature);
          scriptSig.writeBytes(eckey.getPub());
          tx.ins[i].script = scriptSig;
        }
      } catch(e) {
        console.log("err", e);
      } finally {
        if (encrypted) {
          km.encryptMasterPrivKey(passwd);
        }
      }
      
      return tx;
    },
    
    "importTx": function (impTx) {
      var impTxHash = Crypto.util.bytesToHex(impTx.getHash().reverse()),
          tx_id = (new Date()).getTime() / 1e12; // don't ask
      
      // fix all of the inputs
      for (var i=0; i < impTx.ins.length; i++) {
        var inp = impTx.ins[i],
            addr = new Bitcoin.Address(inp.script.simpleInPubKeyHash()).toString(),
            tx_hash = Crypto.util.bytesToHex(Crypto.util.base64ToBytes(inp.outpoint.hash).reverse()),
            index = inp.outpoint.index;
        
        for (var j = walletData.history[addr].length - 1; j >= 0; j--) {
          var tx = walletData.history[addr][j];
          if (tx.tx_hash == tx_hash && tx.index == index && !tx.is_input) {
            delete tx.raw_output_script;
            value = -tx.value;
            break;
          }
        }
        
        walletData.history[addr].push({
          block_hash: "mempool",
          height: 0,
          index: i,
          is_input: 1,
          inputs: impTx.ins.map(function (x) { 
            return new Bitcoin.Address(x.script.simpleInPubKeyHash()).toString();
          }),
          outputs: impTx.outs.map(function (x) {
            return new Bitcoin.Address(x.script.simpleOutPubKeyHash()).toString();
          }),
          timestamp: 0,
          tx_hash: impTxHash,
          tx_id: tx_id,
          value: value
        });
      }
      
      // and now the outputs
      for (var i=0; i < impTx.outs.length; i++) {
        var out = impTx.outs[i],
            addr = new Bitcoin.Address(out.script.simpleOutHash()).toString(),
            value = Number(BigInteger.fromByteArrayUnsigned(out.value.reverse()).toString());
        
        if (addr in walletData.history) {
          walletData.history[addr].push({
            block_hash: "mempool",
            height: 0,
            index: i,
            is_input: 0,
            inputs: impTx.ins.map(function (x) { 
              return new Bitcoin.Address(x.script.simpleInPubKeyHash()).toString();
            }),
            outputs: impTx.outs.map(function (x) {
              return new Bitcoin.Address(x.script.simpleOutPubKeyHash()).toString();
            }),
            raw_output_script: Crypto.util.bytesToHex(out.script.buffer),
            timestamp: 0,
            tx_hash: impTxHash,
            tx_id: tx_id,
            value: value
          });
        }
      }
      
      this.save();
    }
  };
};
var UI = function UI (wallet, rpc) {
  var attemptingSend = false,
      lastSeenTxHash = (function () {
        var txs = wallet.getLatestTxs();
        return txs.length && txs[0].hash;
      })(),
      connected = false,
      that;
  
  chrome.extension.onMessage.addListener(function (r) {
    if (r.type == "history_updated") {
      that.updateBadge(r.txs);
    }
  });
  
  chrome.extension.onMessage.addListener(function(r) {
    if (r.type == "server_connect") {
      connected = true;
      that.updateBadge();
    }
  });
  
  chrome.extension.onMessage.addListener(function(r) {
    if (r.type == "server_disconnect") {
      connected = false;
      that.updateBadge();
    }
  });
  
  return {
    "init": function () {
      that = this;
      that.updateBadge();
      return that;
    },
    
    "getAddrs": function () {
      var addrs = [],
          normal = wallet.getAddrs(),
          change = wallet.getChangeAddrs(),
          imported = wallet.getImportedAddrs();
      
      for (var i=0; i < normal.length; i++) {
        addrs.push({type: 'normal', addr: normal[i]});
      }
      
      for (var i=0; i < change.length; i++) {
        addrs.push({type: 'change', addr: change[i]});
      }
      
      for (var i=0; i < imported.length; i++) {
        addrs.push({type: 'imported', addr: imported[i]});
      }
      
      for (var i=0; i < addrs.length; i++) {
        var a = addrs[i];
        a.label = wallet.getLabel(a.addr);
        a.balance = wallet.getAddrValue(a.addr) / 100000000;
        var hist = wallet.getHistory(a.addr);
        a.len_hist = hist ? hist.length : 0;
      }
      
      return addrs;
    },
    
    "getTxs": function (n) {
      var balance = 0;
      return wallet.getLatestTxs().slice(0, n || Infinity).reverse().map(function (tx) {
        balance += tx.value;
        tx.datetime = tx.timestamp ? misc.printDate(tx.timestamp) : "-";
        tx.amount = tx.value / 1e8;
        tx.balance = balance / 1e8;
        return tx;
      }).reverse();
    },
    
    "popupData": function () {
      var balance = wallet.getBalance(),
          txs = wallet.getLatestTxs().slice(0, config.txs_shown);
      
      txs.forEach(function (tx) {
        tx.amount = tx.value / 1e8;
        if (tx.amount > 0) {
          tx.arrow = "&rarr;";
          tx.dir = "inc";
        } else {
          tx.amount = "(" + (-tx.amount) + ")";
          tx.arrow = "&larr;";
          tx.dir = "outg";
        }
        tx.num_confs = tx.confs < config.confs_required ? String(tx.confs) : null;
      });
      
      if (txs.length) {
        lastSeenTxHash = txs[0].hash;
        that.updateBadge();
      }
      
      return {
        balance: balance / 1e8,
        transactions: txs,
        keys_are_encrypted: wallet.isEncrypted()
      }
    },
    
    "updateBadge": function (txs) {
      var txs = txs || wallet.getLatestTxs(),
          n = 0;
      
      for (var i=0; i < txs.length; i++) {
        if (txs[i].hash == lastSeenTxHash) {
          break;
        } else {
          n++;
        }
      }
      
      chrome.browserAction.setBadgeBackgroundColor({color: connected ? [208, 0, 24, 255] : [190, 190, 190, 230]});
      // chrome.browserAction.setBadgeText({text: connected ? String(n || "") : String(n || "?")});
      chrome.browserAction.setBadgeText({text: String(n || "")});
      chrome.browserAction.setIcon({path: connected ? "img/bitcoin.png" : "img/bitcoin_gray.png"});
    },
    
    "receive": function (label, addr) {
      wallet.setLabel(addr, label);
    },
    
    "send": function (toAddr, amount, txLabel, passwd, onSuccess, onError) {
      var value = Math.round(Number(amount) * 1e8),
          tx = wallet.genTx(toAddr, value, Math.round(Number(config.default_fee) * 1e8), passwd);
      
      attemptingSend = { tx: tx, label: txLabel, onSuccess: onSuccess };
      
      rpc.send(
        [['blockchain.transaction.broadcast', [Crypto.util.bytesToHex(tx.serialize())]]],
        function () {
          onError("no connection.");
          attemptingSend = false;
        }
      );
    },
    
    "onSuccessfulSend": function (txHash) {
      wallet.setLabel(txHash, attemptingSend.label);
      wallet.importTx(attemptingSend.tx);
      lastSeenTxHash = txHash;
      attemptingSend.onSuccess();
      attemptingSend = false;
    }
  }
}
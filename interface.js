var JSONRPCoverHTTP = (function (host) {
  var polling_interval = 5000,
      message_id = 0,
      unhandled_requests = {},
      lastSend = 0,
      connected = false,
      session_established = false,
      event_handler;
  
  return {
    "init": function (handler) {
      event_handler = handler;
    },
    
    "is_connected": function () {
      return connected;
    },
    
    "getHost": function () {
      return host;
    },
    
    "poll": function poll() {
      this.send([]);
    },
    
    "resetSession": function () {
      chrome.cookies.remove({ url: 'http://' + host, name: 'SESSION' });
      session_established = false;
    },
    
    "send": function send(messages, onError) {
      var xhr = new XMLHttpRequest(),
          new_unhandled_requests = {},
          that = this;
      
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            
            if (!connected) {
              connected = true;
              that.onConnect();
            }
            
            if (xhr.responseText === "Error: session not found") {
              console.log("Session timed out, removing cookie.");
              chrome.cookies.remove({ url: 'http://' + host, name: 'SESSION' });
              session_established = false;
              return;
            }
            
            if (!session_established) {
              console.log("New session established.");
              session_established = true;
              unhandled_requests = {};
              that.onNewSession();
            }
            
            // misc.obj_merge(unhandled_requests, new_unhandled_requests);
            
            if (xhr.responseText) {
              var data = JSON.parse(xhr.responseText);
              
              if (data.constructor === Array) {
                for (var i=0; i < data.length; i++) {
                  that.handle_response(data[i]);
                }
              } else {
                that.handle_response(data)
              }
              
            } else { // !xhr.responseText
              console.log("Empty response.")
            }
            
            if (misc.obj_size(unhandled_requests)) {
              console.log("Waiting for responses", misc.obj_keys(unhandled_requests));
              polling_interval = 5000;
            } else {
              polling_interval = 10000;
            }
            
          } else { // xhr.status != 200
            if (connected) {
              connected = false;
              that.onDisconnect("Status != 200.");
            }
            for (var v in new_unhandled_requests) {
              delete unhandled_requests[v];
            }
            if (onError) {
              onError();
            }
            polling_interval = 10000;
          }
        }
      };
      
      var outgoing = [];
      
      for (var i = 0; i < messages.length; i++) {
        var m = {
          "id": message_id,
          "method": messages[i][0],
          "params": messages[i][1]
        };
        
        unhandled_requests[message_id] = m;
        new_unhandled_requests[message_id] = m;
        outgoing.push(m);
        
        console.log("-->", m['method'], JSON.stringify(m));
        message_id += 1;
      }
      
      var url = 'http://' + host + '/';
      if (outgoing.length) {
        xhr.open('POST', url, true);
        xhr.setRequestHeader("Content-type", "application/json");
        xhr.send(JSON.stringify(outgoing));
      } else { // !out
        xhr.open('GET', url, true);
        xhr.setRequestHeader("Content-type", "application/json");
        xhr.send();
      }
      
      lastSend = (new Date()).getTime();
    },
    
    "go": function go() {
      var that = this;
      
      chrome.cookies.get(
        { url: 'http://' + host, name: 'SESSION' },
        function (cookie) {
          session_established = Boolean(cookie);
        }
      );
      
      setInterval(function () {
        var now = (new Date()).getTime();
        if ((now - lastSend) > polling_interval) {
          that.poll();
        }
      }, 500);
    },
    
    "handle_response": function handle_response(r) {
      if ('error' in r) { // it's an error
        console.log("Error " + r['error']['code'] + ": " + r['error']['message']);
      } else if (r['id'] in unhandled_requests) { // it's a response
        r['method'] = unhandled_requests[r['id']]['method'];
        r['params'] = unhandled_requests[r['id']]['params'];
        delete unhandled_requests[r['id']];
        delete r['id'];
      }
      
      console.log("<--", r['method'], JSON.stringify(r).length > 200 ? r : JSON.stringify(r));
      
      event_handler(r);
    },
    
    "subscribe_to_addrs": function (as) {
      var subscribe_commands = [];
      for (var i = 0; i < as.length; i++) {
        subscribe_commands.push(['blockchain.address.subscribe', [as[i]]]);
      }
      this.send(subscribe_commands);
    },
    
    "onConnect": function () {
      console.log("Connected to", host);
      // TODO: Update icon
    },
    
    "onDisconnect": function (reason) {
      console.log("Disconnected:", reason);
      // TODO: Update icon
    }
  };
});

var StratumHandler = (function() {
  var that, rpc, wallet, ui;
  
  return {
    "init": function init(r, w, u) {
      rpc = r;
      wallet = w;
      ui = u;
      that = this;
      
      wallet.onNewAddress = function (addrs) {
        rpc.subscribe_to_addrs(addrs);
      }
      
      rpc.onNewSession = function () {
        rpc.send([['server.banner',[]], ['blockchain.numblocks.subscribe',[]], ['server.peers.subscribe',[]]]);
        rpc.subscribe_to_addrs(wallet.getAllAddrs());  
      };
      
      return this;
    },
    
    "send": function () {
      rpc.send.apply(rpc, arguments);
    },
    
    "handle_response": function handle_response(r) {
      var handler;
      if ('result' in r && r['method'] in that.response_handlers) { // it's a response
        handler = that.response_handlers[r['method']];
        setTimeout(function () {
          handler.call(r, r['result']);
        }, 0);
      } else if (r['method'] in that.message_handlers) { // it's a call
        handler = that.message_handlers[r['method']];
        setTimeout(function () {
          handler.apply(r, r['params']);
        }, 0);
      } else {
        console.log("Warning: no handler for", r['method']);
      }
    },
    
    // messages can have multiple parameters, which are passed as arguments
    "message_handlers": {
      "blockchain.numblocks.subscribe": function (n) {
        wallet.updateNumblocks(n);
      },

      "blockchain.address.subscribe": function (addr, lastBlockHash) {
        if (lastBlockHash == null) {
          wallet.updateTxHistory(addr, []);
        } else if (wallet.lastBlockHash(addr) != lastBlockHash) {
          rpc.send([["blockchain.address.get_history", [addr]]]);
        }
      }
    },
    
    // responses JSON has a 'result' key, the value of which is passed as an argument
    "response_handlers": {
      "blockchain.numblocks.subscribe": function (n) {
        that.message_handlers['blockchain.numblocks.subscribe'](n);
      },
      
      "blockchain.address.subscribe": function (lastBlockHash) {
        var adrs = this.params[0];
        that.message_handlers['blockchain.address.subscribe'](adrs, lastBlockHash);
      },

      "blockchain.address.get_history": function (result) {
        var adrs = this.params[0];
        wallet.updateTxHistory(adrs, result);
        ui.updateBadge();
      },
      
      "blockchain.transaction.broadcast": function (result) {
        ui.onSuccessfulSend(result);
      }
    }
  };
});
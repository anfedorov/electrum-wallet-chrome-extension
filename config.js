var config = (function () {
  var options = JSON.parse(localStorage.options || "{}"),
      default_servers = ["uncle-enzo.info", "electrum.novit.ro", "electrum.bitcoins.sk", "electrum.bitfoo.org"];
  
  if ('available_servers' in options) {
    options['available_servers'] = misc.list_merge(options['available_servers'], default_servers);
  } else {
    options['available_servers'] = default_servers;
  }
  
  options = misc.obj_merge({
      "default_fee": "0.0005",
      "txs_shown": 5,
      "confs_required": 3,
      "server_address": "electrum.novit.ro"
    }, options);
  
  return misc.obj_merge(options, {
    save: function () {
      localStorage.options = JSON.stringify(options);
    },
    
    setOptions: function (opts) {
      misc.obj_merge(options, opts);
      this.save();
    },
    
    update_servers: function (more_servers) {
      options['available_servers'] = misc.list_merge(options['available_servers'], more_servers);
      this.save();
    }
  });
})();
var bp = chrome.extension.getBackgroundPage(),
    doc = document;

function selectTab(e) {
  var tab_name = e.target.text.toLowerCase(),
      tab_id = tab_name + "_tab",
      tabs = document.getElementsByClassName("tab");

  var ts = document.querySelectorAll('.tabselector');
  for (var i = 0; i < ts.length; i++) {
    ts[i].parentNode.classList.remove("active");
  }
  e.target.parentNode.classList.add("active");
  
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].id == tab_id) {
      tabs[i].classList.remove("hidden");
    } else {
      tabs[i].classList.add("hidden");
    }
  }
}

function render_tab(tab_name, data) {
  var tmpl = document.querySelector('#' + tab_name + '-template').innerHTML,
      tab = document.querySelector('#' + tab_name + "_tab");
  tab.innerHTML = Mustache.to_html(tmpl, data);
  return tab;
}

function gen_validate_number(min, max, isInt) {
  return function (e) {
    if (this.value == this.form["was_"+this.name].value) {
      // value hasn't changed
      this.parentElement.parentElement.classList.remove("warning");
      this.parentElement.parentElement.classList.remove("error");
      return true;
    } else if (isNaN(this.value)
        || (isInt && Math.round(this.value) != this.value)
        || this.value < min
        || this.value > max) {
      // failed validation
      this.parentElement.parentElement.classList.remove("warning");
      this.parentElement.parentElement.classList.add("error");
      if (!e) this.select();
      return false;
    } else {
      // passed validation
      this.parentElement.parentElement.classList.remove("error");
      this.parentElement.parentElement.classList.add("warning");
      return true;
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var ts = document.querySelectorAll('.tabselector');
  for (var i = 0; i < ts.length; i++) {
    ts[i].onclick = selectTab;
  }
  
  // ----------- //
  // General tab //
  // ----------- //
  var generalTab = render_tab('general', bp.config);

  generalTab.querySelector("#available_servers").ondblclick = function () {
    var addrInput = generalTab.querySelector("#server_address");
    addrInput.value = this.value;
    addrInput.oninput.call(addrInput);
  };

  generalTab.querySelector("#default_fee").oninput = gen_validate_number(0,0.1,false);
  generalTab.querySelector("#txs_shown").oninput = gen_validate_number(2,10,true);
  generalTab.querySelector("#confs_required").oninput = gen_validate_number(0,10,true);
  generalTab.querySelector("#server_address").oninput = function (e) {
    var ValidIpAddressRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/,
        ValidHostnameRegex = /^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$/;

    if (this.value == this.form["was_"+this.name].value) {
      // value hasn't changed
      this.parentElement.parentElement.classList.remove("warning");
      this.parentElement.parentElement.classList.remove("error");
      return true;
    } else if (ValidIpAddressRegex.test(this.value) || ValidHostnameRegex.test(this.value)) {
      // passed validation
      this.parentElement.parentElement.classList.remove("error");
      this.parentElement.parentElement.classList.add("warning");
      return true;
    } else {
      // failed validation
      this.parentElement.parentElement.classList.remove("warning");
      this.parentElement.parentElement.classList.add("error");
      if (!e) this.select();
      return false;
    }
  };
  
  generalTab.querySelector("#revert").onclick = function () {
    this.form.server_address.value = this.form.was_server_address.value;
    this.form.confs_required.value = this.form.was_confs_required.value;
    this.form.txs_shown.value = this.form.was_txs_shown.value;
    this.form.default_fee.value = this.form.was_default_fee.value;
  };
  
  generalTab.querySelector("form").onsubmit = function () {
    if (this.server_address.oninput.call(this.server_address)
        + this.confs_required.oninput.call(this.confs_required)
        + this.txs_shown.oninput.call(this.txs_shown)
        + this.default_fee.oninput.call(this.default_fee) < 4) {
      return false;
    } else {
      if (this.server_address.value != this.was_server_address.value) {
        bp.rpc.changeHost(this.server_address.value);
      }
      bp.config.setOptions({
        server_address: this.server_address.value,
        confs_required: this.confs_required.value,
        txs_shown: this.txs_shown.value,
        default_fee: this.default_fee.value
      })
      return true;
    }
  };
  
  var host;
  
  if (host = bp.rpc.isConnected()) {
    generalTab.querySelector("#connection_status").innerHTML = "(connected to " + host + ")";
    generalTab.querySelector("#connection_status").style.color = "green";
  } else {
    generalTab.querySelector("#connection_status").innerHTML = "(not connected)";
    generalTab.querySelector("#connection_status").style.color = "red";
  }
  
  chrome.extension.onMessage.addListener(function(r) {
    switch (r.type) {
      case "server_connect":
        if (host = bp.rpc.isConnected()) {
          generalTab.querySelector("#connection_status").innerHTML = "(connected to " + host + ")";
          generalTab.querySelector("#connection_status").style.color = "green";
        }
        break;
      
      case "server_disconnect":
        if (!bp.rpc.isConnected()) {
          generalTab.querySelector("#connection_status").innerHTML = "(not connected)";
          generalTab.querySelector("#connection_status").style.color = "red";
        }
        break;
        
      case "history_updated":
        render_tab('transactions', { transactions: bp.ui.getTxs() });
        render_tab('accounts', { accounts: bp.ui.getAddrs() });
        break;
    }
  });
  
  chrome.extension.onMessage.addListener(function(r) {
    
  });
  
  // -------- //
  // Seed tab //
  // -------- //
  var seedTab = render_tab('seed', {});

  seedTab.querySelector("#seed_value").onclick = function () { this.select(); };
  seedTab.querySelector("#seed_value").value = bp.wallet.getSeed();

  if (bp.km.isEncrypted()) {
    seedTab.querySelector("#is_encrypted").classList.remove("hidden");
    seedTab.querySelector("#is_encrypted form").onsubmit = function () {
      var pass_error = this.querySelector("#pass_error"),
          that = this;
      
      if (bp.km.checkPw(this.passwd.value)) {
        bp.km.decryptMasterPrivKey(this.passwd.value);
        bp.wallet.saveSeed(bp.km.decrypt(bp.wallet.getSeed(), this.passwd.value));
        return true;
      } else {
        this.passwd.parentElement.parentElement.classList.add("error");
        pass_error.classList.remove("hidden");
        this.passwd.oninput = function () {
          that.passwd.parentElement.parentElement.classList.remove("error");
          pass_error.classList.add("hidden");
        }
        return false;
      }
    }
  } else {
    seedTab.querySelector("#not_encrypted").classList.remove("hidden");
    seedTab.querySelector("#not_encrypted form").onsubmit = function () {
      var pass_error = this.querySelector("#pass_error"),
          that = this;
      
      this.passwd.oninput = this.passwd_conf.oninput = function () {
        seedTab.querySelector("#pass_error").classList.add("hidden");
        that.passwd.parentElement.parentElement.classList.remove("error");
        that.passwd_conf.parentElement.parentElement.classList.remove("error");
        that.passwd.oninput = that.passwd_conf.oninput = null;
      }
      
      if (this.passwd.value !== this.passwd_conf.value) {
        pass_error.innerHTML = "passwords must match";
        pass_error.classList.remove("hidden");
        this.passwd.parentElement.parentElement.classList.add("error");
        this.passwd_conf.parentElement.parentElement.classList.add("error");
        this.passwd.select();
        return false;
      }

      if (!this.passwd.value) {
        pass_error.innerHTML = "pass can't be empty";
        pass_error.classList.remove("hidden");
        this.passwd.select();
        return false;
      }

      bp.wallet.saveSeed(bp.km.encrypt(bp.wallet.getSeed(), this.passwd.value));
      bp.km.encryptMasterPrivKey(this.passwd.value);
      return true;
    }
  }

  // ------------ //
  // Accounts tab //
  // ------------ //
  render_tab('accounts', { accounts: bp.ui.getAddrs() });

  // --------------- //
  // Transitions tab //
  // --------------- //
  render_tab('transactions', { transactions: bp.ui.getTxs() });
  
  window.onhashchange = function () {
    var openTab = document.querySelector(document.location.hash || "#general");
    openTab.onclick.call(openTab, {target: openTab});
  }
  
  if (document.location.hash) window.onhashchange();
  document.location.hash = document.location.hash || "#general";
});
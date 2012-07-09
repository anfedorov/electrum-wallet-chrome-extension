var bp = chrome.extension.getBackgroundPage();

function selectTab(e) {
  var tab_id = e.target.innerText.toLowerCase() + "_tab",
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
      tab = document.querySelector('#' + tab_name);
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
  
  render_tab('accounts', {accounts: bp.ui.getAddrs()});
  render_tab('transactions', {transactions: bp.ui.getTxs()});
  var generalTab = render_tab('general', bp.config)

  generalTab.querySelector("#available_servers").ondblclick = function () {
    var addrInput = generalTab.querySelector("#server_address");
    addrInput.value = this.value;
    addrInput.oninput.call(addrInput);
  }

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
  }
  
  generalTab.querySelector("#revert").onclick = function () {
    this.form.server_address.value = this.form.was_server_address.value;
    this.form.confs_required.value = this.form.was_confs_required.value;
    this.form.txs_shown.value = this.form.was_txs_shown.value;
    this.form.default_fee.value = this.form.was_default_fee.value;
  }
  
  generalTab.querySelector("form").onsubmit = function () {
    if (this.server_address.oninput.call(this.server_address)
        + this.confs_required.oninput.call(this.confs_required)
        + this.txs_shown.oninput.call(this.txs_shown)
        + this.default_fee.oninput.call(this.default_fee) < 4) {
      return false;
    } else {
      bp.config.setOptions({
        server_address: this.server_address.value,
        confs_required: this.confs_required.value,
        txs_shown: this.txs_shown.value,
        default_fee: this.default_fee.value
      })
      return true;
    }
  }
  
});
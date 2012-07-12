var bp = chrome.extension.getBackgroundPage();


chrome.extension.onMessage.addListener(
  function(r) {
    if (r.type == "history_updated") {
      var main = document.querySelector('#main'), 
          new_main = render("main", {}, true);

      main.querySelector("#balance").innerHTML = new_main.querySelector("#balance").innerHTML;
      main.querySelector("#recent_txs").innerHTML = new_main.querySelector("#recent_txs").innerHTML;
    }
  });

function selectTab(e) {
  var tab_id = e.target.innerText.toLowerCase() + "_tab",
      tabs = document.getElementsByClassName("tab");

  var ts = document.querySelectorAll('.tabselector');
  for (var i = 0; i < ts.length; i++) {
    ts[i].parentNode.classList.remove("active");
  }
  e.target.parentNode.classList.add("active");
  
  onTabSelect(tab_id);
  
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].id == tab_id) {
      tabs[i].classList.remove("hidden");
      tabs[i].querySelector("input").focus();
      tabs[i].querySelector("input").select();
      tabs[i].querySelector("input").click();
    } else {
      tabs[i].classList.add("hidden");
    }
  }
}

function onTabSelect(tab) {
  switch (tab) {
    case "send_tab":
      break;

    case "receive_tab":
      document.forms.receive_form.address.value = "Generating..."
      document.forms.receive_form.address.value = bp.wallet.nextUnusedAddr();
      document.forms.receive_form.address.onclick = function () { this.select(); };
      break;
  }
}

function validate_addr(e) {
  if (e && !this.value) {
    this.parentElement.parentElement.classList.remove("error");
    this.parentElement.parentElement.classList.remove("success");
    return false;
  }
  this.oninput = validate_addr;
  this.onblur = null;
  try {
    bp.Bitcoin.Address.decodeString(this.value);
    if (bp.wallet.getAllAddrs().indexOf(this.value) != -1) {
      // error!
      this.parentElement.parentElement.classList.add("warning");
      this.parentElement.parentElement.classList.remove("success");
      if (!e) this.select();
      return false;
    } else {
      this.parentElement.parentElement.classList.remove("error");
      this.parentElement.parentElement.classList.add("success");
    }
    // success!
    return true;
  } catch (err) {
    // failure!
    this.parentElement.parentElement.classList.remove("success");
    this.parentElement.parentElement.classList.add("error");
    if (!e) this.select();
    return false;
  }
}

function validate_amount(e) {
  if (e && !this.value) {
    this.parentElement.parentElement.parentElement.classList.remove("error");
    this.parentElement.parentElement.parentElement.classList.remove("success");
    return false;
  }
  this.oninput = validate_amount;
  this.onblur = null;
  try {
    if (!this.value || isNaN(this.value) || this.value <= 0) {
      throw "Error!";
    } else {
      bp.wallet.gatherInputs(Math.round((this.value + Number(bp.config.default_fee)) * 1e8));
      this.parentElement.parentElement.parentElement.classList.add("success");
      this.parentElement.parentElement.parentElement.classList.remove("error");
      return true;
    }
  } catch (err) {
    this.parentElement.parentElement.parentElement.classList.add("error");
    this.parentElement.parentElement.parentElement.classList.remove("success");
    if (!e) {
      this.select();
    }
    return false;
  }
}

function validate_passwd(e) {
  // no password field means no password necessary
  if (this === window) return true;
  
  // if field is empty and we aren't trying to submit
  if (e && !this.value) {
    this.parentElement.parentElement.classList.remove("error");
    this.parentElement.parentElement.classList.remove("success");
    this.oninput = null;
    this.onblur = validate_passwd;
    return false;
  } else {
    this.oninput = function () {
      this.parentElement.parentElement.classList.remove("error");
      this.parentElement.parentElement.classList.remove("success");
    };
  }
  if (bp.km.isEncrypted() && !bp.km.checkPw(this.value)) {
    this.parentElement.parentElement.classList.add("error");
    this.parentElement.parentElement.classList.remove("success");
    if (!e) {
      this.select();
    }
    return false;
  } else {
    this.parentElement.parentElement.classList.add("success");
    this.parentElement.parentElement.classList.remove("error");
    return true;
  }
  
}

function render(tmplName, tmplData, returnNewDiv) {
  var tmpl = document.querySelector('#' + tmplName + '-template').innerHTML,
      main = returnNewDiv ? document.createElement("div")
                          : document.querySelector('#main');
  
  if (tmplName == 'main') {
    bp.misc.obj_merge(tmplData, bp.ui.popupData());
  }
  
  main.innerHTML = Mustache.to_html(tmpl, tmplData);
  
  return main;
}

document.addEventListener('DOMContentLoaded', function () {
  if (bp.km.isReady()) {
    render('main', {sent_success: false});
    var tabs = document.querySelector("#tabs"),
        sending = document.querySelector("#sending"),
        sent = document.querySelector("#sent"),
        sendError = document.querySelector("#error"),
        sendTab = document.querySelector("#send_tab");

    sendTab.querySelector("#to").onblur = validate_addr;
    sendTab.querySelector("#amount").onblur = validate_amount;
    // sendTab.querySelector("#passwd") && (sendTab.querySelector("#passwd").onblur = validate_passwd);

    var ts = document.querySelectorAll('.tabselector');
    for (var i = 0; i < ts.length; i++) {
      ts[i].addEventListener('click', selectTab);
    }

    document.forms.receive_form.onsubmit = function () {
      bp.ui.receive(this.label.value, this.address.value);
    };

    document.forms.send_form.onsubmit = function () {
      var that = this;

      if ( validate_passwd.call(sendTab.querySelector("#passwd"))
         + validate_amount.call(sendTab.querySelector("#amount"))
         + validate_addr.call(sendTab.querySelector("#to")) < 3 ) {
        return false;
      }

      document.querySelector("#error").onclick = function () {
        this.classList.add("hidden");
        sendTab.classList.remove("hidden");
        tabs.classList.remove("hidden");
        sendTab.querySelector("input[type=submit]").focus();
      };

      sendTab.classList.add("hidden");
      tabs.classList.add("hidden");

      sending.classList.remove("hidden");

      setTimeout(function () {
        bp.ui.send(
          that.to.value,
          that.amount.value,
          that.label.value,
          that.passwd && this.passwd.value,
          function onSuccess() {
            render('main', {sent_success: true});
          },
          function onError(e) {
            sending.classList.add("hidden");
            sendError.classList.remove("hidden");
            sendError.querySelector(".description").innerHTML = e;
            sendError.focus();
          }
        );
      }, 100);

      return false;
    };

    setTimeout(function () {
      document.activeElement.blur();
    }, 100);

  } else if (typeof(bp.km.password) != "undefined") {
    var decryptedSeed = bp.wallet.getSeed(),
        encryptedSeed;
    
    if (!decryptedSeed) {
      decryptedSeed = bp.Crypto.util.bytesToHex(bp.Crypto.util.randomBytes(16));
    }
    
    if (bp.km.seedEncrypted(decryptedSeed)) {
      encryptedSeed = decryptedSeed;
      decryptedSeed = bp.km.decrypt(encryptedSeed, bp.km.password);
    }

    if (bp.km.password && !encryptedSeed) {
      encryptedSeed = bp.km.encrypt(decryptedSeed, bp.km.password);
      bp.wallet.saveSeed(encryptedSeed);
    } else {
      bp.wallet.saveSeed(decryptedSeed);
    }
    
    var main = render('gen-wallet', {is_encrypted: !!encryptedSeed}),
        seed = main.querySelector("#seed"),
        progressBar = main.querySelector("#stretch_progress");
    
    seed.value = encryptedSeed || decryptedSeed;
    seed.onclick = function () { this.select(); };
    seed.select();
    
    bp.km.genKeysFromSeed(
      decryptedSeed,
      function onprogress(pct) {
        progressBar.style.width = pct + '%';
      },
      function onfinish() {
        progressBar.parentElement.classList.remove("active");
        progressBar.parentElement.classList.remove("progress-striped");
        
        if (bp.km.password) {
          bp.km.encryptMasterPrivKey(bp.km.password);
          delete bp.km.password;
        }
        
        bp.wallet.extendAddressChain();
        bp.km.saveKeys();
        main.querySelector("#gogogo").disabled = false;
      }
    );
      
    main.querySelector("#gogogo").onclick = function () {
      bp.km.ready = true;
    };
    
  } else {
    var main = render('new-wallet', {sent_success: false});
    
    main.querySelector("#create_new").onclick = function () {
      var main = render('add-password');
      main.querySelector("input").focus();
      main.querySelector("#skip").onclick = function () {
        bp.km.password = false;
      };
      main.querySelector('#add_passwd').onsubmit = function () {
        if (typeof(bp.km.password) == 'undefined') {
          if (this.new_passwd.value && this.new_passwd.value == this.vfy_passwd.value) {
            bp.km.password = this.new_passwd.value;
          } else {
            this.new_passwd.parentElement.parentElement.classList.add("error");
            this.vfy_passwd.parentElement.parentElement.classList.add("error");
            return false;
          }
        }
      };
    };
    
    document.querySelector("#import_old").onclick = function () {
      var main = render('restore-wallet'),
          form = main.querySelector("form");
      
      form.seed.oninput = function () {
        this.value = this.value.replace(/^\s+|\s+$/g, '');
        try {
          if (bp.km.seedEncrypted(this.value)) {
            form.passwd.classList.remove("hidden");
            this.parentElement.parentElement.classList.add("success");
            this.parentElement.parentElement.classList.remove("error");
          } else {
            form.passwd.classList.add("hidden");
            form.passwd.value = "";
            this.parentElement.parentElement.classList.add("success");
            this.parentElement.parentElement.classList.remove("error");
          }
        } catch (e) {
          this.parentElement.parentElement.classList.add("error");
          this.parentElement.parentElement.classList.remove("success");
        }
      };
      
      form.passwd.onblur = function () {
        try {
          if (bp.km.seedEncrypted(bp.km.decrypt(form.seed.value, this.value))) {
            this.parentElement.parentElement.classList.add("error");
            this.parentElement.parentElement.classList.remove("success");
          } else {
            this.parentElement.parentElement.classList.add("success");
            this.parentElement.parentElement.classList.remove("error");
          }
        } catch (e) {
          this.parentElement.parentElement.classList.add("error");
          this.parentElement.parentElement.classList.remove("success");
        }
      };
      
      main.querySelector("form").onsubmit = function () {
        try {
          if (!bp.km.seedEncrypted(this.seed.value)
              || !bp.km.seedEncrypted(bp.km.decrypt(this.seed.value, this.passwd.value))) {
            bp.km.password = this.passwd.value;
            bp.wallet.saveSeed(this.seed.value);
            return true;
          }
        } catch (e) {
          return false;
        }
      };
    };
  }

});
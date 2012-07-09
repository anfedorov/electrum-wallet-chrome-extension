var misc = {
  "obj_size": function (o) {
    var t = 0;
    for (var i in o) if (o.hasOwnProperty(i)) t++;
    return t;
  },
  
  "obj_merge": function (o, p) {
    for (var x in p)
      if (p.hasOwnProperty(x))
        o[x] = p[x];
    return o;
  },
  
  "obj_keys": function (o) {
    var keys = [];
    for (var x in o)
      if (o.hasOwnProperty(x))
        keys.push(x);
    return keys;
  },
  
  "obj_select_keys": function (o, ks) {
    var r = {};
    for (var i=0; i < ks.length; i++) {
      r[ks[i]] = o[ks[i]];
    }
    return r;
  },
  
  "list_merge": function (xs, ys) {
    var ret = xs.slice(0);
    for (var i=0; i < ys.length; i++) {
      if (ret.indexOf(ys[i]) == -1) {
        ret.push(ys[i]);
      }
    }
    return ret;
  },
  
  "printDate": function printDate(timestamp){
    var a = new Date(timestamp*1000);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    return month+' '+date+', '+year+' at '+hour+':'+min+':'+sec;
   },
  
  "bc": {
    "str_type": function (s) {
      // if (new )
    },
    
    "str_to_addr": function () {
      
    }
  }
};

function debug(x) {
  console.log(x);
  return x;
}
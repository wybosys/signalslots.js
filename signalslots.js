var Ss = {};
window.Ss = Ss;

function Set(arr, r) {
  arr.length = 0;
  r.forEach(function (o) {
    arr.push(o);
  }, this);
};

function RemoveObjectsInIndexArray(arr, r) {
  var rm = new Array();
  var res = arr.filter(function (each, idx) {
    if (r.indexOf(idx) != -1) {
      rm.push(each);
      return false;
    }
    return true;
  }, this);
  Set(arr, res);
  return rm;
};

function RemoveObjectByFilter(arr, filter, ctx) {
  if (arr) {
    for (var i = 0; i < arr.length; ++i) {
      var e = arr[i];
      if (filter.call(ctx, e, i)) {
        arr.splice(i, 1);
        return e;
      }
    }
  }
  return null;
};

function QueryObject(arr, filter) {
  if (arr)
    for (var i = 0, l = arr.length; i < l; ++i) {
      var e = arr[i];
      if (filter(e, i))
        return e;
    }
  return null;
};

function Foreach(tgt, proc) {
  for (var k in tgt) {
    proc(tgt[k], k);
  }
};

var SlotTunnel = (function () {
  function SlotTunnel() {
  }

  return SlotTunnel;
}());
Ss.SlotTunnel = SlotTunnel;

var Slot = (function () {
  function Slot() {
    this.emitedCount = 0;
  }

  Object.defineProperty(Slot.prototype, "veto", {
    get: function () {
      return this._veto;
    },
    set: function (b) {
      this._veto = b;
      if (this.tunnel)
        this.tunnel.veto = b;
    },
    enumerable: true,
    configurable: true
  });
  Slot.prototype.emit = function (data, tunnel) {
    this.data = data;
    this.tunnel = tunnel;
    this.doEmit();
  };
  Slot.prototype.doEmit = function () {
    if (this.target) {
      if (this.cb) {
        this.cb.call(this.target, this);
      }
    } else if (this.cb) {
      this.cb.call(this, this);
    }
    this.data = undefined;
    this.tunnel = undefined;
    ++this.emitedCount;
  };
  Slot.Data = function (d) {
    var r = new Slot();
    r.data = d;
    return r;
  };
  return Slot;
}());
Ss.Slot = Slot;

var Slots = (function () {
  function Slots() {
    this.slots = new Array();
  }

  Slots.prototype.add = function (s) {
    this.slots.push(s);
  };
  Slots.prototype.emit = function (data, tunnel) {
    var _this = this;
    var ids;
    this.slots.concat().forEach(function (o, idx) {
      if (o.count != null &&
          o.emitedCount >= o.count)
        return true;
      o.signal = _this.signal;
      o.sender = _this.owner;
      o.emit(data, tunnel);
      if (o.count != null &&
          o.emitedCount >= o.count) {
        if (ids == null)
          ids = new Array();
        ids.push(idx);
        return true;
      }
      return !(o.veto);
    }, this);
    if (ids) {
      RemoveObjectsInIndexArray(this.slots, ids);
    }
  };
  Slots.prototype.disconnect = function (cb, target) {
    var rmd = RemoveObjectsByFilter(this.slots, function (o) {
      if (cb && o.cb != cb)
        return false;
      if (o.target == target) {
        return true;
      }
      return false;
    }, this);
    return rmd.length != 0;
  };
  Slots.prototype.find_connected_function = function (cb, target) {
    return QueryObject(this.slots, function (s) {
      return s.cb == cb && s.target == target;
    });
  };
  Slots.prototype.is_connected = function (target) {
    return QueryObject(this.slots, function (s) {
      return s.target == target;
    }) != null;
  };
  return Slots;
}());
Ss.Slots = Slots;

var Signals = (function () {
  function Signals() {
    this._slots = {};
  }

  Signals.prototype.register = function (sig) {
    if (sig == null) {
      console.warn("不能注册一个空信号");
      return false;
    }
    if (this._slots[sig])
      return false;
    this._slots[sig] = null;
    return true;
  };
  Signals.prototype.avaslots = function (sig) {
    var ss = this._slots[sig];
    if (ss === undefined) {
      console.warn("对象信号 " + sig + " 不存在");
      return null;
    }
    if (ss == null) {
      ss = new Slots();
      ss.signal = sig;
      this._slots[sig] = ss;
    }
    return ss;
  };
  Signals.prototype.once = function (sig, cb, target) {
    var r = this.connect(sig, cb, target);
    r.count = 1;
    return r;
  };
  Signals.prototype.connect = function (sig, cb, target) {
    var ss = this.avaslots(sig);
    if (ss == null) {
      console.warn("对象信号 " + sig + " 不存在");
      return null;
    }
    var s;
    if (s = ss.find_connected_function(cb, target))
      return s;
    s = new Slot();
    s.cb = cb;
    s.target = target;
    ss.add(s);
    return s;
  };
  Signals.prototype.isConnected = function (sig) {
    var ss = this._slots[sig];
    return ss != null && ss.slots.length != 0;
  };
  Signals.prototype.emit = function (sig, data, tunnel) {
    var ss = this._slots[sig];
    if (ss) {
      ss.emit(data, tunnel);
    } else if (ss === undefined) {
      console.warn("对象信号 " + sig + " 不存在");
      return;
    }
  };
  Signals.prototype.disconnectOfTarget = function (target, inv) {
    if (inv === void 0) {
      inv = true;
    }
    if (target == null)
      return;
    Foreach(this._slots, function (ss) {
      if (ss)
        ss.disconnect(null, target);
    });
  };
  Signals.prototype.disconnect = function (sig, cb, target) {
    var ss = this._slots[sig];
    if (ss == null)
      return;
    if (cb == null && target == null) {
      ss.slots.length = 0;
    }
  };
  return Signals;
}());
Ss.Signals = Signals;

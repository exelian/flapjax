goog.require('goog.testing.jsunit');
goog.require('goog.testing.AsyncTestCase');
goog.require('F');

function testBind1() {
  var e1 = F.receiver(F.X);
  var e2 = e1.bind(function(v) { return F.constant(v + 1); });
  e1.send(300);
  assertEquals(301, e2.valueNow_);
  e1.send(500);
  assertEquals(501, e2.valueNow_);
  e1.send(F.X);
  assertEquals(F.X, e2.valueNow_);
  e1.send(400);
  assertEquals(401, e2.valueNow_);
}

function testBind2() {
  var e1 = F.receiver(F.X);
  var e2 = e1.bind(function(v) {
    if (v === 100) {
      return F.constant(100);
    }
    else if (v === 200) {
      return e1;
    }
    else if (v === 300) {
      return e3;
    }
    throw  'unexpected value: ' + v;
  });
  var e3 = e2.bind(function(v) {
    if (v === 300) {
      throw 'infinite loop detected';
    }
    return F.constant(v + 1);
  });
  e1.send(100);
  assertEquals(101, e3.valueNow_);
  e1.send(200);
  assertEquals(201, e3.valueNow_);
  var exn = assertThrows(function() { e1.send(300); });
  assertEquals('infinite loop detected', exn);
}

function testBind3() {
  var e1 = F.receiver(0);
  var e2 = F.app(function(v) { return v + 1; }, e1);
  var e3 = e1.bind(function(v) {
    if (v === 0) {
      return e1;
    }
    if (v === 500) {
      return F.app(function(v) { return v + 500; }, e1);
    }
    fail('unexpected v');
  });
  var e4 = F.app(function(v, w) { return v + w; }, e2, e3);
  var e3inter = F.app(function(v) { return v + 500; }, e1);
  assertEquals(1, e2.rank_);
  assertEquals(1, e3.rank_);
  assertEquals(1, e4.valueNow_);
  e1.send(500);
  assertEquals(1000, e3inter.valueNow_);
  assertEquals(501, e2.valueNow_);
  assertEquals(1000, e3.valueNow_);
  assertEquals(1501, e4.valueNow_);
}

function testBind4() {
  var e1 = F.receiver(0);
  var e2 = 
    F.app(F.util.identity,
      F.app(F.util.identity, F.app(function(v) { return v + 1; }, e1)));
  var e3 = e1.bind(function(v) {
    if (v === 0) {
      return e1;
    }
    if (v >= 500) {
      return e2;
    }
    fail('unexpected v');
  });
  var calls = 0;
  var e4 = F.app(function(v, w) {
    calls++;
    return v + w;
  }, e2, e3);
  assertEquals(1, e4.valueNow_);
  assertEquals(1, calls);
  e1.send(500);
  assertEquals(2, calls);
  assertEquals(501, e2.valueNow_);
  assertEquals(501, e3.valueNow_);
  assertEquals(1002, e4.valueNow_);
  e1.send(600);
  assertEquals(3, calls);
  assertEquals(601, e2.valueNow_);
  assertEquals(601, e3.valueNow_);
  assertEquals(1202, e4.valueNow_);
}

function testBind4() {
  var e1 = F.receiver(0);
  var e2 = F.app(function(v) { return v + 1; }, e1);
  var e3 = e1.bind(function(v) {
    if (v === 0) {
      return e1;
    }
    if (v >= 500) {
      return F.app(F.util.identity,
      F.app(F.util.identity, F.app(function(v) { return v + 1; }, e1)));
    }
    fail('unexpected v');
  });
  var calls = 0;
  var e4 = F.app(function(v, w) { 
    calls++;
    return v + w; 
  }, e2, e3);
  assertEquals(1, calls);
  assertEquals(1, e4.valueNow_);
  e1.send(500);
  assertEquals(2, calls);
  assertEquals(501, e2.valueNow_);
  assertEquals(501, e3.valueNow_);
  assertEquals(1002, e4.valueNow_);
  e1.send(600);
  assertEquals(3, calls);
  assertEquals(601, e2.valueNow_);
  assertEquals(601, e3.valueNow_);
  assertEquals(1202, e4.valueNow_);
}

function testMerge1() {
  var e1 = F.receiver(F.X);
  var e2 = F.receiver(F.X);
  var e3 = F.merge(e1, e2);
  assertEquals(F.X, e3.valueNow_);
  e1.send(100);
  assertEquals(100, e3.valueNow_);
  e2.send(200);
  assertEquals(200, e3.valueNow_);
  e1.send(300);
  assertEquals(300, e3.valueNow_);
}

// Merge is left-biased for simultaneous events.
function testMerge2() {
  var e1 = F.receiver(F.X);
  var e2 = e1.bind(function(v) { return F.constant(v + 1); });
  var e3 = F.merge(e1, e2);
  assertEquals(F.X, e3.valueNow_);
  e1.send(100);
  assertEquals(100, e3.valueNow_);
  e1.send(200);
  assertEquals(200, e3.valueNow_);
  e1.send(300);
  assertEquals(300, e3.valueNow_);
}

function testDisjointMerge1() {
  var e1 = F.receiver(F.X);
  var e2 = F.receiver(F.X);
  var e3 = F.disjointMerge(e1, e2);
  assertObjectEquals({ v: F.X, i: 0 }, e3.valueNow_);
  e1.send(100);
  assertObjectEquals({ v: 100, i: 0 }, e3.valueNow_);
  e2.send(200);
  assertObjectEquals({ v: 200, i: 1 }, e3.valueNow_);
  e1.send(300);
  assertObjectEquals({ v: 300, i: 0 }, e3.valueNow_);
}

function testApp1() {
  var e1 = F.receiver(1);
  var e2 = F.receiver(2);
  var e3 = F.app(function(x, y) { return x + y; }, e1, e2);
  assertEquals(3, e3.valueNow_);
  e1.send(10);
  assertEquals(12, e3.valueNow_);
  e2.send(5);
  assertEquals(15, e3.valueNow_);
}

function testApp2() {
  var e1 = F.receiver(1);
  var e2 = F.app(function(x) { return x * 2; }, e1);
  var e3 = F.app(function(x, y) { return x + y; }, e1, e2);
  assertEquals(3, e3.valueNow_);
  e1.send(10);
  assertEquals(30, e3.valueNow_);
  e1.send(5);
  assertEquals(15, e3.valueNow_);
}

function testApp3() {
  var e1 = F.receiver(1);
  var e2 = F.app(function(x) { return x * 2; }, e1);
  // e1 and e2 are swapped below from testApp2
  var e3 = F.app(function(x, y) { return x + y; }, e2, e1);
  assertEquals(3, e3.valueNow_);
  e1.send(10);
  assertEquals(30, e3.valueNow_);
  e1.send(5);
  assertEquals(15, e3.valueNow_);
}

function testAppWithInit1() {
  var e1 = F.receiver(1);
  var e2 = F.receiver(2);
  var e3 = F.appWithInit(900, function(x, y) { return x + y; }, e1, e2);
  assertEquals(900, e3.valueNow_);
  e1.send(10);
  assertEquals(12, e3.valueNow_);
  e2.send(5);
  assertEquals(15, e3.valueNow_);
}

function testFold1() {
  function f(v, acc) {
    return v + acc;
  }
  var e1 = F.receiver(F.X);
  var e2 = e1.fold(0, f);
  assertEquals(0, e2.valueNow_);
  e1.send(1);
  assertEquals(1, e2.valueNow_);
  e1.send(2);
  assertEquals(3, e2.valueNow_);
  e1.send(3);
  assertEquals(6, e2.valueNow_);
}

function testLetrec1() {
  var es = F.letrec(function(e) {
    return [ F.constant(100) ];
  });
  assertEquals(100, es[0].valueNow_);
}

function plus(x, y) {
  if (x === F.X) {
    x = 0;
  }
  if (y === F.X) {
    y = 0;
  }
  return x + y;
}

function testLetrec2() {
  var keys1 = F.receiver(F.X);
  var keys2 = F.receiver(F.X);
  var es = F.letrec(function(w1, w2) {
    return [ F.app(plus, keys1, w2), F.app(plus, keys2, w1) ];
  });
  assertEquals(0, es[0].valueNow_);
  assertEquals(0, es[1].valueNow_);
  keys1.send(500);
  assertEquals(500, es[0].valueNow_);
  assertEquals(0, es[1].valueNow_);
  keys2.send(200);
  assertEquals(500, es[0].valueNow_);
  assertEquals(700, es[1].valueNow_);
  keys1.send(400);
  assertEquals(1100, es[0].valueNow_);
  assertEquals(700, es[1].valueNow_);
}

function testInterval1() {
  var delay = F.receiver(100);
  var calls = 0;
  var lastT = F.util.now();
  function f(t) {
    calls++;
    assertRoughlyEquals(100, t - lastT, 100);
    lastT = t;
    if (calls === 3) {
      delay.send(null);
      // allow calls > 3 fire if there is a bug
      window.setTimeout(function() { asyncTestCase.continueTesting(); }, 500);
    }
    if (calls > 3) {
      fail('timer did not stop');
    }
  }
  F.app(f, F.interval(delay));
  asyncTestCase.waitForAsync();
}

function testFilter1() {
  var src = F.receiver(0);
  src.filter(function(x) { return x % 2 === 0; }).map(function(v) {
    assertEquals(0, v % 2);
  });
  src.send(1);
  src.send(2);
  src.send(F.X);
  src.send(10);
  src.send(99);
}

function testFilter2() {
  var sig = F.receiver(1).filter(function(v) { return v % 2 === 0; });
  assertEquals(F.X, sig.valueNow_);
}

function testDelay1() {
  var start = Date.now();
  var src = F.receiver(F.X);
  src.delay(500).map(function(end) {
    if (end === F.X) {
      return F.X;
    }
    assertRoughlyEquals(start, end, 500);
    asyncTestCase.continueTesting();
  });
  src.send(start);
  asyncTestCase.waitForAsync();
}

function testDelayVarying() {
  var d = F.receiver(500);
  var src = F.receiver(0);
  var last = Date.now();
  src.delay(d).map(function(v) {
    switch (v) {
    case 0:
      d.send(200);
      break;
    case 1:
      assertRoughlyEquals(last + 200, Date.now(), 100);
      last = Date.now();
      src.send(2);
      break;
    case 2:
      assertRoughlyEquals(last + 200, Date.now(), 100);
      last = Date.now();
      d.send(500);
      src.send(3);
      break;
    case 3:
      assertRoughlyEquals(last + 500, Date.now(), 100);
      last = Date.now();
      asyncTestCase.continueTesting();
      break;
    default:
      fail('> 3 iterations');
    }
    return F.X;
  });
  src.send(1);
  asyncTestCase.waitForAsync();
}

function testDelayEdgeCase() {
  var d = F.receiver(500);
  var src = F.receiver(0);
  var last = Date.now();
  src.delay(d).map(function(v) {
    switch (v) {
    case 0:
      d.send(2000);
      src.send(1);
      window.setTimeout(function() {
        d.send(500);
        src.send(2);
      }, 500);
      break;
    case 1:
      fail('1 should be skipped because delay is changed while 1 is queued');
      break;
    case 2:
      assertRoughlyEquals(last + 1000, Date.now(), 100);
      asyncTestCase.continueTesting();
      break;
    default:
      fail('too many values');
    }
    return F.X;
  });
  asyncTestCase.waitForAsync();
}

function testDelayRapid() {
  var d = F.receiver(500);
  var src = F.receiver(0);
  var last = Date.now();
  src.delay(d).map(function(v) {
    switch (v) {
    case 0:
      break;
    case 1:
    case 2:
      assertRoughlyEquals(last + 500, Date.now(), 100);
      last = Date.now();
      break;
    case 3:
      assertRoughlyEquals(last + 500, Date.now(), 100);
      asyncTestCase.continueTesting();
      break;
    default:
      fail('too many values');
    }
    return F.X;
  });
  asyncTestCase.waitForAsync();
  window.setTimeout(function() {
    src.send(1);
    window.setTimeout(function() {
      src.send(2);
      window.setTimeout(function() {
        src.send(3);
      }, 100);
    }, 100);
  }, 100);
}

var asyncTestCase;
window.addEventListener('load', function(_) {
  asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
  asyncTestCase.stepTimeout = 3000;
});

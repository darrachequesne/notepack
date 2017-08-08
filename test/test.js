'use strict';

var notepack = require('../');

function array(length) {
  var arr = new Array(length);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = 0;
  }
  return arr;
}

function map(length) {
  var result = {};
  for (var i = 0; i < length; i++) {
    result[i + ''] = 0;
  }
  return result;
}

function checkDecode(value, hex) {
  var decodedValue = notepack.decode(new Buffer(hex, 'hex'));
  expect(decodedValue).to.deep.equal(value, 'decode failed');
}

function checkEncode(value, hex) {
  var encodedHex = notepack.encode(value).toString('hex');
  expect(encodedHex).to.equal(hex, 'encode failed');
}

function check(value, hex) {
  checkEncode(value, hex);
  checkDecode(value, hex);

  // And full circle for fun
  expect(notepack.decode(notepack.encode(value))).to.deep.equal(value);
}

describe('notepack', function () {
  this.timeout(10000);

  it('positive fixint', function () {
    check(0x00, '00');
    check(0x44, '44');
    check(0x7f, '7f');
  });

  it('negative fixint', function () {
    check(-0x01, 'ff');
    check(-0x10, 'f0');
    check(-0x20, 'e0');
  });

  it('fixmap', function () {
    check({}, '80');
    check({ a: 1, b: 2, c: 3 }, '83a16101a16202a16303');
  });

  it('fixarray', function () {
    check([], '90');
    check([1, 2, 3, 4], '9401020304');
  });

  it('fixstr', function () {
    check('', 'a0');
    check('hello', 'a568656c6c6f');
  });

  it('nil', function () {
    check(null, 'c0');
  });

  it('false', function () {
    check(false, 'c2');
  });

  it('true', function () {
    check(true, 'c3');
  });

  it('bin 8', function () {
    check(new Buffer(0), 'c4' + '00');
    check(new Buffer([0]), 'c4' + '01' + '00');
    check(new Buffer('hello'), 'c4' + '05' + '68656c6c6f');
  });

  it('bin 16', function () {
    check(new Buffer('a'.repeat(256)), 'c5' + '0100' + '61'.repeat(256));
  });

  it('bin 32', function () {
    check(new Buffer('a'.repeat(65536)), 'c6' + '00010000' + '61'.repeat(65536));
  });

  it('ext 8', function () {
    checkDecode([127, new Buffer('hello')], 'c7' + '05' + '7f' + '68656c6c6f');
    check(Uint8Array.of(1, 2, 3, 4).buffer, 'c7' + '04' + '00' + '01020304');
  });

  it('ext 16', function () {
    checkDecode([1, new Buffer('a'.repeat(256))], 'c8' + '0100' + '01' + '61'.repeat(256));
    var array = new Uint8Array(256);
    array.fill(8);
    check(array.buffer, 'c8' + '0100' + '00' + '08'.repeat(256));
  });

  it('ext 32', function () {
    checkDecode([-128, new Buffer('a'.repeat(65536))], 'c9' + '00010000' + '80' + '61'.repeat(65536));
    var array = new Uint8Array(65536);
    array.fill(9);
    check(array.buffer, 'c9' + '00010000' + '00' + '09'.repeat(65536));
  });

  // float 32
  // JavaScript doesn't support single precision floating point numbers

  it('float 32', function () {
    var buf = new Buffer(5);
    buf.writeUInt8(0xca, 0);
    buf.writeFloatBE(0.5, 1);
    checkDecode(0.5, buf.toString('hex'));
  });

  it('float 64', function () {
    check(1.1, 'cb' + '3ff199999999999a');
    check(1234567891234567.5, 'cb' + '43118b54f26ebc1e');
    check(Infinity, 'cb' + '7ff0000000000000');
    check(-Infinity, 'cb' + 'fff0000000000000');
    check(NaN, 'cb' + '7ff8000000000000');
  });

  it('uint 8', function () {
    check(128, 'cc80');
    check(255, 'ccff');
  });

  it('uint 16', function () {
    check(256, 'cd0100');
    check(65535, 'cdffff');
  });

  it('uint 32', function () {
    check(65536, 'ce00010000');
    check(4294967295, 'ceffffffff');
  });

  it('uint 64', function () {
    check(4294967296, 'cf0000000100000000');
    check(Math.pow(2, 53) - 1, 'cf001fffffffffffff');
  });

  // NOTE: We'll always encode a positive number as a uint, but we should be
  // able to decode a positive int value

  it('int 8', function () {
    checkDecode(127, 'd07f');
    checkDecode(32, 'd020');
    checkDecode(1, 'd001');
    checkDecode(0, 'd000');
    checkDecode(-1, 'd0ff');
    check(-33, 'd0df');
    check(-128, 'd080');
  });

  it('int 16', function () {
    checkDecode(32767, 'd17fff');
    checkDecode(128, 'd10080');
    checkDecode(1, 'd10001');
    checkDecode(0, 'd10000');
    checkDecode(-1, 'd1ffff');
    check(-129, 'd1ff7f');
    check(-32768, 'd18000');
  });

  it('int 32', function () {
    checkDecode(2147483647, 'd27fffffff');
    checkDecode(32768, 'd200008000');
    checkDecode(1, 'd200000001');
    checkDecode(0, 'd200000000');
    checkDecode(-1, 'd2ffffffff');
    check(-32769, 'd2ffff7fff');
    check(-2147483648, 'd280000000');
  });

  it('int 64', function () {
    checkDecode(Math.pow(2, 53), 'd30020000000000000');
    checkDecode(4294967296, 'd30000000100000000');
    checkDecode(1, 'd30000000000000001');
    checkDecode(0, 'd30000000000000000');
    checkDecode(-1, 'd3ffffffffffffffff');
    check(-2147483649, 'd3ffffffff7fffffff');
    check(-4294967297, 'd3fffffffeffffffff');
    check(-65437650001231, 'd3ffffc47c1c1de2b1');
    check(-1111111111111111, 'd3fffc0d7348ea8e39');
    check(-1532678092380345, 'd3fffa8e0992bfa747');
    check(-4503599627370496, 'd3fff0000000000000');
    check(-7840340234323423, 'd3ffe42540896a3a21');
    // Minimum safe signed integer
    check(-Math.pow(2, 53) + 1, 'd3ffe0000000000001');
  });

  it('fixext 1 / undefined', function () {
    check(undefined, 'd40000');
    checkDecode([127, new Buffer('a')], 'd4' + '7f' + '61');
  });

  it('fixext 2', function () {
    checkDecode([127, new Buffer('ab')], 'd5' + '7f' + '6162');
  });

  it('fixext 4', function () {
    checkDecode([127, new Buffer('abcd')], 'd6' + '7f' + '61626364');
  });

  it('fixext 8 / Date', function () {
    check(new Date(0), 'd7000000000000000000');
    check(new Date('1956-06-17T00:00:00.000Z'), 'd700ffffff9c80e28800');
    check(new Date('1970-01-01T00:00:00.000Z'), 'd7000000000000000000');
    check(new Date('2000-06-13T00:00:00.000Z'), 'd700000000dfb7629c00');
    check(new Date('2005-12-31T23:59:59.999Z'), 'd7000000010883436bff');
    check(new Date('2140-01-01T13:14:15.678Z'), 'd700000004e111a31efe');
    checkDecode([127, new Buffer('abcd'.repeat(2))], 'd7' + '7f' + '61626364'.repeat(2));
  });

  it('fixext 16', function () {
    checkDecode([-128, new Buffer('abcd'.repeat(4))], 'd8' + '80' + '61626364'.repeat(4));
  });

  it('str 8', function () {
    check('α', 'a2ceb1');
    check('亜', 'a3e4ba9c');
    check('\uD83D\uDC26', 'a4f09f90a6');
    check('a'.repeat(32), 'd9' + '20' + '61'.repeat(32));
    check('a'.repeat(255), 'd9' + 'ff' + '61'.repeat(255));
  });

  it('str 16', function () {
    check('a'.repeat(256), 'da' + '0100' + '61'.repeat(256));
    check('a'.repeat(65535), 'da' + 'ffff' + '61'.repeat(65535));
  });

  it('str 32', function () {
    check('a'.repeat(65536), 'db' + '00010000' + '61'.repeat(65536));
  });

  it('array 16', function () {
    check(array(16), 'dc' + '0010' + '00'.repeat(16));
    check(array(65535), 'dc' + 'ffff' + '00'.repeat(65535));
  });

  it('array 32', function () {
    check(array(65536), 'dd' + '00010000' + '00'.repeat(65536));
  });

  it('map 16', function () {
    check(
      { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15 },
      'de' + '0010' + 'a13000a13101a13202a13303a13404a13505a13606a13707a13808a13909a1610aa1620ba1630ca1640da1650ea1660f'
    );
    var map16 = map(65535);
    var encoded = notepack.encode(map16);
    expect(encoded.toString('hex', 0, 3)).to.equal('deffff');
    expect(notepack.decode(encoded)).to.deep.equal(map16);
  });

  it('map 32', function () {
    var map32 = map(65536);
    var encoded = notepack.encode(map32);
    expect(encoded.toString('hex', 0, 5)).to.equal('df00010000');
    expect(notepack.decode(encoded)).to.deep.equal(map32);
  });

  it('toJSON', function () {
    var obj = {
      a: 'b',
      toJSON: function () {
        return 'c';
      }
    };
    expect(notepack.encode(obj)).to.deep.equal(notepack.encode('c'));
  });

  it('all formats', function () {
    this.timeout(20000);
    var expected = {
      unsigned: [1, 2, 3, 4, { b: { c: [128, 256, 65536, 4294967296] } }],
      signed: [-1, -2, -3, -4, { b: { c: [-33, -129, -32769, -2147483649] } }],
      bin: [new Buffer('abc'), new Buffer('a'.repeat(256)), new Buffer('c'.repeat(65536))],
      str: ['abc', 'g'.repeat(32), 'h'.repeat(256), 'i'.repeat(65536)],
      array: [[], array(16), array(65536)],
      map: {},
      nil: null,
      bool: { 'true': true, 'false': false, both: [true, false, false, false, true] },
      fixext: [undefined, new Date('2140-01-01T13:14:15.678Z'), undefined, new Date('2005-12-31T23:59:59.999Z')]
    };
    expected.map['a'.repeat(32)] = { a: 'a', b: 'b', c: 'c' };
    expected.map['b'.repeat(256)] = { a: { b: 1, c: 1, d: 1, e: { f: { g: 2, h: 2 } } } };
    expected.map['c'.repeat(65536)] = [{ a: { b: 1, c: 1, d: 1, e: { f: [{ g: 2, h: 2 }] } } }];
    expected.map16 = map(65535);
    expected.map32 = map(65536);

    expect(notepack.decode(notepack.encode(expected))).to.deep.equal(expected);
  });

  it('10000', function () {
    var fixture = require('./fixtures/10000.json');

    expect(notepack.decode(notepack.encode(fixture))).to.deep.equal(fixture);
  });
});

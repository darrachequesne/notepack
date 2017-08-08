'use strict';

var notepack = {
  encode: require('../browser/encode'),
  decode: require('../browser/decode')
};

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

describe('notepack (browser build)', function() {
  it('ArrayBuffer view', function() {
    expect(notepack.decode(Uint8Array.from([ 0x93, 1, 2, 3 ]))).to.deep.equal([ 1, 2, 3 ]);
  });

  it('offset ArrayBuffer view', function() {
    var buffer = new ArrayBuffer(14);
    var view = new Uint8Array(buffer);

    // Fill with junk before setting the encoded data
    view.fill(0xFF);

    // Put the encoded data somewhere in the middle of the buffer
    view.set([ 0x93, 1, 2, 3 ], 4);

    expect(notepack.decode(new Uint8Array(buffer, 4, 4))).to.deep.equal([ 1, 2, 3 ]);
    expect(notepack.decode(new Uint16Array(buffer, 4, 2))).to.deep.equal([ 1, 2, 3 ]);
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
      bin: [Uint8Array.of('1', '2', '3').buffer, Uint8Array.from('1'.repeat(256)).buffer, Uint8Array.from('2'.repeat(65536)).buffer],
      str: ['abc', 'g'.repeat(32), 'h'.repeat(256), 'i'.repeat(65536)],
      array: [[], array(16), array(65536)],
      map: {},
      nil: null,
      bool: { 'true': true, 'false': false, both: [true, false, false, false, true] },
      fixext: [undefined, new Date('2140-01-01T13:14:15.678Z'), undefined, new Date('2005-12-31T23:59:59.999Z')],
      utf8: ['α', '亜', '\uD83D\uDC26'],
      float: [1.1, 1234567891234567.5, Infinity, -Infinity, NaN]
    };
    expected.map['a'.repeat(32)] = { a: 'a', b: 'b', c: 'c' };
    expected.map['b'.repeat(256)] = { a: { b: 1, c: 1, d: 1, e: { f: { g: 2, h: 2 } } } };
    expected.map['c'.repeat(65536)] = [{ a: { b: 1, c: 1, d: 1, e: { f: [{ g: 2, h: 2 }] } } }];
    expected.map16 = map(65535);
    expected.map32 = map(65536);

    expect(notepack.decode(notepack.encode(expected))).to.deep.equal(expected);
  });
});

'use strict';

var MICRO_OPT_LEN = 32;

// Faster for short strings than buffer.write
function utf8Write(arr, offset, str) {
  var c = 0;
  for (var i = 0, l = str.length; i < l; i++) {
    c = str.charCodeAt(i);
    if (c < 0x80) {
      arr[offset++] = c;
    }
    else if (c < 0x800) {
      arr[offset++] = 0xc0 | (c >> 6);
      arr[offset++] = 0x80 | (c & 0x3f);
    }
    else if (c < 0xd800 || c >= 0xe000) {
      arr[offset++] = 0xe0 | (c >> 12);
      arr[offset++] = 0x80 | (c >> 6) & 0x3f;
      arr[offset++] = 0x80 | (c & 0x3f);
    }
    else {
      i++;
      c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      arr[offset++] = 0xf0 | (c >> 18);
      arr[offset++] = 0x80 | (c >> 12) & 0x3f;
      arr[offset++] = 0x80 | (c >> 6) & 0x3f;
      arr[offset++] = 0x80 | (c & 0x3f);
    }
  }
}

// Faster for short strings than Buffer.byteLength
function utf8Length(str) {
  var c = 0, length = 0;
  for (var i = 0, l = str.length; i < l; i++) {
    c = str.charCodeAt(i);
    if (c < 0x80) {
      length += 1;
    }
    else if (c < 0x800) {
      length += 2;
    }
    else if (c < 0xd800 || c >= 0xe000) {
      length += 3;
    }
    else {
      i++;
      length += 4;
    }
  }
  return length;
}

function _encode(bytes, defers, value) {
  var type = typeof value, i = 0, l = 0, hi = 0, lo = 0, length = 0, size = 0;

  if (type === 'string') {
    if (value.length > MICRO_OPT_LEN) {
      length = Buffer.byteLength(value);
    } else {
      length = utf8Length(value);
    }

    // fixstr
    if (length < 0x20) {
      bytes.push(length | 0xa0);
      size = 1;
    }
    // str 8
    else if (length < 0x100) {
      bytes.push(0xd9, length);
      size = 2;
    }
    // str 16
    else if (length < 0x10000) {
      bytes.push(0xda, length >> 8, length);
      size = 3;
    }
    // str 32
    else if (length < 0x100000000) {
      bytes.push(0xdb, length >> 24, length >> 16, length >> 8, length);
      size = 5;
    } else {
      throw new Error('String too long');
    }
    defers.push({ str: value, length: length, offset: bytes.length });
    return size + length;
  }
  if (type === 'number') {
    // TODO: encode to float 32?

    // float 64
    if (Math.floor(value) !== value || !isFinite(value)) {
      bytes.push(0xcb);
      defers.push({ float: value, length: 8, offset: bytes.length });
      return 9;
    }

    if (value >= 0) {
      // positive fixnum
      if (value < 0x80) {
        bytes.push(value);
        return 1;
      }
      // uint 8
      if (value < 0x100) {
        bytes.push(0xcc, value);
        return 2;
      }
      // uint 16
      if (value < 0x10000) {
        bytes.push(0xcd, value >> 8, value);
        return 3;
      }
      // uint 32
      if (value < 0x100000000) {
        bytes.push(0xce, value >> 24, value >> 16, value >> 8, value);
        return 5;
      }
      // uint 64
      hi = (value / Math.pow(2, 32)) >> 0;
      lo = value >>> 0;
      bytes.push(0xcf, hi >> 24, hi >> 16, hi >> 8, hi, lo >> 24, lo >> 16, lo >> 8, lo);
      return 9;
    } else {
      // negative fixnum
      if (value >= -0x20) {
        bytes.push(value);
        return 1;
      }
      // int 8
      if (value >= -0x80) {
        bytes.push(0xd0, value);
        return 2;
      }
      // int 16
      if (value >= -0x8000) {
        bytes.push(0xd1, value >> 8, value);
        return 3;
      }
      // int 32
      if (value >= -0x80000000) {
        bytes.push(0xd2, value >> 24, value >> 16, value >> 8, value);
        return 5;
      }
      // int 64
      hi = Math.floor(value / Math.pow(2, 32));
      lo = value >>> 0;
      bytes.push(0xd3, hi >> 24, hi >> 16, hi >> 8, hi, lo >> 24, lo >> 16, lo >> 8, lo);
      return 9;
    }
  }
  if (type === 'object') {
    // nil
    if (value === null) {
      bytes.push(0xc0);
      return 1;
    }

    if (Array.isArray(value)) {
      length = value.length;

      // fixarray
      if (length < 0x10) {
        bytes.push(length | 0x90);
        size = 1;
      }
      // array 16
      else if (length < 0x10000) {
        bytes.push(0xdc, length >> 8, length);
        size = 3;
      }
      // array 32
      else if (length < 0x100000000) {
        bytes.push(0xdd, length >> 24, length >> 16, length >> 8, length);
        size = 5;
      } else {
        throw new Error('Array too large');
      }
      for (i = 0; i < length; i++) {
        size += _encode(bytes, defers, value[i]);
      }
      return size;
    }

    // fixext 8 / Date
    if (value instanceof Date) {
      var time = value.getTime();
      hi = Math.floor(time / Math.pow(2, 32));
      lo = time >>> 0;
      bytes.push(0xd7, 0, hi >> 24, hi >> 16, hi >> 8, hi, lo >> 24, lo >> 16, lo >> 8, lo);
      return 10;
    }

    if (value instanceof Buffer) {
      length = value.length;

      // bin 8
      if (length < 0x100) {
        bytes.push(0xc4, length);
        size = 2;
      } else
      // bin 16
      if (length < 0x10000) {
        bytes.push(0xc5, length >> 8, length);
        size = 3;
      } else
      // bin 32
      if (length < 0x100000000) {
        bytes.push(0xc6, length >> 24, length >> 16, length >> 8, length);
        size = 5;
      } else {
        throw new Error('Buffer too large');
      }
      defers.push({ bin: value, length: length, offset: bytes.length });
      return size + length;
    }

    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      var arraybuffer = value.buffer || value;
      length = arraybuffer.byteLength;

      // ext 8
      if (length < 0x100) {
        bytes.push(0xc7, length, 0);
        size = 3;
      } else
      // ext 16
      if (length < 0x10000) {
        bytes.push(0xc8, length >> 8, length, 0);
        size = 4;
      } else
      // ext 32
      if (length < 0x100000000) {
        bytes.push(0xc9, length >> 24, length >> 16, length >> 8, length, 0);
        size = 6;
      } else {
        throw new Error('ArrayBuffer too large');
      }
      defers.push({ arraybuffer: arraybuffer, length: length, offset: bytes.length });
      return size + length;
    }

    if (typeof value.toJSON === 'function') {
      return _encode(bytes, defers, value.toJSON());
    }

    var keys = [], key = '';

    var allKeys = Object.keys(value);
    for (i = 0, l = allKeys.length; i < l; i++) {
      key = allKeys[i];
      if (typeof value[key] !== 'function') {
        keys.push(key);
      }
    }
    length = keys.length;

    // fixmap
    if (length < 0x10) {
      bytes.push(length | 0x80);
      size = 1;
    }
    // map 16
    else if (length < 0x10000) {
      bytes.push(0xde, length >> 8, length);
      size = 3;
    }
    // map 32
    else if (length < 0x100000000) {
      bytes.push(0xdf, length >> 24, length >> 16, length >> 8, length);
      size = 5;
    } else {
      throw new Error('Object too large');
    }

    for (i = 0; i < length; i++) {
      key = keys[i];
      size += _encode(bytes, defers, key);
      size += _encode(bytes, defers, value[key]);
    }
    return size;
  }
  // false/true
  if (type === 'boolean') {
    bytes.push(value ? 0xc3 : 0xc2);
    return 1;
  }
  // fixext 1 / undefined
  if (type === 'undefined') {
    bytes.push(0xd4, 0, 0);
    return 3;
  }
  throw new Error('Could not encode');
}

function encode(value) {
  var bytes = [];
  var defers = [];
  var size = _encode(bytes, defers, value);
  var buf = new Buffer(size);

  var deferIndex = 0;
  var deferWritten = 0;
  var nextOffset = -1;
  if (defers.length > 0) {
    nextOffset = defers[0].offset;
  }

  var defer, deferLength = 0, offset = 0;
  for (var i = 0, l = bytes.length; i < l; i++) {
    buf[deferWritten + i] = bytes[i];
    if (i + 1 !== nextOffset) { continue; }
    defer = defers[deferIndex];
    deferLength = defer.length;
    offset = deferWritten + nextOffset;
    if (defer.bin) {
      if (deferLength > MICRO_OPT_LEN) {
        defer.bin.copy(buf, offset, 0, deferLength);
      } else {
        var bin = defer.bin;
        for (var j = 0; j < deferLength; j++) {
          buf[offset + j] = bin[j];
        }
      }
    } else if (defer.str) {
      if (deferLength > MICRO_OPT_LEN) {
        buf.write(defer.str, offset, deferLength, 'utf8');
      } else {
        utf8Write(buf, offset, defer.str);
      }
    } else if (defer.float !== undefined) {
      buf.writeDoubleBE(defer.float, offset);
    } else if (defer.arraybuffer) {
      var arr = new Uint8Array(defer.arraybuffer);
      for (var k = 0; k < deferLength; k++) {
        buf[offset + k] = arr[k];
      }
    }
    deferIndex++;
    deferWritten += deferLength;
    if (defers[deferIndex]) {
      nextOffset = defers[deferIndex].offset;
    }
  }
  return buf;
}

module.exports = encode;

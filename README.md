# notepack

[![Build Status](https://github.com/darrachequesne/notepack/workflows/CI/badge.svg?branch=main)](https://github.com/darrachequesne/notepack/actions)

A fast [Node.js](http://nodejs.org) implementation of the latest [MessagePack](http://msgpack.org) [spec](https://github.com/msgpack/msgpack/blob/master/spec.md).

## Notes

* `undefined` is encoded as `nil`
* `Date` objects are encoded following the [Timestamp extension](https://github.com/msgpack/msgpack/blob/master/spec.md#timestamp-extension-type), e.g. `new Date('2000-06-13T00:00:00.000Z')` => `<Buffer d6 ff 39 45 79 80>`
* `ArrayBuffer` are encoded as `bin`, e.g. `Uint8Array.of(1, 2, 3, 4)` => `<Buffer c4 04 01 02 03 04>`

## Install

```
npm install notepack.io
```

## Usage

```js
const notepack = require('notepack.io');

const encoded = notepack.encode({ foo: 'bar'}); // <Buffer 81 a3 66 6f 6f a3 62 61 72>
const decoded = notepack.decode(encoded); // { foo: 'bar' }
```

## Browser

A browser version of notepack is also available (2.0 kB minified/gzipped)

```html
<script src="https://unpkg.com/notepack.io@2.3.0/dist/notepack.min.js"></script>
<script>
  console.log(notepack.decode(notepack.encode([1, '2', new Date()])));
  // [1, "2", Thu Dec 08 2016 00:00:01 GMT+0100 (CET)]
</script>
```

## Common questions

### How to encode custom types?

This library does not currently support [extension types](https://github.com/msgpack/msgpack/blob/master/spec.md#extension-types). That being said, you can create a `toJSON()` method on your object, which will be used when encoding:

```js
class MyClass {
  toJSON() {
    return 42;
  }
}
```

### How to handle BigInt values?

You can use the `toJSON()` method:

```js
// always as string
BigInt.prototype.toJSON = function () {
  return String(this);
};

// or either as string or number, depending on the value
BigInt.prototype.toJSON = function () {
  var isSafeNumber = Number.MIN_SAFE_INTEGER <= this && this <= Number.MAX_SAFE_INTEGER;
  return isSafeNumber ? Number(this) : String(this);
};
```

### Handle to handle ES6 Set and Map values?

Again, `toJSON()` to the rescue:

```js
// convert the set to an array
// example: Set(3) { 1, 2, 3 } into [ 1, 2, 3 ]
Set.prototype.toJSON = function () {
  return [...this];
}

// convert the map to an array of array
// example: Map(2) { 1 => '2', '3' => 4 } into [ [ 1, '2' ], [ '3', 4 ] ]
Map.prototype.toJSON = function () {
  return [...this];
}
```

## Performance

Performance is currently comparable to msgpack-node (which presumably needs optimizing and suffers from JS-native overhead) and is significantly faster than other implementations. Several micro-optimizations are used to improve the performance of short string and Buffer operations.

The `./benchmarks/run` output on my machine is:

```
$ node -v
v16.18.1
$ ./benchmarks/run
Encoding (this will take a while):
+----------------------------+-------------------+-------------------+----------------+---------------+
|                            │ tiny              │ small             │ medium         │ large         |
+----------------------------+-------------------+-------------------+----------------+---------------+
| notepack                   │ 4,659,999 ops/sec │ 1,051,607 ops/sec │ 74,859 ops/sec │ 371 ops/sec   |
+----------------------------+-------------------+-------------------+----------------+---------------+
| msgpack-js                 │ 533,324 ops/sec   │ 225,015 ops/sec   │ 21,412 ops/sec │ 157 ops/sec   |
+----------------------------+-------------------+-------------------+----------------+---------------+
| msgpack-lite               │ 864,790 ops/sec   │ 383,968 ops/sec   │ 48,839 ops/sec │ 482 ops/sec   |
+----------------------------+-------------------+-------------------+----------------+---------------+
| @msgpack/msgpack           │ 1,738,886 ops/sec │ 915,114 ops/sec   │ 71,916 ops/sec │ 178 ops/sec   |
+----------------------------+-------------------+-------------------+----------------+---------------+
| msgpackr                   │ 9,411,387 ops/sec │ 1,546,779 ops/sec │ 71,469 ops/sec │ 529 ops/sec   |
+----------------------------+-------------------+-------------------+----------------+---------------+
| JSON.stringify (to Buffer) │ 3,426,078 ops/sec │ 604,877 ops/sec   │ 26,353 ops/sec │ 41.09 ops/sec |
+----------------------------+-------------------+-------------------+----------------+---------------+
Decoding (this will take a while):
+--------------------------+--------------------+-------------------+-----------------+-------------+
|                          │ tiny               │ small             │ medium          │ large       |
+--------------------------+--------------------+-------------------+-----------------+-------------+
| notepack                 │ 4,873,688 ops/sec  │ 1,074,433 ops/sec │ 61,032 ops/sec  │ 404 ops/sec |
+--------------------------+--------------------+-------------------+-----------------+-------------+
| msgpack-js               │ 2,408,447 ops/sec  │ 527,982 ops/sec   │ 48,892 ops/sec  │ 365 ops/sec |
+--------------------------+--------------------+-------------------+-----------------+-------------+
| msgpack-lite             │ 1,271,964 ops/sec  │ 283,477 ops/sec   │ 26,663 ops/sec  │ 318 ops/sec |
+--------------------------+--------------------+-------------------+-----------------+-------------+
| @msgpack/msgpack         │ 4,098,968 ops/sec  │ 1,233,911 ops/sec │ 62,498 ops/sec  │ 162 ops/sec |
+--------------------------+--------------------+-------------------+-----------------+-------------+
| msgparck                 │ 10,083,227 ops/sec │ 1,990,914 ops/sec │ 102,848 ops/sec │ 422 ops/sec |
+--------------------------+--------------------+-------------------+-----------------+-------------+
| JSON.parse (from Buffer) │ 2,543,430 ops/sec  │ 688,383 ops/sec   │ 50,280 ops/sec  │ 103 ops/sec |
+--------------------------+--------------------+-------------------+-----------------+-------------+
* Note that JSON is provided as an indicative comparison only
```
## License

MIT

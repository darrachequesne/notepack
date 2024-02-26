# History

- [3.0.1](#301-2022-05-22) (May 2022)
- [**3.0.0**](#300-2022-05-22) (May 2022)
- [2.3.0](#230-2020-03-15) (Mar 2020)
- [2.2.0](#220-2018-12-18) (Dec 2018)
- [2.1.3](#213-2018-05-14) (May 2018)
- [2.1.2](#212-2017-08-23) (Aug 2017)
- [2.1.1](#211-2017-08-08) (Aug 2017)
- [2.1.0](#210-2017-07-31) (Jul 2017)
- [2.0.1](#201-2017-06-06) (Jun 2017)
- [**2.0.0**](#200-2017-05-19) (May 2017)

# Release notes

## [3.0.1](https://github.com/darrachequesne/notepack/compare/3.0.0...3.0.1) (2022-05-22)

The browser bundle was not updated in the previous release.



## [3.0.0](https://github.com/darrachequesne/notepack/compare/2.3.0...3.0.0) (2022-05-22)


### Features

* add support for BigInt.prototype.toJSON ([#28](https://github.com/darrachequesne/notepack/issues/28)) ([9ec1fcd](https://github.com/darrachequesne/notepack/commit/9ec1fcde640dfb57b69ff5f8b45ffa5439a87700))

This change allows to properly encode [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) objects:

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

* encode ArrayBuffer objects as bin ([8209327](https://github.com/darrachequesne/notepack/commit/8209327a69e471625f98aa1092d2f0e74e45da4f))

```js
import { encode } from "notepack.io";

encode(Uint8Array.of(1, 2, 3, 4));

// before: <Buffer c7 04 00 01 02 03 04>
// after: <Buffer c4 04 01 02 03 04>
```

ArrayBuffer objects encoded with previous versions of the library will still be decoded, but as Buffer instead of Uint8Array.

Reference: https://github.com/msgpack/msgpack/blob/master/spec.md#bin-format-family

* encode Date objects following the official timestamp extension ([9fb6275](https://github.com/darrachequesne/notepack/commit/9fb62754e826984d9eccbb72c4e9c067ab5cb227))

```js
import { encode } from "notepack.io";

encode(new Date("2000-06-13T00:00:00.000Z"));

// before: <Buffer d7 00 00 00 00 df b7 62 9c 00>
// after: <Buffer d6 ff 39 45 79 80>
```

Date objects encoded with previous versions of the library will still be properly decoded.

Reference: https://github.com/msgpack/msgpack/blob/master/spec.md#timestamp-extension-type

* match JSON.stringify() behavior ([21c6592](https://github.com/darrachequesne/notepack/commit/21c6592cf357c972387284b96999ba8273f08035))

The library will now match the behavior of the JSON.stringify() method:

- undefined is now encoded as nil (0xc0)
- undefined values in objects are now ignored

```js
import { encode, decode } from "notepack.io";

const value = {
  a: undefined,
  b: null,
  c: [undefined, null]
};

decode(encode(value));

// before:
// {
//   a: undefined,
//   b: null,
//   c: [undefined, null]
// }
// after:
// {
//   b: null,
//   c: [null, null]
// }
```

## [2.3.0](https://github.com/darrachequesne/notepack/compare/2.2.0...v2.3.0) (2020-03-15)


### Performance Improvements

* **decode:** add a cache for buffer-to-string conversions ([3c0e5a6](https://github.com/darrachequesne/notepack/commit/3c0e5a66332e50ce31749f0159a533156edbdd3d))
* **encode:** add a cache for string-to-buffer conversions ([60e8b0b](https://github.com/darrachequesne/notepack/commit/60e8b0b4b16b05e702334fe731df1ec43d1a9f14))



## [2.2.0](https://github.com/darrachequesne/notepack/compare/2.1.3...2.2.0) (2018-12-18)



## [2.1.3](https://github.com/darrachequesne/notepack/compare/2.1.2...2.1.3) (2018-05-14)


### Bug Fixes

* **browser:** fix utf-8 decoder ([#16](https://github.com/darrachequesne/notepack/issues/16)) ([abbf3a5](https://github.com/darrachequesne/notepack/commit/abbf3a5))



## [2.1.2](https://github.com/darrachequesne/notepack/compare/2.1.1...2.1.2) (2017-08-23)


### Bug Fixes

* **encode:** remove the unsafe integer check ([#15](https://github.com/darrachequesne/notepack/issues/15)) ([bb8140c](https://github.com/darrachequesne/notepack/commit/bb8140c))



## [2.1.1](https://github.com/darrachequesne/notepack/compare/2.1.0...2.1.1) (2017-08-08)


### Bug Fixes

* **browser:** fix decoding for strings with surrogate pairs ([#13](https://github.com/darrachequesne/notepack/issues/13)) ([a89e566](https://github.com/darrachequesne/notepack/commit/a89e566))
* **browser:** preserve the offset and length when creating a DataView ([#11](https://github.com/darrachequesne/notepack/issues/11)) ([bd91aa7](https://github.com/darrachequesne/notepack/commit/bd91aa7))



## [2.1.0](https://github.com/darrachequesne/notepack/compare/2.0.1...2.1.0) (2017-07-31)


### Features

* add support for toJSON method ([#8](https://github.com/darrachequesne/notepack/issues/8)) ([9345f9f](https://github.com/darrachequesne/notepack/commit/9345f9f)), closes [#7](https://github.com/darrachequesne/notepack/issues/7)



## [2.0.1](https://github.com/darrachequesne/notepack/compare/2.0.0...2.0.1) (2017-06-06)


### Bug Fixes

* **encode:** fix encoding for non-finite numbers ([#4](https://github.com/darrachequesne/notepack/issues/4)) ([f0ed0f3](https://github.com/darrachequesne/notepack/commit/f0ed0f3))



## [2.0.0](https://github.com/darrachequesne/notepack/compare/1.0.1...2.0.0) (2017-05-19)


### Features

* Add support for ArrayBuffer ([#2](https://github.com/darrachequesne/notepack/issues/2)) ([9eec8dc](https://github.com/darrachequesne/notepack/commit/9eec8dc))
* **browser:** switch from Buffer polyfill to ArrayBuffer ([#1](https://github.com/darrachequesne/notepack/issues/1)) ([8d7ce87](https://github.com/darrachequesne/notepack/commit/8d7ce87))

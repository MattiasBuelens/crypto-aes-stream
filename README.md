# crypto-aes-stream

This is an **experimental** implementation for streaming decryption of AES CBC encrypted data. It provides
a [`TransformStream`](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream) that uses
the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) to decrypt each individual chunk.

## Why?

The [`decrypt()` method](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/decrypt) of the Web Crypto API
expects the ciphertext to be provided as a single buffer. For example, to decrypt a file downloaded from the network,
you'd write something like this:

```javascript
// Retrieve the decryption key and IV somehow.
const rawKey = new Uint8Array([/* raw key */]);
const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-CBC' }, false, ['decrypt']);
const iv = new Uint8Array([/* initialization vector */]);

// Download, then decrypt the data.
const response = await fetch('/path/to/encrypted-data');
const cipherText = await response.arrayBuffer();
const plainText = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, cipherText);
```

However, in some cases it may be desirable to receive the plain text **as a stream**, decrypting data as soon as it
becomes available. This is not yet supported by the Web Crypto API
(see [w3c/webcrypto#73](https://github.com/w3c/webcrypto/issues/73)), but this project already makes it possible:

```javascript
// Note: the key must now allow both *encrypting* and *decrypting* data.
// The implementation uses this to fix the padding before decrypting each chunk. 
const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
// ...

// Decrypt the data while it's being downloaded.
const response = await fetch('/path/to/encrypted-data');
const cipherText = await response.body;
const plainText = cipherText.pipeThrough(aesCbcDecryptStream(key, iv));
```

import {concatUint8ArraysWithSize, takeBytesFromQueue} from './util.js';

export default function aesCbcDecryptStream(key: CryptoKey, iv: Uint8Array): TransformStream<Uint8Array, Uint8Array> {
    return new TransformStream<Uint8Array, Uint8Array>(new AesCbcStreamTransformer(key, iv));
}

/**
 * The size of an AES block.
 */
const AES_BLOCK_SIZE = 16;

/**
 * The size of the padding.
 * - Must be smaller than AES_BLOCK_SIZE, otherwise the encrypted padding will be longer than one block.
 * - Must not be 0, otherwise Edge Legacy will throw an error.
 */
const AES_PADDING_SIZE = 1;

class AesCbcStreamTransformer implements Transformer<Uint8Array, Uint8Array> {
    private readonly _key: CryptoKey;
    private _iv: Uint8Array;
    private readonly _queue: Uint8Array[] = [];
    private _queueSize: number = 0;

    constructor(key: CryptoKey, iv: Uint8Array) {
        if (key.algorithm.name !== 'AES-CBC') {
            throw new TypeError('Key algorithm must be "AES-CBC"');
        }
        if (!key.usages.includes('encrypt') || !key.usages.includes('decrypt')) {
            throw new TypeError('Key must allow both encryption and decryption');
        }
        if (iv.byteLength !== AES_BLOCK_SIZE) {
            throw new TypeError(`Initialization vector must be ${AES_BLOCK_SIZE} bytes long`);
        }
        this._key = key;
        this._iv = iv;
    }

    async transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
        this._queue.push(chunk);
        this._queueSize += chunk.byteLength;

        // Need at least 1 block to decrypt,
        // plus 1 block padding to ensure we're not yet at the last block.
        if (this._queueSize < 2 * AES_BLOCK_SIZE) {
            return;
        }

        const queueSize = this._queueSize;
        const remainderSize = AES_BLOCK_SIZE + ((queueSize - AES_BLOCK_SIZE) % AES_BLOCK_SIZE);
        const usableSize = queueSize - remainderSize;
        console.assert(usableSize % AES_BLOCK_SIZE === 0);

        // Allocate a buffer to hold the data to decrypt, followed by a padding block.
        const paddedData = new Uint8Array(usableSize + AES_BLOCK_SIZE);

        // Take usable bytes from the queue.
        takeBytesFromQueue(paddedData, this._queue, usableSize);
        this._queueSize = remainderSize;

        // Encrypt a new block, to act as padding.
        // In CBC, the IV to encrypt or decrypt each block is the ciphertext from the previous block.
        const nextIv = paddedData.slice(usableSize - AES_BLOCK_SIZE, usableSize);
        console.assert(nextIv.byteLength === AES_BLOCK_SIZE);
        const padding = await crypto.subtle.encrypt({
            name: 'AES-CBC',
            iv: nextIv
        }, this._key, new Uint8Array(AES_PADDING_SIZE));
        console.assert(padding.byteLength === AES_BLOCK_SIZE);

        // Insert the encrypted padding block after the actual data.
        paddedData.set(new Uint8Array(padding), usableSize);

        // Decrypt the data, with the new padding block.
        const paddedPlain = await crypto.subtle.decrypt({
            name: 'AES-CBC',
            iv: this._iv
        }, this._key, paddedData);
        console.assert(paddedPlain.byteLength === usableSize + AES_PADDING_SIZE);

        // Update the IV for the next block.
        // Note that this is the same IV that we used to encrypt the padding block.
        this._iv = nextIv;

        // Remove unwanted padding from the decrypted result.
        const plain = new Uint8Array(paddedPlain, 0, usableSize);

        controller.enqueue(plain);
    }

    async flush(controller: TransformStreamDefaultController<Uint8Array>) {
        if (this._queueSize === 0) {
            // There was no data to decrypt.
            // Note that if `transform()` is called at least once, the queue is always non-empty.
            return;
        }

        // Decrypt all remaining data, which must contain proper padding.
        const data = concatUint8ArraysWithSize(this._queue, this._queueSize);
        const plain = await crypto.subtle.decrypt({
            name: 'AES-CBC',
            iv: this._iv
        }, this._key, data);

        // Clean up
        this._queue.length = 0;
        this._queueSize = 0;

        controller.enqueue(new Uint8Array(plain));
    }
}

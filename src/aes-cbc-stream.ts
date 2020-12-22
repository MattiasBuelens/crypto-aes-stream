import {concatUint8Arrays, takeBytesFromQueue} from './util.js';

export default function aesCbcDecryptStream(key: CryptoKey, iv: Uint8Array): TransformStream<Uint8Array, Uint8Array> {
    return new TransformStream<Uint8Array, Uint8Array>(new AesCbcStreamTransformer(key, iv));
}

const AES_BLOCK_SIZE = 16;

class AesCbcStreamTransformer implements Transformer<Uint8Array, Uint8Array> {
    private readonly _key: CryptoKey;
    private _iv: Uint8Array;
    private _queue: Uint8Array[] = [];
    private _queueSize: number = 0;

    constructor(key: CryptoKey, iv: Uint8Array) {
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

        // Take usable bytes from queue
        const data = takeBytesFromQueue(this._queue, usableSize);
        this._queueSize = remainderSize;
        console.assert(data.byteLength === usableSize);

        const nextIv = data.subarray(data.byteLength - AES_BLOCK_SIZE);
        console.assert(nextIv.byteLength === AES_BLOCK_SIZE);

        const padding = await crypto.subtle.encrypt({
            name: 'AES-CBC',
            iv: nextIv
        }, this._key, new Uint8Array(0));
        const paddedData = concatUint8Arrays([data, new Uint8Array(padding)]);

        const plain = await crypto.subtle.decrypt({
            name: 'AES-CBC',
            iv: this._iv
        }, this._key, paddedData);
        console.assert(plain.byteLength === data.byteLength);

        this._iv = nextIv;

        controller.enqueue(new Uint8Array(plain));
    }

    async flush(controller: TransformStreamDefaultController<Uint8Array>) {
        if (this._queueSize === 0) {
            return;
        }

        const data = concatUint8Arrays(this._queue);
        const plain = await crypto.subtle.decrypt({
            name: 'AES-CBC',
            iv: this._iv
        }, this._key, data);

        controller.enqueue(new Uint8Array(plain));
        this._queue = [];
        this._queueSize = 0;
    }
}

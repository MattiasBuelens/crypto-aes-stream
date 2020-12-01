import {concatUint8Arrays} from './util.js';

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
        console.log({chunk: chunk.byteLength});
        if (this._queueSize + chunk.byteLength < AES_BLOCK_SIZE) {
            this._queue.push(chunk);
            this._queueSize += chunk.byteLength;
            return;
        }
        const remainderSize = (this._queueSize + chunk.byteLength) % AES_BLOCK_SIZE;
        const chunks = this._queue;
        if (remainderSize === 0) {
            chunks.push(chunk);
            this._queue = [];
            this._queueSize = 0;
        } else {
            chunks.push(chunk.subarray(0, chunk.byteLength - remainderSize));
            this._queue = [chunk.subarray(chunk.byteLength - remainderSize)];
            this._queueSize = remainderSize;
        }
        const data = concatUint8Arrays(chunks);
        console.log({data: data.byteLength});
        console.assert(data.byteLength % AES_BLOCK_SIZE === 0);

        const plain = await crypto.subtle.decrypt({
            name: 'AES-CBC',
            iv: this._iv
        }, this._key, data);
        this._iv = data.subarray(data.byteLength - AES_BLOCK_SIZE);
        console.assert(this._iv.byteLength === AES_BLOCK_SIZE);

        controller.enqueue(new Uint8Array(plain));
    }

    async flush(controller: TransformStreamDefaultController<Uint8Array>) {
        if (this._queueSize === 0) {
            return;
        }
        const data = concatUint8Arrays(this._queue);
        console.log({data: data.byteLength});
        controller.enqueue(data);
        this._queue = [];
    }
}


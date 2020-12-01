import aesCbcDecryptStream from './aes-cbc-stream.js';
import {concatUint8Arrays} from './util.js';

async function main() {
    const rawKey = await (await fetch('example/segment-00000.key')).arrayBuffer();
    const key = await crypto.subtle.importKey('raw', rawKey, {
        name: 'AES-CBC',
        length: 128
    }, false, ['encrypt', 'decrypt']);

    const iv = new Uint8Array(16);
    iv[15] = 1;

    const result1 = await reference(key, iv);
    const result2 = await stream(key, iv);
    console.log({result1, result2, diff: diff(result1, result2)});
}

async function reference(key: CryptoKey, iv: Uint8Array): Promise<Uint8Array> {
    const data = await (await fetch('example/segment-00000.ts.enc')).arrayBuffer();
    // console.log({data: new Uint8Array(data)});

    return new Uint8Array(await crypto.subtle.decrypt({
        name: 'AES-CBC',
        iv
    }, key, data));
}

async function stream(key: CryptoKey, iv: Uint8Array): Promise<Uint8Array> {
    const cipherStream = (await fetch('example/segment-00000.ts.enc')).body!;
    const plainStream = cipherStream.pipeThrough(aesCbcDecryptStream(key, iv));
    return concatUint8Arrays(await collectStream(plainStream));
}

async function collectStream<T>(stream: ReadableStream<T>): Promise<T[]> {
    const chunks: T[] = [];
    const reader = stream.getReader();
    while (true) {
        const result = await reader.read();
        if (result.done) {
            break;
        }
        chunks.push(result.value);
    }
    return chunks;
}

function diff(left: Uint8Array, right: Uint8Array): number {
    const len = Math.min(left.length, right.length);
    for (let i = 0; i < len; i++) {
        if (left[i] !== right[i]) {
            return i;
        }
    }
    if (left.length !== right.length) {
        return len;
    }
    return -1;
}

main();

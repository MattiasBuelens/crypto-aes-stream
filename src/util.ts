export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const size = arrays.reduce((sum, array) => sum + array.byteLength, 0);
    const result = new Uint8Array(size);
    let offset = 0;
    for (let array of arrays) {
        result.set(array, offset);
        offset += array.byteLength;
    }
    return result;
}

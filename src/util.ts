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

export function takeBytesFromQueue(arrays: Uint8Array[], amount: number): Uint8Array {
    const result = new Uint8Array(amount);
    let i = 0;
    let offset = 0;
    // Concatenate complete chunks
    while (i < arrays.length && offset + arrays[i].byteLength <= amount) {
        result.set(arrays[i], offset);
        offset += arrays[i].byteLength;
        i++;
    }
    // Concatenate remainder, and replace in queue
    if (i < arrays.length && offset < amount) {
        console.assert(arrays[i].byteLength > amount - offset);
        result.set(arrays[i].subarray(0, amount - offset), offset);
        arrays[i] = arrays[i].subarray(amount - offset);
    }
    // Remove complete chunks from queue
    arrays.splice(0, i);
    return result;
}

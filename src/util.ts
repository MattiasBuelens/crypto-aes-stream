/**
 * Concatenate the given chunks into a single `Uint8Array`.
 *
 * @param arrays An array of chunks.
 */
export function concatUint8Arrays(arrays: readonly Uint8Array[]): Uint8Array {
    const size = arrays.reduce((sum, array) => sum + array.byteLength, 0);
    return concatUint8ArraysWithSize(arrays, size);
}

/**
 * Concatenate the given chunks (with a pre-computed total byte size) into a single `Uint8Array`.
 *
 * @param arrays An array of chunks.
 * @param size The total size of the given array, in bytes.
 */
export function concatUint8ArraysWithSize(arrays: readonly Uint8Array[], size: number): Uint8Array {
    const result = new Uint8Array(size);
    let offset = 0;
    for (let array of arrays) {
        result.set(array, offset);
        offset += array.byteLength;
    }
    return result;
}

/**
 * Take exactly `amount` of bytes from the given chunks, and return it as a single `Uint8Array`.
 *
 * All fully copied chunks will be removed from `arrays`, and any partially copied chunk will be replaced by
 * a remainder chunk in `arrays`.
 *
 * The total byte size of `arrays` *must* be at least `amount`.
 *
 * @param arrays A *mutable* array of chunks.
 * @param amount The amount of bytes to take.
 */
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

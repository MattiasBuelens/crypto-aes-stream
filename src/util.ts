/**
 * Concatenate the given chunks into a single `Uint8Array`.
 *
 * @param arrays An array of chunks.
 */
export function concatUint8Arrays(arrays: readonly Uint8Array[]): Uint8Array {
    let size = 0;
    for (const array of arrays) {
        size += array.byteLength;
    }
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
    for (const array of arrays) {
        result.set(array, offset);
        offset += array.byteLength;
    }
    return result;
}

/**
 * Take exactly `amount` of bytes from the given list of chunks, and put them in `result`.
 *
 * All fully copied chunks will be removed from `arrays`, and any partially copied chunk will be replaced by
 * a remainder chunk in `arrays`.
 *
 * Both the size of `result` and the total byte size of `arrays` *must* be at least `amount`.
 *
 * @param result The output array to fill.
 * @param arrays A *mutable* array of chunks.
 * @param amount The amount of bytes to take.
 */
export function takeBytesFromQueue(result: Uint8Array, arrays: Uint8Array[], amount: number): void {
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
}

export default (array: Uint8Array[]): Uint8Array => {
  const sum = array.reduce((sum, curr) => sum + curr.byteLength, 0);
  const data = new Uint8Array(sum);

  for (let i = 0, offset = 0; i < array.length; offset += array[i].byteLength, i++) {
    data.set(new Uint8Array(array[i]), offset);
  }

  return data;
}

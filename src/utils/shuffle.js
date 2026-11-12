/**
 * Fisher–Yates shuffle. Returns a new array; does not mutate the input.
 * @template T
 * @param {T[]} array
 * @param {() => number} [random=Math.random] RNG returning values in [0, 1)
 * @returns {T[]}
 */
export function shuffle(array, random = Math.random) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

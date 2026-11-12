import { describe, it, expect, vi } from 'vitest'
import { shuffle } from './shuffle.js'

describe('shuffle (Fisher–Yates)', () => {
  it('returns a new array with the same elements', () => {
    const input = [1, 2, 3, 4, 5]
    const output = shuffle(input)
    expect(output).not.toBe(input)
    expect(output.sort()).toEqual([1, 2, 3, 4, 5])
    expect(input).toEqual([1, 2, 3, 4, 5])
  })

  it('uses Math.random for index selection', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0) // j=0 when i=2 -> swap 2,0 => [3,2,1]
      .mockReturnValueOnce(0.9) // j=1 when i=1 -> swap 1,1

    expect(shuffle([1, 2, 3])).toEqual([3, 2, 1])
    Math.random.mockRestore()
  })

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle(['only'])).toEqual(['only'])
  })
})

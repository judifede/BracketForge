import { shuffle } from '../utils/shuffle.js'

/**
 * Internal marker for an empty / bye slot (null).
 * UI must never show the English word "BYE"; use slotLabel helpers instead.
 */
export const BYE = null

/**
 * @typedef {Object} Match
 * @property {string} id
 * @property {string|null} p1
 * @property {string|null} p2
 * @property {string|null} winner
 */

/**
 * @typedef {Object} Bracket
 * @property {Match[][]} rounds
 * @property {string[]} seeds
 */

/**
 * @param {number} n
 * @returns {number}
 */
export function nextPowerOfTwo(n) {
  if (n <= 1) return 1
  return 2 ** Math.ceil(Math.log2(n))
}

/**
 * @param {string[]} players
 * @returns {string[]}
 */
export function shuffleSeeds(players) {
  return shuffle(players)
}

/**
 * Resolve automatic bye winners and propagate into later rounds.
 * @param {Match[][]} rounds
 */
function resolveByesAndPropagate(rounds) {
  for (let r = 0; r < rounds.length; r += 1) {
    for (let m = 0; m < rounds[r].length; m += 1) {
      const match = rounds[r][m]

      if (!match.winner) {
        const p1Bye = match.p1 == null
        const p2Bye = match.p2 == null
        if (!p1Bye && p2Bye) match.winner = match.p1
        else if (p1Bye && !p2Bye) match.winner = match.p2
      }

      if (match.winner && r < rounds.length - 1) {
        const next = rounds[r + 1][Math.floor(m / 2)]
        if (m % 2 === 0) next.p1 = match.winner
        else next.p2 = match.winner
      }
    }
  }
}

/**
 * Build a single-elimination bracket. Pads to power of 2 with byes.
 * @param {string[]} players
 * @returns {Bracket}
 */
export function buildBracket(players) {
  const seeds = players.filter(Boolean)
  const size = nextPowerOfTwo(Math.max(seeds.length, 2))
  const padded = [...seeds]
  while (padded.length < size) padded.push(BYE)

  /** @type {Match[][]} */
  const rounds = []
  const roundCount = Math.log2(size)

  /** @type {Match[]} */
  const round0 = []
  for (let i = 0; i < padded.length; i += 2) {
    round0.push({
      id: `r0-m${i / 2}`,
      p1: padded[i],
      p2: padded[i + 1],
      winner: null,
    })
  }
  rounds.push(round0)

  for (let r = 1; r < roundCount; r += 1) {
    const prevLen = rounds[r - 1].length
    /** @type {Match[]} */
    const round = []
    for (let i = 0; i < prevLen / 2; i += 1) {
      round.push({
        id: `r${r}-m${i}`,
        p1: null,
        p2: null,
        winner: null,
      })
    }
    rounds.push(round)
  }

  resolveByesAndPropagate(rounds)

  return { rounds, seeds: [...seeds] }
}

/**
 * Deep-clone a bracket (plain data).
 * @param {Bracket} bracket
 * @returns {Bracket}
 */
function cloneBracket(bracket) {
  return {
    seeds: [...bracket.seeds],
    rounds: bracket.rounds.map((round) =>
      round.map((match) => ({ ...match }))
    ),
  }
}

/**
 * Clear winners from a match onward (downstream rounds).
 * @param {Match[][]} rounds
 * @param {number} roundIndex
 * @param {number} matchIndex
 */
function clearDownstream(rounds, roundIndex, matchIndex) {
  let r = roundIndex
  let m = matchIndex

  while (r < rounds.length) {
    const match = rounds[r][m]
    match.winner = null

    if (r + 1 >= rounds.length) break

    const nextIndex = Math.floor(m / 2)
    const next = rounds[r + 1][nextIndex]
    if (m % 2 === 0) next.p1 = null
    else next.p2 = null

    // Also clear further winners that depended on this slot
    r += 1
    m = nextIndex
  }
}

/**
 * Set the winner of a match and advance them to the next round.
 * Returns a new bracket; does not mutate the input.
 * @param {Bracket} bracket
 * @param {string} matchId
 * @param {string} winner
 * @returns {Bracket}
 */
export function advanceWinner(bracket, matchId, winner) {
  const next = cloneBracket(bracket)

  for (let r = 0; r < next.rounds.length; r += 1) {
    for (let m = 0; m < next.rounds[r].length; m += 1) {
      const match = next.rounds[r][m]
      if (match.id !== matchId) continue

      if (winner !== match.p1 && winner !== match.p2) {
        throw new Error(`Winner "${winner}" is not a participant of ${matchId}`)
      }
      if (match.p1 == null || match.p2 == null) {
        throw new Error(`Cannot pick a winner for incomplete match ${matchId}`)
      }

      clearDownstream(next.rounds, r, m)
      match.winner = winner

      if (r + 1 < next.rounds.length) {
        const dest = next.rounds[r + 1][Math.floor(m / 2)]
        if (m % 2 === 0) dest.p1 = winner
        else dest.p2 = winner
      }

      return next
    }
  }

  throw new Error(`Match not found: ${matchId}`)
}

/**
 * Human-readable round label.
 * @param {number} roundIndex
 * @param {number} totalRounds
 * @param {number} matchCount
 * @returns {string}
 */
export function roundLabel(roundIndex, totalRounds, matchCount) {
  if (roundIndex === totalRounds - 1) return 'Final'
  if (roundIndex === totalRounds - 2 && totalRounds >= 2) return 'Semifinal'
  return `Ronda de ${matchCount * 2}`
}

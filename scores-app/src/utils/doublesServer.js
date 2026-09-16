// The order is confirmed per set. Unknown or inconsistent data never guesses a player.
export function doublesServer(state, order) {
  if (!state || state.winner || !order || order.set !== state.currentSet) return null
  if (![1, 2].includes(order.first1) || ![1, 2].includes(order.first2)) return null
  const first = order.firstSide === 'jugador1' ? 1 : order.firstSide === 'jugador2' ? 2 : null
  if (!first) return null
  const second = 3 - first
  const ring = [[first, order[`first${first}`]], [second, order[`first${second}`]], [first, 3 - order[`first${first}`]], [second, 3 - order[`first${second}`]]]
  const set = state.sets[state.currentSet - 1]
  if (!set) return null
  const games = set.type === 'match_tiebreak' ? 0 : set.games[0] + set.games[1]
  const turns = ['tiebreak', 'match_tiebreak'].includes(state.mode) ? Math.floor((state.points[0] + state.points[1] + 1) / 2) : 0
  const [team, member] = ring[(games + turns) % 4]
  return state.server === `jugador${team}` ? { team, member } : null
}

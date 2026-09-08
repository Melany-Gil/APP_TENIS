import { applyEvent, computeBreakpoint, serializeState } from '../generated/scoreEngine.js'
import { toJudgeState } from './judgeState.js'

export function projectJudgeEvent(control, event) {
  const config = control.partido.formato
  const state = applyEvent(control.raw_marcador, event, config)
  const [seq, count] = control.revision.split(':').map(Number)
  return toJudgeState({
    ...control,
    revision: `${seq + 1}:${count + 1}`,
    partido: { ...control.partido, estado: state.winner ? 'finalizado' : 'en_vivo' },
    marcador: serializeState(state),
    breakpoint: computeBreakpoint(state, config),
    eventos_recientes: [{ ...event, id: event.client_action_id, secuencia: seq + 1, local: true }, ...(control.eventos_recientes || [])].slice(0, 20),
  })
}

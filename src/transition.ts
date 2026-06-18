import type { MachineConfig, MachineState, NextState } from './types'

// transition() is a convenience wrapper for database/API patterns
// where you have a string status field and want to validate
// a proposed transition before saving it.
//
// Usage:
//   const result = transition(orderMachineConfig, order.status, 'SHIP')
//   if (result.ok) await db.update({ status: result.nextState })

export interface TransitionResult<TNextState extends string> {
  ok: true
  nextState: TNextState
}

export interface TransitionError {
  ok: false
  error: string
  current: string
  event: string
}

export function transition<
  TConfig extends MachineConfig<string, string>,
  TCurrentState extends MachineState<TConfig>,
  TEvent extends string,
>(
  config: TConfig,
  current: TCurrentState,
  event: TEvent,
): TransitionResult<NextState<TConfig, TCurrentState, TEvent> & string> | TransitionError {
  const stateConfig = config.states[current]

  if (!stateConfig) {
    return { ok: false, error: `Unknown state: ${current}`, current, event }
  }

  if (stateConfig.terminal) {
    return {
      ok: false,
      error: `State "${current}" is terminal — no transitions allowed`,
      current,
      event,
    }
  }

  const nextState = stateConfig.on?.[event]
  if (!nextState) {
    return {
      ok: false,
      error: `No transition from "${current}" on event "${event}"`,
      current,
      event,
    }
  }

  return {
    ok: true,
    nextState: nextState as NextState<TConfig, TCurrentState, TEvent> & string,
  }
}

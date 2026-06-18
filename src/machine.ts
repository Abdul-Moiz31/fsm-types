import type { Machine, MachineConfig, MachineState, NextState, StateConfig } from './types'

// createMachine() takes your config and returns a typed machine
// at the initial state. The return type carries the state
// as a type parameter so TypeScript knows what transitions are valid.
export function createMachine<
  TState extends string,
  TEvent extends string,
  TConfig extends MachineConfig<TState, TEvent>,
>(config: TConfig): Machine<TConfig, TConfig['initial']> {
  return {
    state: config.initial,
    config,
  } as Machine<TConfig, TConfig['initial']>
}

// send() performs a transition and returns a new machine instance
// with the updated state type. If the transition is not defined
// in the config, this is a TYPE ERROR — not a runtime error.
//
// The event parameter type collapses to `never` when the transition
// is invalid for the machine's current state, which is what makes
// invalid calls fail to compile rather than throw at runtime.
export function send<
  TConfig extends MachineConfig<string, string>,
  TCurrentState extends MachineState<TConfig>,
  TEvent extends string,
>(
  machine: Machine<TConfig, TCurrentState>,
  event: TEvent &
    (NextState<TConfig, TCurrentState, TEvent> extends never ? never : TEvent),
): Machine<TConfig, NextState<TConfig, TCurrentState, TEvent> & string> {
  // states is a Record covering every key of TState, so this lookup is
  // always defined at runtime — TS can't see that through a generic TConfig.
  const currentStateConfig = machine.config.states[machine.state] as StateConfig

  if (currentStateConfig.terminal) {
    throw new Error(`typestate: cannot transition from terminal state "${machine.state}"`)
  }

  const nextState = currentStateConfig.on?.[event]
  if (!nextState) {
    throw new Error(`typestate: no transition from "${machine.state}" on event "${event}"`)
  }

  return {
    state: nextState as NextState<TConfig, TCurrentState, TEvent> & string,
    config: machine.config,
  }
}

// can() checks at runtime whether a transition is valid.
// Useful for conditional UI logic (show/hide buttons).
export function can<TConfig extends MachineConfig<string, string>, TCurrentState extends MachineState<TConfig>>(
  machine: Machine<TConfig, TCurrentState>,
  event: string,
): boolean {
  const stateConfig = machine.config.states[machine.state] as StateConfig
  if (stateConfig.terminal) return false
  return event in (stateConfig.on ?? {})
}

// matches() checks if the machine is in a specific state.
// Narrows the machine type to that state.
export function matches<TConfig extends MachineConfig<string, string>, TTargetState extends MachineState<TConfig>>(
  machine: Machine<TConfig, MachineState<TConfig>>,
  state: TTargetState,
): machine is Machine<TConfig, TTargetState> {
  return (machine.state as string) === (state as string)
}

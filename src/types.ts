// A state definition — what transitions are allowed from this state
export interface StateConfig {
  on?: Record<string, string> // event → next state
  terminal?: boolean // no transitions allowed
}

// The full machine definition passed to createMachine()
export interface MachineConfig<TState extends string, TEvent extends string> {
  initial: TState
  states: Record<TState, StateConfig>
}

// Extract valid states from a machine config.
// Reads the key set directly off `states` rather than inferring TState
// from `MachineConfig<infer S, any>` — the latter only recovers the
// literal type of `initial`, since matching `infer S` against the
// `Record<S, StateConfig>` shape of `states` can't reverse-engineer a
// union of keys from a concrete (non-mapped) object type.
export type MachineState<TConfig> = TConfig extends { states: infer States } ? keyof States & string : never

// Extracts the event names declared in a single state's `on` map.
type EventsOfState<TStateConfig> = TStateConfig extends { on?: infer OnMap }
  ? OnMap extends Record<string, string>
    ? keyof OnMap & string
    : never
  : never

// Extract valid events from a machine config.
// TEvent has no structural presence in MachineConfig (it only ever
// appears as a type parameter, never in a property), so it can't be
// recovered by inference either — this instead unions the event names
// declared across every state's `on` map.
export type MachineEvent<TConfig> = TConfig extends { states: infer States }
  ? EventsOfState<States[keyof States]>
  : never

// A typed machine instance — knows its current state.
// TCurrentState is intentionally only constrained to `string` (not
// `MachineState<TConfig>`): that constraint can't be proven while TConfig
// is still an open generic, which is exactly the case inside createMachine().
// The real safety guarantee comes from send()/can()/matches()/transition(),
// which each constrain their own TCurrentState to MachineState<TConfig> —
// and at any real call site TConfig is a concrete literal type, so that
// constraint is fully checked there.
export interface Machine<TConfig extends MachineConfig<string, string>, TCurrentState extends string = MachineState<TConfig>> {
  readonly state: TCurrentState
  readonly config: TConfig
}

// Given a machine config, a current state S, and an event E —
// what is the next state?
// Resolves to never if the transition is not defined (invalid)
export type NextState<
  TConfig extends MachineConfig<string, string>,
  TCurrentState extends MachineState<TConfig>,
  TEvent extends string,
> = TConfig extends MachineConfig<any, any>
  ? TConfig['states'][TCurrentState] extends { on: infer Events }
    ? TEvent extends keyof Events
      ? Events[TEvent] extends MachineState<TConfig>
        ? Events[TEvent]
        : never
      : never
    : never
  : never

// Validates that a transition is allowed at compile time.
// Resolves to the next state when valid, or a descriptive error
// tuple (instead of `never`) so the failure is readable in editor
// tooltips and type-test assertions.
export type AssertTransition<
  TConfig extends MachineConfig<string, string>,
  TCurrentState extends MachineState<TConfig>,
  TEvent extends string,
> =
  NextState<TConfig, TCurrentState, TEvent> extends never
    ? ['ERROR: transition not allowed from state', TCurrentState, 'on event', TEvent]
    : NextState<TConfig, TCurrentState, TEvent>

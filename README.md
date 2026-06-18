# typestate

Compile-time state machine enforcement for TypeScript. Invalid transitions
are type errors, not runtime crashes. No XState. No class instances. Zero
dependencies.

## Install

```bash
npm install typestate
# or
pnpm add typestate
```

## The problem

An order goes from `pending` directly to `shipped`, skipping `confirmed`.
A payment goes from `processing` to `refunded` without ever being
`completed`. TypeScript doesn't catch this — the status field is just a
string union, and the transition logic lives in comments nobody reads.

```typescript
type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

function ship(order: { status: OrderStatus }) {
  order.status = 'shipped' // compiles even if order was 'pending'
}
```

## The solution

Define your states and the events that move between them once. typestate
turns any transition that isn't in that map into a compile error.

```typescript
import { createMachine, send } from 'typestate'

const orderMachine = createMachine({
  initial: 'pending',
  states: {
    pending:   { on: { CONFIRM: 'confirmed', CANCEL: 'cancelled' } },
    confirmed: { on: { SHIP: 'shipped',     CANCEL: 'cancelled'  } },
    shipped:   { on: { DELIVER: 'delivered'                       } },
    delivered: { terminal: true },
    cancelled: { terminal: true },
  },
} as const)

const confirmed = send(orderMachine, 'CONFIRM') // ok — confirmed.state is 'confirmed'
const shipped   = send(confirmed, 'SHIP')       // ok — shipped.state is 'shipped'

send(orderMachine, 'SHIP')
// Type error: Argument of type '"SHIP"' is not assignable to parameter of type 'never'
// SHIP is not a valid event from 'pending'
```

`as const` on the config is what makes this work — it tells TypeScript to
keep the literal state and event names instead of widening them to `string`.

## API

### `createMachine(config)`

Builds a typed machine sitting at `config.initial`. The returned machine's
`state` carries its current state as a type, which is what makes every
other function in this library type-safe.

### `send(machine, event)`

Performs a transition and returns a **new** machine (it never mutates).
If `event` isn't valid from the machine's current state, the call is a
type error at the call site — not a runtime exception. The runtime also
throws if a transition somehow isn't valid (terminal state, or unknown
event), as a defense-in-depth check for callers who bypass the type system.

### `can(machine, event)`

Runtime check for whether `event` is valid from the machine's current
state. Useful for conditional UI — e.g. disabling a button.

### `matches(machine, state)`

Type guard that checks (and narrows to) whether the machine is currently
in `state`.

### `transition(config, current, event)`

A pure, type-aware version of the transition lookup for cases where you
don't have a `Machine` instance — just a config and a status string from a
database row. Returns `{ ok: true, nextState }` or `{ ok: false, error }`
instead of throwing, so you can validate a proposed write before it
happens.

```typescript
const result = transition(orderMachine.config, order.status, 'SHIP')
if (result.ok) {
  await db.orders.update({ where: { id: order.id }, data: { status: result.nextState } })
}
```

### `inState(entity, state)`

Narrows any object with a `status` field to a specific state — handy for
narrowing Drizzle/Prisma row types in conditional logic.

```typescript
if (inState(order, 'confirmed')) {
  await shipOrder(order) // order.status is 'confirmed' here
}
```

### Types

```typescript
MachineConfig<TState, TEvent>  // the shape passed to createMachine()
MachineState<TConfig>          // union of valid state names for a config
MachineEvent<TConfig>          // union of valid event names for a config
Machine<TConfig, TCurrentState>// a machine instance type
NextState<TConfig, TState, TEvent>   // resolves the next state, or never
AssertTransition<TConfig, TState, TEvent> // like NextState, but a readable error tuple instead of never
```

## Real-world patterns

### Deriving your domain types from one source of truth

```typescript
import type { MachineState } from 'typestate'

type OrderStatus = MachineState<typeof orderMachine.config>
// 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

type Order = { id: string; status: OrderStatus; total: number }
```

### Service functions backed by a database status column

```typescript
async function confirmOrder(order: Order) {
  const result = transition(orderMachine.config, order.status, 'CONFIRM')
  if (!result.ok) throw new Error(`Cannot confirm order: ${result.error}`)

  await db.orders.update({
    where: { id: order.id },
    data: { status: result.nextState }, // typed as 'confirmed', not string
  })
}
```

### UI actions driven by the current state

```typescript
function getOrderActions(order: Order) {
  const machine = createMachine({ ...orderMachine.config, initial: order.status } as const)
  return {
    canConfirm: can(machine, 'CONFIRM'),
    canShip:    can(machine, 'SHIP'),
    canCancel:  can(machine, 'CANCEL'),
  }
}
```

See [`examples/order-machine.ts`](./examples/order-machine.ts) for the
full version of these patterns together.

## Why not XState?

XState is a complete statechart implementation — actors, parallel states,
history states, an interpreter, devtools. Most apps enforcing a `status`
field on an order or payment row don't need any of that; they need the
compiler to reject an invalid write. typestate is just types and a few
plain functions: no runtime interpreter, no class instances, nothing to
import beyond what you call directly.

## License

MIT

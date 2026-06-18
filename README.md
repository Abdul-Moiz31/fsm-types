# typestate

Compile-time state machine enforcement for TypeScript.
Invalid transitions are type errors — not runtime crashes.
Zero dependencies. No XState. No class instances.

## Install

```bash
npm install typestate
# or
pnpm add typestate
```

## The problem

```typescript
type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered'

// Nothing stops this. TypeScript has no opinion.
order.status = 'shipped'  // order was still 'pending'
await db.orders.update({ status: 'shipped' })  // skipped 'confirmed'
```

The transition logic lives in a comment, a Notion doc, or someone's
memory. Add a new status and forget a case somewhere — nobody finds
out until a customer's order breaks.

## The solution

```typescript
import { createMachine, send, transition } from 'typestate'
import type { MachineState } from 'typestate'

const orderMachine = createMachine({
  initial: 'pending',
  states: {
    pending:   { on: { CONFIRM: 'confirmed', CANCEL: 'cancelled' } },
    confirmed: { on: { SHIP: 'shipped',      CANCEL: 'cancelled' } },
    shipped:   { on: { DELIVER: 'delivered'                      } },
    delivered: { terminal: true },
    cancelled: { terminal: true },
  },
} as const)

// Extract typed status for your domain model
type OrderStatus = MachineState<typeof orderMachine.config>

// Valid — compiles
const confirmed = send(orderMachine, 'CONFIRM')
const shipped   = send(confirmed,    'SHIP')

// Invalid — TYPE ERROR at compile time
const broken = send(orderMachine, 'SHIP')
// Argument of type '"SHIP"' is not assignable to parameter of type 'never'
// because 'SHIP' is not a valid event from state 'pending'
```

## API

### createMachine(config)

Creates a typed machine instance at the initial state.

```typescript
const machine = createMachine({
  initial: 'draft',
  states: {
    draft:     { on: { PUBLISH: 'published', ARCHIVE: 'archived' } },
    published: { on: { UNPUBLISH: 'draft',   ARCHIVE: 'archived' } },
    archived:  { terminal: true },
  },
} as const)
```

### send(machine, event)

Transitions the machine. Returns a new machine with updated state type.
**Produces a compile-time type error if the event is not valid
from the current state.**

```typescript
const published = send(machine, 'PUBLISH')
// published.state: 'published'

send(machine, 'UNPUBLISH')
// Type error — UNPUBLISH is not valid from 'draft'
```

### transition(config, currentState, event)

For database-driven patterns where you have a string status field.
Returns a typed result object instead of throwing.

```typescript
const result = transition(orderMachine.config, order.status, 'CONFIRM')

if (result.ok) {
  await db.orders.update({ status: result.nextState })
  // result.nextState is typed — not just string
}
```

### can(machine, event)

Runtime check — useful for showing/hiding UI buttons.

```typescript
const canShip = can(machine, 'SHIP')  // boolean
```

### matches(machine, state)

Type-narrows a machine to a specific state.

```typescript
if (matches(machine, 'confirmed')) {
  // machine.state is 'confirmed' here
}
```

### inState(entity, state)

Type-narrows any object with a status field.

```typescript
if (inState(order, 'confirmed')) {
  // order.status is 'confirmed' — TypeScript knows
  await shipOrder(order)
}
```

## Why not XState?

XState is a full runtime state management system — actors, services,
parallel states, history states, invoked promises. It is the right
tool for complex UI state that needs to be visualized and debugged.

typestate is for enforcing business logic transitions at the type level.
No runtime overhead, no configuration syntax to learn, no actor model.
If your use case is "make invalid order status transitions a compile error",
typestate is ten lines of config.

## License

MIT

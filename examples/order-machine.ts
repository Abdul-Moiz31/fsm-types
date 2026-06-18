/**
 * Order lifecycle — compile-time enforced state transitions.
 *
 * `db` and `shipOrder` are minimal stand-ins for your real database client
 * and shipping logic — swap them for the real things. The fsm-types usage
 * (createMachine, send, can, transition, inState) is the point.
 */
import { createMachine, send, can, transition, inState } from '@iamabdulmoiz/fsm-types'
import type { MachineState } from '@iamabdulmoiz/fsm-types'

// --- stand-in for your real database client ---
declare const db: {
  orders: {
    update(args: { where: { id: string }; data: { status: OrderState } }): Promise<void>
  }
}
declare function shipOrder(order: Order): Promise<void>

// Define the machine config
const orderMachine = createMachine({
  initial: 'pending',
  states: {
    pending: { on: { CONFIRM: 'confirmed', CANCEL: 'cancelled' } },
    confirmed: { on: { SHIP: 'shipped', CANCEL: 'cancelled' } },
    shipped: { on: { DELIVER: 'delivered' } },
    delivered: { terminal: true },
    cancelled: { terminal: true },
  },
} as const)

// Extract the state type for use in your domain model
type OrderState = MachineState<typeof orderMachine.config>
// = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

// Use in your database row type
type Order = {
  id: string
  status: OrderState
  total: number
}

// VALID transitions — these compile
const confirmed = send(orderMachine, 'CONFIRM')
// confirmed.state is 'confirmed' — TypeScript knows this

const shipped = send(confirmed, 'SHIP')
// shipped.state is 'shipped'

// INVALID transition — TYPE ERROR at compile time
// send(orderMachine, 'SHIP')
// Error: Argument of type '"SHIP"' is not assignable to parameter of type 'never'
// because SHIP is not valid from 'pending'

// Service function using transition() for database-driven state
async function confirmOrder(order: Order) {
  const result = transition(orderMachine.config, order.status, 'CONFIRM')

  if (!result.ok) {
    // order is not in a state that allows CONFIRM
    throw new Error(`Cannot confirm order: ${result.error}`)
  }

  await db.orders.update({
    where: { id: order.id },
    data: { status: result.nextState },
    // result.nextState is typed as 'confirmed' — not just string
  })
}

// UI helper — show/hide buttons based on valid transitions
function getOrderActions(order: Order) {
  const machine = createMachine({
    ...orderMachine.config,
    initial: order.status,
  } as const)

  return {
    canConfirm: can(machine, 'CONFIRM'),
    canShip: can(machine, 'SHIP'),
    canCancel: can(machine, 'CANCEL'),
    canDeliver: can(machine, 'DELIVER'),
  }
}

// Type guard for narrowing in conditional logic
declare const order: Order
if (inState(order, 'confirmed')) {
  // order.status is 'confirmed' here — fully narrowed
  await shipOrder(order)
}

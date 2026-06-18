import { describe, expect, it } from 'vitest'
import { can, createMachine, matches, send } from '../src/machine'

function orderMachine() {
  return createMachine({
    initial: 'pending',
    states: {
      pending: { on: { CONFIRM: 'confirmed', CANCEL: 'cancelled' } },
      confirmed: { on: { SHIP: 'shipped', CANCEL: 'cancelled' } },
      shipped: { on: { DELIVER: 'delivered' } },
      delivered: { terminal: true },
      cancelled: { terminal: true },
    },
  } as const)
}

describe('createMachine', () => {
  it('returns a machine with the correct initial state', () => {
    const machine = orderMachine()
    expect(machine.state).toBe('pending')
    expect(machine.config.initial).toBe('pending')
  })
})

describe('send', () => {
  it('transitions to the correct next state', () => {
    const machine = orderMachine()
    const confirmed = send(machine, 'CONFIRM')
    expect(confirmed.state).toBe('confirmed')
  })

  it('throws at runtime for an undefined transition', () => {
    const machine = orderMachine()
    const shipped = send(send(machine, 'CONFIRM'), 'SHIP')
    // simulate a bad event slipping past the type system (e.g. from untyped input)
    const badEvent = 'NOT_A_REAL_EVENT' as unknown as 'DELIVER'
    expect(() => send(shipped, badEvent)).toThrow(/no transition/)
  })

  it('throws for a terminal state', () => {
    const machine = orderMachine()
    const delivered = send(send(send(machine, 'CONFIRM'), 'SHIP'), 'DELIVER')
    expect(() => send(delivered, 'CONFIRM' as never)).toThrow(/terminal state/)
  })

  it('updates state correctly across multiple transitions in sequence', () => {
    const machine = orderMachine()
    const confirmed = send(machine, 'CONFIRM')
    const shipped = send(confirmed, 'SHIP')
    const delivered = send(shipped, 'DELIVER')

    expect(confirmed.state).toBe('confirmed')
    expect(shipped.state).toBe('shipped')
    expect(delivered.state).toBe('delivered')
  })

  it('sending an invalid event is a type error', () => {
    // guarded by `if (false)` so vitest (which strips types and would
    // otherwise execute this at runtime) never actually calls send() —
    // this block exists purely for tsc to check the @ts-expect-error below
    if (false) {
      const machine = orderMachine()
      // @ts-expect-error — SHIP is not a valid event from 'pending'
      send(machine, 'SHIP')
    }
  })
})

describe('can', () => {
  it('returns true for a valid event and false for an invalid one', () => {
    const machine = orderMachine()
    expect(can(machine, 'CONFIRM')).toBe(true)
    expect(can(machine, 'SHIP')).toBe(false)
  })

  it('returns false for a terminal state regardless of event', () => {
    const machine = orderMachine()
    const delivered = send(send(send(machine, 'CONFIRM'), 'SHIP'), 'DELIVER')
    expect(can(delivered, 'CONFIRM')).toBe(false)
    expect(can(delivered, 'DELIVER')).toBe(false)
  })
})

describe('matches', () => {
  it('returns true when the machine is in the target state', () => {
    const machine = orderMachine()
    const confirmed = send(machine, 'CONFIRM')
    expect(matches(confirmed, 'confirmed')).toBe(true)
  })

  it('returns false when the machine is in a different state', () => {
    const machine = orderMachine()
    const confirmed = send(machine, 'CONFIRM')
    expect(matches(confirmed, 'shipped')).toBe(false)
  })
})

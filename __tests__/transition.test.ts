import { describe, expect, it } from 'vitest'
import { transition } from '../src/transition'

const orderConfig = {
  initial: 'pending',
  states: {
    pending: { on: { CONFIRM: 'confirmed', CANCEL: 'cancelled' } },
    confirmed: { on: { SHIP: 'shipped', CANCEL: 'cancelled' } },
    shipped: { on: { DELIVER: 'delivered' } },
    delivered: { terminal: true },
    cancelled: { terminal: true },
  },
} as const

describe('transition', () => {
  it('returns ok:true with the correct nextState for a valid transition', () => {
    const result = transition(orderConfig, 'pending', 'CONFIRM')
    expect(result).toEqual({ ok: true, nextState: 'confirmed' })
  })

  it('returns ok:false for an invalid event', () => {
    const result = transition(orderConfig, 'pending', 'SHIP')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/No transition from "pending" on event "SHIP"/)
      expect(result.current).toBe('pending')
      expect(result.event).toBe('SHIP')
    }
  })

  it('returns ok:false for a terminal state', () => {
    const result = transition(orderConfig, 'delivered', 'CONFIRM')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/State "delivered" is terminal/)
    }
  })

  it('returns ok:false for an unknown state string', () => {
    const unknownState = 'archived' as unknown as 'pending'
    const result = transition(orderConfig, unknownState, 'CONFIRM')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Unknown state: archived')
    }
  })

  it('produces human-readable error messages including state and event names', () => {
    const result = transition(orderConfig, 'shipped', 'CONFIRM')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('shipped')
      expect(result.error).toContain('CONFIRM')
    }
  })
})

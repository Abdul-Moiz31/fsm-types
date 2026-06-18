import { describe, expect, it } from 'vitest'
import { inState } from '../src/guards'

type OrderState = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
type Order = { id: string; status: OrderState; total: number }

const order: Order = { id: 'o_1', status: 'confirmed', total: 42 }

describe('inState', () => {
  it('returns true when entity.status matches', () => {
    expect(inState(order, 'confirmed')).toBe(true)
  })

  it('returns false when entity.status does not match', () => {
    expect(inState(order, 'shipped')).toBe(false)
  })

  it('narrows the type after the check passes', () => {
    if (inState(order, 'confirmed')) {
      const status: 'confirmed' = order.status
      expect(status).toBe('confirmed')
      // @ts-expect-error — order.status is narrowed to 'confirmed', not 'shipped'
      const wrong: 'shipped' = order.status
    }
  })
})

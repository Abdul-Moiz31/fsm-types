// inState() narrows an entity with a status field
// to the specific state — useful with Drizzle/Prisma row types
export function inState<TState extends string, TTargetState extends TState>(
  entity: { status: TState },
  state: TTargetState,
): entity is { status: TTargetState } & typeof entity {
  return entity.status === state
}

// Usage example:
//
// type Order = { id: string; status: OrderState; total: number }
// declare const order: Order
//
// if (inState(order, 'confirmed')) {
//   // order.status is 'confirmed' here
//   await shipOrder(order)  // TypeScript knows it's confirmed
// }

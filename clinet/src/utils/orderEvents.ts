// Simple event emitter for Order/PreOrder updates
// This allows components to communicate when orders are created/updated

type OrderEventType = 'ORDER_CREATED' | 'ORDER_UPDATED' | 'PREORDER_CREATED' | 'PREORDER_UPDATED' | 'ORDER_DELETED' | 'PREORDER_DELETED';

type OrderEventCallback = (data?: any) => void;

class OrderEventEmitter {
  private listeners: Map<OrderEventType, Set<OrderEventCallback>> = new Map();

  // Subscribe to an event
  on(event: OrderEventType, callback: OrderEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // Emit an event
  emit(event: OrderEventType, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in order event listener for ${event}:`, error);
        }
      });
    }
  }

  // Subscribe to all order-related events
  onAnyOrderChange(callback: OrderEventCallback): () => void {
    const events: OrderEventType[] = [
      'ORDER_CREATED', 
      'ORDER_UPDATED', 
      'PREORDER_CREATED', 
      'PREORDER_UPDATED',
      'ORDER_DELETED',
      'PREORDER_DELETED'
    ];
    
    const unsubscribers = events.map(event => this.on(event, callback));
    
    // Return function to unsubscribe from all
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
}

// Singleton instance
export const orderEvents = new OrderEventEmitter();

// Helper functions for common operations
export const emitOrderCreated = (orderData?: any) => orderEvents.emit('ORDER_CREATED', orderData);
export const emitOrderUpdated = (orderData?: any) => orderEvents.emit('ORDER_UPDATED', orderData);
export const emitPreOrderCreated = (preOrderData?: any) => orderEvents.emit('PREORDER_CREATED', preOrderData);
export const emitPreOrderUpdated = (preOrderData?: any) => orderEvents.emit('PREORDER_UPDATED', preOrderData);
export const emitOrderDeleted = (orderData?: any) => orderEvents.emit('ORDER_DELETED', orderData);
export const emitPreOrderDeleted = (preOrderData?: any) => orderEvents.emit('PREORDER_DELETED', preOrderData);

export default orderEvents;

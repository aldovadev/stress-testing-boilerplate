import { useEffect, useRef, useCallback } from 'react';
import { useMetricsStore } from '../store/metricsStore';
import type { WsMessage } from '../types/metrics';

const WS_URL = `ws://${window.location.hostname}:3001/ws`;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 20;

/**
 * Custom hook that manages the WebSocket connection to the k6 metrics backend.
 * Automatically connects, reconnects on disconnect, and dispatches incoming
 * messages to the metrics store.
 */
export function useMetricsStream() {
  const { state, dispatch } = useMetricsStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to metrics stream');
      dispatch({ type: 'SET_CONNECTED', payload: true });
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'init':
            dispatch({ type: 'SET_TEST_STATUS', payload: message.data.status.running ? 'running' : 'idle' });
            dispatch({ type: 'SET_TEST_START_TIME', payload: message.data.status.startTime });
            dispatch({ type: 'SET_DEFINITIONS', payload: message.data.definitions });
            if (message.data.buffer.length > 0) {
              dispatch({ type: 'INIT_BUFFER', payload: message.data.buffer });
            }
            break;

          case 'metric_definition':
            dispatch({ type: 'ADD_DEFINITION', payload: message.data });
            break;

          case 'data_points':
            dispatch({ type: 'ADD_DATA_POINTS', payload: message.data });
            break;

          case 'test_start':
            dispatch({ type: 'SET_TEST_STATUS', payload: 'running' });
            dispatch({ type: 'SET_TEST_START_TIME', payload: message.data.startTime });
            break;

          case 'test_complete':
            dispatch({ type: 'SET_TEST_STATUS', payload: 'completed' });
            break;

          case 'summary':
            dispatch({ type: 'SET_SUMMARY', payload: message.data });
            break;

          case 'reset':
            dispatch({ type: 'RESET' });
            break;
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      dispatch({ type: 'SET_CONNECTED', payload: false });
      wsRef.current = null;

      // Auto-reconnect with backoff
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        const delay = RECONNECT_DELAY * Math.min(reconnectAttempts.current, 5);
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, [dispatch]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected: state.isConnected,
    testStatus: state.testStatus,
    reconnect: connect,
  };
}

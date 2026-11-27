
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlatformState } from '../types/platform';

type SocketMessage = {
  type?: string;
  data?: PlatformState;
};

type ApiMethod = 'POST' | 'PATCH';

export function usePlatformSocket() {
  const [state, setState] = useState<PlatformState | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  // Fetch initial platform state
  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await fetch('/api/state', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Unable to fetch platform state (HTTP ${response.status})`);
      }

      const data = (await response.json()) as PlatformState;

      setState(data);
      setError(null);

      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach backend server';

      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    mountedRef.current = true;

    let reconnectDelay = 2500;

    const connect = () => {
      if (!mountedRef.current) return;

      // Avoid duplicate connections
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const protocol =
        window.location.protocol === 'https:' ? 'wss:' : 'ws:';

      const wsUrl = `${protocol}//${window.location.host}/ws`;

      let socket: WebSocket;

      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        if (!mountedRef.current) {
          socket.close();
          return;
        }

        reconnectDelay = 2500;
        setConnected(true);
        setError(null);
      };

      socket.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;

        try {
          const message = JSON.parse(String(event.data)) as SocketMessage;

          if (message.data !== undefined) {
            setState(message.data);
            setLoading(false);
            setError(null);
          }
        } catch (err) {
          console.error('Invalid WebSocket message:', err);
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        if (wsRef.current === socket) {
          wsRef.current = null;
        }

        if (!mountedRef.current) return;

        setConnected(false);
        scheduleReconnect();
      };
    };

    function scheduleReconnect() {
      if (!mountedRef.current || reconnectTimerRef.current !== null) {
        return;
      }

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, reconnectDelay);

      reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
    }

    // Initial API request
    fetchSnapshot().catch(() => {
      // Error is already stored in state.
    });

    // Initial WebSocket connection
    connect();

    return () => {
      mountedRef.current = false;

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const socket = wsRef.current;
      wsRef.current = null;

      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        if (socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      }

      setConnected(false);
    };
  }, [fetchSnapshot]);

  // Common API request handler
  const apiRequest = useCallback(
    async <T = unknown>(
      url: string,
      method: ApiMethod,
      body?: unknown
    ): Promise<T> => {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const responseText = await response.text();

      let json: unknown = {};

      if (responseText) {
        try {
          json = JSON.parse(responseText);
        } catch {
          throw new Error(
            `Invalid server response (HTTP ${response.status})`
          );
        }
      }

      if (!response.ok) {
        const errorMessage =
          typeof json === 'object' &&
          json !== null &&
          'error' in json &&
          typeof json.error === 'string'
            ? json.error
            : `Request failed (${response.status})`;

        throw new Error(errorMessage);
      }

      return json as T;
    },
    []
  );

  const post = useCallback(
    <T = unknown>(url: string, body?: unknown) =>
      apiRequest<T>(url, 'POST', body),
    [apiRequest]
  );

  const patch = useCallback(
    <T = unknown>(url: string, body?: unknown) =>
      apiRequest<T>(url, 'PATCH', body),
    [apiRequest]
  );

  return {
    state,
    loading,
    connected,
    error,
    refresh: fetchSnapshot,
    post,
    patch,
  };
}

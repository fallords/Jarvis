import * as React from 'react';
import { LogLevel, Room, setLogLevel } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

// Expose a typed debug handle on window to avoid using `any` and satisfy lint rules
declare global {
  interface Window {
    __lk_room?: Room | undefined;
  }
}

export const useDebugMode = (options: { logLevel?: LogLevel; enabled?: boolean } = {}) => {
  const room = useRoomContext();
  const logLevel = options.logLevel ?? 'debug';
  const enabled = options.enabled ?? true;

  React.useEffect(() => {
    if (!enabled) {
      setLogLevel('silent');
      return;
    }

    setLogLevel(logLevel ?? 'debug');

    // attach room to window for debugging in dev tools
    window.__lk_room = room as Room;

    return () => {
      // clear debug handle
      window.__lk_room = undefined;
      setLogLevel('silent');
    };
  }, [room, enabled, logLevel]);
};

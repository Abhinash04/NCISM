import { createContext, useContext, useState } from 'react';

/**
 * Shared workspace UI state (active heading for outline <-> markdown scroll
 * sync). Replaces the window CustomEvent side channel.
 */
const WorkspaceContext = createContext({
  activeHeadingId: null,
  setActiveHeadingId: () => {},
});

export function WorkspaceProvider({ children }) {
  const [activeHeadingId, setActiveHeadingId] = useState(null);
  return (
    <WorkspaceContext.Provider value={{ activeHeadingId, setActiveHeadingId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

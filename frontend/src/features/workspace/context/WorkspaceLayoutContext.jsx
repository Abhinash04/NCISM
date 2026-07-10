/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const WorkspaceLayoutContext = createContext({
  isFullscreen: null,
  setIsFullscreen: () => {},
  collapsedPanels: { pdf: false, inspector: false },
  setCollapsedPanels: () => {},
  panelSizes: { pdf: 35, workspace: 45, inspector: 20 },
  setPanelSizes: () => {},
  wordWrap: true,
  setWordWrap: () => {},
  readingMode: false,
  setReadingMode: () => {},
  fontSize: 'text-sm',
  setFontSize: () => {},
  fontFamily: 'font-sans',
  setFontFamily: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  matchCount: 0,
  setMatchCount: () => {},
  activeMatchIndex: 0,
  setActiveMatchIndex: () => {},
});

const STORAGE_KEY = 'ncism-workspace-layout-state';

// Lazy loader helper
function getSavedValue(key, field, defaultValue) {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[field] !== undefined) {
        return parsed[field];
      }
    }
  } catch (e) {
    console.error(`Failed to load workspace layout field ${field}:`, e);
  }
  return defaultValue;
}

export function WorkspaceLayoutProvider({ children }) {
  const [isFullscreen, setIsFullscreen] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Lazy initialize states to avoid calling setState inside useEffect on mount
  const [collapsedPanels, setCollapsedPanels] = useState(() => 
    getSavedValue(STORAGE_KEY, 'collapsedPanels', { pdf: false, inspector: false })
  );
  
  const [panelSizes, setPanelSizes] = useState(() => 
    getSavedValue(STORAGE_KEY, 'panelSizes', { pdf: 35, workspace: 45, inspector: 20 })
  );

  const [wordWrap, setWordWrap] = useState(() => 
    getSavedValue(STORAGE_KEY, 'wordWrap', true)
  );

  const [readingMode, setReadingMode] = useState(() => 
    getSavedValue(STORAGE_KEY, 'readingMode', false)
  );

  const [fontSize, setFontSize] = useState(() => 
    getSavedValue(STORAGE_KEY, 'fontSize', 'text-sm')
  );

  const [fontFamily, setFontFamily] = useState(() => 
    getSavedValue(STORAGE_KEY, 'fontFamily', 'font-sans')
  );

  // Save state to localStorage on state changes
  useEffect(() => {
    try {
      const stateToSave = {
        panelSizes,
        collapsedPanels,
        wordWrap,
        readingMode,
        fontSize,
        fontFamily,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save workspace layout state:', e);
    }
  }, [panelSizes, collapsedPanels, wordWrap, readingMode, fontSize, fontFamily]);

  return (
    <WorkspaceLayoutContext.Provider
      value={{
        isFullscreen,
        setIsFullscreen,
        collapsedPanels,
        setCollapsedPanels,
        panelSizes,
        setPanelSizes,
        wordWrap,
        setWordWrap,
        readingMode,
        setReadingMode,
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        searchQuery,
        setSearchQuery,
        matchCount,
        setMatchCount,
        activeMatchIndex,
        setActiveMatchIndex,
      }}
    >
      {children}
    </WorkspaceLayoutContext.Provider>
  );
}

export function useWorkspaceLayout() {
  return useContext(WorkspaceLayoutContext);
}

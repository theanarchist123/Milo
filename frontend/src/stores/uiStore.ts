import { create } from 'zustand';

interface UiStore {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  activeFilter: string;
  searchQuery: string;
  commandPaletteOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setActiveFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: true,
  activeFilter: 'all',
  searchQuery: '',
  commandPaletteOpen: false,

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

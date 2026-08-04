import { create } from "zustand";

interface AppState {
  selectedSpaceId: string | null;
  selectedAlbumId: string | null;
  search: string;
  setSelectedSpaceId: (id: string | null) => void;
  setSelectedAlbumId: (id: string | null) => void;
  setSearch: (search: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedSpaceId: null,
  selectedAlbumId: null,
  search: "",
  setSelectedSpaceId: (selectedSpaceId) => set({ selectedSpaceId, selectedAlbumId: null, search: "" }),
  setSelectedAlbumId: (selectedAlbumId) => set({ selectedAlbumId }),
  setSearch: (search) => set({ search }),
}));

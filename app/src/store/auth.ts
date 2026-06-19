import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse, AuthTokens, UserDTO, WorkspaceDTO } from "@webforge/shared";

interface AuthState {
  user: UserDTO | null;
  workspace: WorkspaceDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (res: AuthResponse) => void;
  setTokens: (tokens: AuthTokens) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      workspace: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setSession: (res) =>
        set({
          user: res.user,
          workspace: res.workspace,
          accessToken: res.tokens.accessToken,
          refreshToken: res.tokens.refreshToken,
          isAuthenticated: true,
        }),
      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
      logout: () =>
        set({
          user: null,
          workspace: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    { name: "wf.auth" },
  ),
);

import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/auth.js";
import { AuthPage } from "./pages/AuthPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { EditorPage } from "./pages/EditorPage.js";
import { StorePage } from "./pages/StorePage.js";
import { EventsPage } from "./pages/EventsPage.js";
import { AdminPage } from "./pages/AdminPage.js";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage mode="login" />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage mode="register" />}
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/editor/:siteId"
        element={
          <RequireAuth>
            <EditorPage />
          </RequireAuth>
        }
      />
      <Route
        path="/store"
        element={
          <RequireAuth>
            <StorePage />
          </RequireAuth>
        }
      />
      <Route
        path="/events"
        element={
          <RequireAuth>
            <EventsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

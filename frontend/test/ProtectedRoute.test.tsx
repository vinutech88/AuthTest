/**
 * Tests for ProtectedRoute — redirects unauthenticated users to /login with a
 * notice (preserving the originally requested location), renders children
 * when authenticated.
 *
 * Source issue: #10 (User Story #1 — Login)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "../src/components/ProtectedRoute";

vi.mock("../src/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../src/context/AuthContext";

function LoginProbe() {
  const location = useLocation();
  const state = location.state as { notice?: string; from?: { pathname?: string } } | null;
  return (
    <div data-testid="login-probe">
      <span data-testid="notice">{state?.notice ?? ""}</span>
      <span data-testid="from-path">{state?.from?.pathname ?? ""}</span>
    </div>
  );
}

function renderProtected(initialPath: string, isAuthenticated: boolean) {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    hasAction: vi.fn(),
    hasModule: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div data-testid="secret-content">Secret</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects an unauthenticated user to /login with a sign-in notice", () => {
    renderProtected("/protected", false);

    expect(screen.getByTestId("login-probe")).toBeInTheDocument();
    expect(screen.getByTestId("notice")).toHaveTextContent("Please sign in to continue.");
    expect(screen.queryByTestId("secret-content")).not.toBeInTheDocument();
  });

  it("preserves the originally requested location in the redirect state", () => {
    renderProtected("/protected", false);

    expect(screen.getByTestId("from-path")).toHaveTextContent("/protected");
  });

  it("renders the protected children when the user is authenticated", () => {
    renderProtected("/protected", true);

    expect(screen.getByTestId("secret-content")).toBeInTheDocument();
    expect(screen.queryByTestId("login-probe")).not.toBeInTheDocument();
  });
});

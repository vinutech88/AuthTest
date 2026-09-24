/**
 * Tests for Dashboard — module nav rendering by permission, restricted-action
 * gating, and permission-denied handling on a direct 403.
 *
 * Source issue: #10 (User Story #1 — Login)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../src/pages/Dashboard";

vi.mock("../src/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../src/api/authClient", async () => {
  const actual = await vi.importActual<typeof import("../src/api/authClient")>(
    "../src/api/authClient",
  );
  return {
    ...actual,
    performRestrictedAction: vi.fn(),
  };
});

import { useAuth } from "../src/context/AuthContext";
import { performRestrictedAction, AuthApiError } from "../src/api/authClient";

function mockAuth(overrides: {
  modules?: string[];
  actions?: string[];
  canManageUsers?: boolean;
  logout?: () => void;
  user?: null | Record<string, unknown>;
}) {
  const modules = overrides.modules ?? [];
  const actions = overrides.actions ?? [];
  const user =
    overrides.user === null
      ? null
      : {
          token: "tok",
          username: "admin",
          fullName: "Alex Administrator",
          role: "admin",
          modules,
          actions,
          ...overrides.user,
        };

  vi.mocked(useAuth).mockReturnValue({
    user,
    isAuthenticated: user !== null,
    login: vi.fn(),
    logout: overrides.logout ?? vi.fn(),
    hasAction: (action: string) => overrides.canManageUsers ?? actions.includes(action),
    hasModule: (moduleName: string) => modules.includes(moduleName),
  });
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDashboard() {
    return render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
  }

  it("renders nothing when there is no authenticated user", () => {
    mockAuth({ user: null });

    const { container } = renderDashboard();

    expect(container).toBeEmptyDOMElement();
  });

  it("renders only the modules permitted for the current user", () => {
    mockAuth({ modules: ["patients", "reports"] });

    renderDashboard();

    const nav = screen.getByTestId("dashboard-module-nav");
    const links = within(nav).getAllByRole("link").map((link) => link.textContent);
    expect(links).toEqual(["patients", "reports"]);
  });

  it("disables the restricted action button for a role without manage-users", () => {
    mockAuth({ actions: ["view"], canManageUsers: false });

    renderDashboard();

    expect(screen.getByTestId("action-restricted-button")).toBeDisabled();
  });

  it("enables the restricted action button for a role with manage-users", () => {
    mockAuth({ actions: ["view", "edit", "delete", "manage-users"], canManageUsers: true });

    renderDashboard();

    expect(screen.getByTestId("action-restricted-button")).toBeEnabled();
  });

  it("shows the permission-denied message when a direct restricted-action call returns 403", async () => {
    mockAuth({ actions: ["manage-users"], canManageUsers: true });
    vi.mocked(performRestrictedAction).mockRejectedValue(
      new AuthApiError(403, "You lack the manage-users permission."),
    );
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByTestId("action-restricted-button"));

    await waitFor(() =>
      expect(screen.getByTestId("permission-denied-message")).toHaveTextContent(
        "You lack the manage-users permission.",
      ),
    );
  });

  it("falls back to the generic denial message for a non-AuthApiError failure", async () => {
    mockAuth({ actions: ["manage-users"], canManageUsers: true });
    vi.mocked(performRestrictedAction).mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByTestId("action-restricted-button"));

    await waitFor(() =>
      expect(screen.getByTestId("permission-denied-message")).toHaveTextContent(
        "You do not have permission to perform this action.",
      ),
    );
  });

  it("invokes logout from context when the sign-out button is clicked", async () => {
    const logout = vi.fn();
    mockAuth({ logout });
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});

/**
 * Tests for Login page — field validation, auth error handling, loading state,
 * redirect notice, and successful-login navigation.
 *
 * Source issue: #10 (User Story #1 — Login)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../src/context/AuthContext";
import { Login } from "../src/pages/Login";

vi.mock("../src/api/authClient", async () => {
  const actual = await vi.importActual<typeof import("../src/api/authClient")>(
    "../src/api/authClient",
  );
  return {
    ...actual,
    login: vi.fn(),
  };
});

import { login as mockLoginRequest, AuthApiError } from "../src/api/authClient";

function renderLogin(initialEntries: Array<string | { pathname: string; state?: unknown }>) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          <Route
            path="/dashboard/custom"
            element={<div data-testid="dashboard-custom-page">Custom</div>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillValidCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId("login-username-input"), "admin");
  await user.type(screen.getByTestId("login-password-input"), "Admin123!");
}

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  // ── Field validation ───────────────────────────────────────────────────────

  it("shows required-field errors and does not attempt login when both fields are blank", async () => {
    const user = userEvent.setup();
    renderLogin(["/login"]);

    await user.click(screen.getByTestId("login-submit-button"));

    expect(screen.getByTestId("login-username-error")).toHaveTextContent("This field is required.");
    expect(screen.getByTestId("login-password-error")).toHaveTextContent("This field is required.");
    expect(mockLoginRequest).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only password as blank", async () => {
    const user = userEvent.setup();
    renderLogin(["/login"]);

    await user.type(screen.getByTestId("login-username-input"), "admin");
    await user.type(screen.getByTestId("login-password-input"), "   ");
    await user.click(screen.getByTestId("login-submit-button"));

    expect(screen.getByTestId("login-password-error")).toHaveTextContent("This field is required.");
    expect(mockLoginRequest).not.toHaveBeenCalled();
  });

  // ── Auth error handling ─────────────────────────────────────────────────────

  it("shows the generic auth error message returned by a failed login", async () => {
    vi.mocked(mockLoginRequest).mockRejectedValue(
      new AuthApiError(401, "Invalid username/email or password."),
    );
    const user = userEvent.setup();
    renderLogin(["/login"]);

    await fillValidCredentials(user);
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() =>
      expect(screen.getByTestId("login-auth-error-banner")).toHaveTextContent(
        "Invalid username/email or password.",
      ),
    );
  });

  it("falls back to the generic message when login rejects with a non-AuthApiError error", async () => {
    vi.mocked(mockLoginRequest).mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderLogin(["/login"]);

    await fillValidCredentials(user);
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() =>
      expect(screen.getByTestId("login-auth-error-banner")).toHaveTextContent(
        "Invalid username/email or password.",
      ),
    );
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  it("shows a spinner and disables submit while the login request is pending", async () => {
    let resolveLogin!: (value: Awaited<ReturnType<typeof mockLoginRequest>>) => void;
    vi.mocked(mockLoginRequest).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );
    const user = userEvent.setup();
    renderLogin(["/login"]);

    await fillValidCredentials(user);
    await user.click(screen.getByTestId("login-submit-button"));

    expect(screen.getByTestId("login-loading-spinner")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toBeDisabled();

    await act(async () => {
      resolveLogin({
        token: "tok",
        username: "admin",
        fullName: "Alex Administrator",
        role: "admin",
        modules: [],
        actions: [],
      });
    });

    await waitFor(() => expect(screen.getByTestId("dashboard-page")).toBeInTheDocument());
  });

  // ── Redirect notice + successful navigation ──────────────────────────────────

  it("renders the redirect notice passed via router location state", () => {
    renderLogin([{ pathname: "/login", state: { notice: "Please sign in to continue." } }]);

    expect(screen.getByTestId("auth-redirect-notice")).toHaveTextContent(
      "Please sign in to continue.",
    );
  });

  it("navigates to /dashboard by default after a successful login", async () => {
    vi.mocked(mockLoginRequest).mockResolvedValue({
      token: "tok",
      username: "admin",
      fullName: "Alex Administrator",
      role: "admin",
      modules: ["patients"],
      actions: ["view"],
    });
    const user = userEvent.setup();
    renderLogin(["/login"]);

    await fillValidCredentials(user);
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => expect(screen.getByTestId("dashboard-page")).toBeInTheDocument());
  });

  it("navigates back to the originally requested route after a successful login", async () => {
    vi.mocked(mockLoginRequest).mockResolvedValue({
      token: "tok",
      username: "admin",
      fullName: "Alex Administrator",
      role: "admin",
      modules: [],
      actions: [],
    });
    const user = userEvent.setup();
    renderLogin([
      { pathname: "/login", state: { from: { pathname: "/dashboard/custom" } } },
    ]);

    await fillValidCredentials(user);
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => expect(screen.getByTestId("dashboard-custom-page")).toBeInTheDocument());
  });
});

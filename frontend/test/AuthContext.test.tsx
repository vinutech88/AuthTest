/**
 * Tests for AuthContext — login/logout state transitions, session persistence,
 * and hasModule/hasAction derivations.
 *
 * Source issue: #10 (User Story #1 — Login)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

vi.mock("../src/api/authClient", () => ({
  login: vi.fn(),
}));

import { login as mockLoginRequest } from "../src/api/authClient";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function sessionStorageHasSerializedUser(username: string): boolean {
  return Object.keys(sessionStorage).some((key) => {
    const raw = sessionStorage.getItem(key);
    return typeof raw === "string" && raw.includes(username);
  });
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("starts unauthenticated with no persisted session", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.hasModule("patients")).toBe(false);
    expect(result.current.hasAction("view")).toBe(false);
  });

  it("hydrates from an existing session-storage entry on mount", () => {
    sessionStorage.setItem(
      "authtest.session",
      JSON.stringify({
        token: "tok",
        username: "admin",
        fullName: "Alex Administrator",
        role: "admin",
        modules: ["patients"],
        actions: ["view"],
      }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe("admin");
    expect(result.current.hasModule("patients")).toBe(true);
  });

  it("ignores a corrupted session-storage entry and starts unauthenticated", () => {
    sessionStorage.setItem("authtest.session", "{not-json");

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("updates state and persists the session after a successful login", async () => {
    vi.mocked(mockLoginRequest).mockResolvedValue({
      token: "tok",
      username: "admin",
      fullName: "Alex Administrator",
      role: "admin",
      modules: ["patients", "reports"],
      actions: ["view", "edit"],
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login("admin", "Admin123!");
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe("admin");
    expect(result.current.hasModule("patients")).toBe(true);
    expect(result.current.hasModule("billing")).toBe(false);
    expect(result.current.hasAction("edit")).toBe(true);
    expect(result.current.hasAction("delete")).toBe(false);
    expect(sessionStorageHasSerializedUser("admin")).toBe(true);
  });

  it("propagates a login failure without changing authentication state", async () => {
    vi.mocked(mockLoginRequest).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.login("admin", "wrong");
      }),
    ).rejects.toThrow("boom");

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("clears state and persisted session on logout", async () => {
    vi.mocked(mockLoginRequest).mockResolvedValue({
      token: "tok",
      username: "admin",
      fullName: "Alex Administrator",
      role: "admin",
      modules: [],
      actions: [],
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("admin", "Admin123!");
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(sessionStorageHasSerializedUser("admin")).toBe(false);
  });

  it("throws a descriptive error when useAuth is used outside an AuthProvider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );

    consoleErrorSpy.mockRestore();
  });
});

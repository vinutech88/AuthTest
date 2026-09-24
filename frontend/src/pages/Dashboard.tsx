import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { performRestrictedAction, AuthApiError } from "../api/authClient";
import "./Dashboard.css";

const RESTRICTED_ACTION = "manage-users";

export function Dashboard() {
  const { user, logout, hasAction } = useAuth();
  const [permissionDenied, setPermissionDenied] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const canManageUsers = hasAction(RESTRICTED_ACTION);
  const token = user.token;

  async function handleRestrictedAction() {
    setPermissionDenied(null);
    try {
      await performRestrictedAction(token);
    } catch (error) {
      // Generic denial only — never leak internal authorization logic (REQ-6).
      const message =
        error instanceof AuthApiError
          ? error.message
          : "You do not have permission to perform this action.";
      setPermissionDenied(message);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Welcome, {user.fullName}</h1>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </div>

      <nav className="dashboard-nav" data-testid="dashboard-module-nav">
        {user.modules.map((moduleName) => (
          <a key={moduleName} href={`/modules/${moduleName}`}>
            {moduleName}
          </a>
        ))}
      </nav>

      <section className="dashboard-actions">
        <h2>Restricted Action</h2>
        <p>Manage staff user accounts (admin only).</p>
        {/* Hidden/disabled per RBAC at the UI level (REQ-5) — still rejected server-side either way. */}
        <button
          type="button"
          data-testid="action-restricted-button"
          disabled={!canManageUsers}
          onClick={handleRestrictedAction}
        >
          Manage Users
        </button>

        {permissionDenied && (
          <p className="dashboard-permission-denied" data-testid="permission-denied-message" role="alert">
            {permissionDenied}
          </p>
        )}
      </section>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthApiError } from "../api/authClient";
import "./Login.css";

interface FieldErrors {
  identifier?: string;
  password?: string;
}

const REQUIRED_FIELD_MESSAGE = "This field is required.";
const DEFAULT_REDIRECT_PATH = "/dashboard";

function getSafeRedirectPath(pathname?: string): string {
  if (pathname === DEFAULT_REDIRECT_PATH || pathname?.startsWith(`${DEFAULT_REDIRECT_PATH}/`)) {
    return pathname;
  }

  return DEFAULT_REDIRECT_PATH;
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectNotice = (location.state as { notice?: string } | null)?.notice;
  const redirectTo = getSafeRedirectPath(
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname,
  );

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (identifier.trim().length === 0) {
      errors.identifier = REQUIRED_FIELD_MESSAGE;
    }
    if (password.trim().length === 0) {
      errors.password = REQUIRED_FIELD_MESSAGE;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier, password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      // Always a single, generic message — never field-specific (REQ-3).
      const message =
        error instanceof AuthApiError ? error.message : "Invalid username/email or password.";
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">Welcome Back</h1>
        <p className="login-card__subtitle">Sign in to access your hospital management dashboard</p>

        {redirectNotice && (
          <div className="login-redirect-notice" data-testid="auth-redirect-notice" role="status">
            {redirectNotice}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="login-username">Username or Email</label>
            <input
              id="login-username"
              data-testid="login-username-input"
              type="text"
              autoComplete="username"
              value={identifier}
              aria-invalid={Boolean(fieldErrors.identifier)}
              onChange={(event) => setIdentifier(event.target.value)}
            />
            {fieldErrors.identifier && (
              <span className="login-field__error" data-testid="login-username-error">
                {fieldErrors.identifier}
              </span>
            )}
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              data-testid="login-password-input"
              type="password"
              autoComplete="current-password"
              value={password}
              aria-invalid={Boolean(fieldErrors.password)}
              onChange={(event) => setPassword(event.target.value)}
            />
            {fieldErrors.password && (
              <span className="login-field__error" data-testid="login-password-error">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {authError && (
            <div className="login-auth-error-banner" data-testid="login-auth-error-banner" role="alert">
              {authError}
            </div>
          )}

          <button
            type="submit"
            className="login-submit-button"
            data-testid="login-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting && <span className="login-spinner" data-testid="login-loading-spinner" />}
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <span className="login-forgot-password" aria-disabled="true">
          Forgot password?
        </span>

        <p className="login-footer">
          Your credentials are protected with industry-standard encryption. This system complies with
          hospital data-privacy and access-control policies.
        </p>
      </div>
    </div>
  );
}

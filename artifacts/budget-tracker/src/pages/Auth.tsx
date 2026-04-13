import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import spendlyLogo from "@/assets/spendly-logo.png";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type View = "login" | "register" | "forgot" | "forgot-sent";

interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}

function PasswordInput({ value, onChange, placeholder = "••••••••", required }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-input rounded-lg px-3 py-2.5 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function Auth() {
  const { login, register } = useAuth();
  const [view, setView] = useState<View>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = (nextView: View) => {
    setError("");
    setPassword("");
    setView(nextView);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setView("forgot-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={spendlyLogo} alt="Spendly" className="w-16 h-16 rounded-2xl object-cover mb-4 shadow-lg" />
          <h1 className="text-2xl font-bold text-foreground">Spendly</h1>
          <p className="text-sm text-muted-foreground mt-1">spending made friendly</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
          {(view === "login" || view === "register") && (
            <>
              <div className="flex border-b border-card-border">
                <button
                  onClick={() => reset("login")}
                  className={`flex-1 py-3.5 text-sm font-semibold transition ${view === "login" ? "text-primary border-b-2 border-primary -mb-px bg-card" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => reset("register")}
                  className={`flex-1 py-3.5 text-sm font-semibold transition ${view === "register" ? "text-primary border-b-2 border-primary -mb-px bg-card" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Create account
                </button>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                {view === "login" ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Password</label>
                        <button type="button" onClick={() => reset("forgot")} className="text-xs text-primary hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <PasswordInput value={password} onChange={setPassword} required />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 size={15} className="animate-spin" />}
                      {loading ? "Signing in..." : "Sign in"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Password <span className="text-muted-foreground/60">(min 6 characters)</span></label>
                      <PasswordInput value={password} onChange={setPassword} placeholder="Min. 6 characters" required />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 size={15} className="animate-spin" />}
                      {loading ? "Creating account..." : "Create account"}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          {view === "forgot" && (
            <div className="p-6">
              <button onClick={() => reset("login")} className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 transition">
                ← Back to sign in
              </button>
              <h2 className="text-lg font-semibold mb-1">Forgot your password?</h2>
              <p className="text-sm text-muted-foreground mb-5">Enter your email and we'll send you a reset link.</p>
              {error && (
                <div className="mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            </div>
          )}

          {view === "forgot-sent" && (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2">Check your inbox</h2>
              <p className="text-sm text-muted-foreground mb-5">
                If an account exists for <span className="font-medium text-foreground">{email}</span>, you'll receive a reset link shortly.
              </p>
              <button onClick={() => reset("login")} className="text-sm text-primary font-medium hover:underline">
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

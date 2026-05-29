import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bindUserSync } from "@/lib/forge-store";
import gainzLogo from "@/assets/gainz-logo.png";

type Mode = "welcome" | "login" | "signup";

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "Email o contraseña incorrectos.";
  if (m.includes("already registered") || m.includes("user already"))
    return "Este email ya está registrado. Iniciá sesión.";
  if (m.includes("password") && m.includes("6"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("rate limit")) return "Demasiados intentos. Esperá un momento.";
  if (m.includes("email") && m.includes("invalid"))
    return "El email no tiene un formato válido.";
  if (m.includes("pwned") || m.includes("compromised"))
    return "Esta contraseña apareció en filtraciones. Usá otra.";
  return msg;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("welcome");
  return (
    <div className="forge">
      <div className="app-shell">
        <div className="auth-wrap">
          {mode === "welcome" && <Welcome onPick={setMode} />}
          {mode === "login" && (
            <LoginForm onBack={() => setMode("welcome")} onSwap={() => setMode("signup")} />
          )}
          {mode === "signup" && (
            <SignupForm onBack={() => setMode("welcome")} onSwap={() => setMode("login")} />
          )}
        </div>
      </div>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <div className="auth-card">
      <img src={gainzLogo} alt="GainZ" className="brand-logo-lg" />
      <div className="auth-brand">GAINZ</div>
      <p className="auth-sub">Tu entrenador personal. Tu progreso, en cualquier dispositivo.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
        <button className="btn" onClick={() => onPick("login")}>Iniciar sesión</button>
        <button className="btnO" onClick={() => onPick("signup")}>Registrarse</button>
      </div>
    </div>
  );
}

function LoginForm({ onBack, onSwap }: { onBack: () => void; onSwap: () => void }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!EMAIL_RE.test(email)) {
      setErr("Email inválido.");
      return;
    }
    if (pwd.length < 6) {
      setErr("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pwd,
    });
    if (error) {
      setErr(friendlyError(error.message));
      setBusy(false);
      return;
    }
    if (data.user) {
      // Login → use cloud data (overwrites local view)
      await bindUserSync(data.user.id, { migrateLocalIfCloudEmpty: false });
    }
    setBusy(false);
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <button type="button" className="auth-back" onClick={onBack}>← Volver</button>
      <div className="auth-title">Iniciar sesión</div>

      <label className="auth-label">Email</label>
      <input
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        required
      />

      <label className="auth-label" style={{ marginTop: 12 }}>Contraseña</label>
      <input
        type="password"
        autoComplete="current-password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        placeholder="••••••"
        required
      />

      {err && <div className="auth-err">{err}</div>}

      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 18 }}>
        {busy ? "Ingresando…" : "Ingresar"}
      </button>

      <button type="button" className="auth-swap" onClick={onSwap}>
        ¿No tenés cuenta? <b>Registrate</b>
      </button>
    </form>
  );
}

function SignupForm({ onBack, onSwap }: { onBack: () => void; onSwap: () => void }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!EMAIL_RE.test(email)) {
      setErr("Email inválido.");
      return;
    }
    if (pwd.length < 6) {
      setErr("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (pwd !== pwd2) {
      setErr("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pwd,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) {
      setErr(friendlyError(error.message));
      setBusy(false);
      return;
    }
    if (data.user) {
      // Signup → migrate local state up to cloud on first save
      await bindUserSync(data.user.id, { migrateLocalIfCloudEmpty: true });
    }
    setBusy(false);
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <button type="button" className="auth-back" onClick={onBack}>← Volver</button>
      <div className="auth-title">Crear cuenta</div>

      <label className="auth-label">Email</label>
      <input
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        required
      />

      <label className="auth-label" style={{ marginTop: 12 }}>Contraseña</label>
      <input
        type="password"
        autoComplete="new-password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        placeholder="Mínimo 6 caracteres"
        minLength={6}
        required
      />

      <label className="auth-label" style={{ marginTop: 12 }}>Confirmar contraseña</label>
      <input
        type="password"
        autoComplete="new-password"
        value={pwd2}
        onChange={(e) => setPwd2(e.target.value)}
        placeholder="Repetí la contraseña"
        minLength={6}
        required
      />

      {err && <div className="auth-err">{err}</div>}

      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 18 }}>
        {busy ? "Creando cuenta…" : "Crear cuenta"}
      </button>

      <button type="button" className="auth-swap" onClick={onSwap}>
        ¿Ya tenés cuenta? <b>Ingresá</b>
      </button>
    </form>
  );
}
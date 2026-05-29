import { useEffect, useState } from "react";
import logo from "@/assets/gainz-logo.png";

// Chrome/Edge/Android beforeinstallprompt event
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPad on iOS 13+ reports MacIntel; detect touch.
  const iPadOS = /Macintosh/.test(ua) && "ontouchend" in document;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window.navigator as any).standalone) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    function onBIP(e: Event) {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
      setConfirmation("¡App agregada a tu pantalla de inicio! 🎉");
    }
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleClick() {
    if (installed) return;
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
          setConfirmation("¡App agregada a tu pantalla de inicio! 🎉");
        }
      } catch {
        /* user cancelled */
      } finally {
        setDeferred(null);
      }
      return;
    }
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }
    // Fallback for desktop / unsupported browsers
    setShowIOSGuide(true);
  }

  if (installed) {
    return (
      <div className="card" style={{ marginTop: 4 }}>
        <div className="h-section">ACCESO RÁPIDO</div>
        <div className="row" style={{ gap: 12, marginTop: 8 }}>
          <img src={logo} alt="GainZ" style={{ width: 40, height: 40, borderRadius: 10 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>App instalada</div>
            <div className="label-sm">Ya tenés GainZ en tu pantalla de inicio</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ marginTop: 4 }}>
        <div className="h-section">ACCESO RÁPIDO</div>
        <p className="label-sm" style={{ marginTop: 4, lineHeight: 1.5 }}>
          Instalá GainZ en tu celular para abrirla en un toque.
        </p>
        <button
          className="btn"
          style={{ marginTop: 12 }}
          onClick={handleClick}
          type="button"
        >
          ＋ Crear acceso rápido
        </button>
        {confirmation && (
          <div className="label-sm" style={{ marginTop: 10, color: "var(--grn)" }}>
            {confirmation}
          </div>
        )}
      </div>

      {showIOSGuide && (
        <div
          className="overlay"
          onClick={() => setShowIOSGuide(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 360, width: "100%", padding: 22 }}
          >
            <div style={{ textAlign: "center" }}>
              <img
                src={logo}
                alt="GainZ"
                style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto" }}
              />
              <div
                style={{
                  marginTop: 12,
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Agregar a inicio
              </div>
            </div>

            <ol
              style={{
                marginTop: 18,
                paddingLeft: 18,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <li>
                Tocá el ícono <b>Compartir</b> <span aria-hidden>⬆︎</span> en la barra del navegador.
              </li>
              <li>
                Elegí <b>“Agregar a pantalla de inicio”</b>.
              </li>
              <li>
                Confirmá tocando <b>“Agregar”</b>.
              </li>
            </ol>

            <button
              className="btn"
              style={{ marginTop: 18 }}
              onClick={() => setShowIOSGuide(false)}
              type="button"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
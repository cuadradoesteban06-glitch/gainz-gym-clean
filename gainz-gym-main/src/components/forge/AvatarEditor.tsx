import { useRef, useState } from "react";
import { setState, useForge } from "@/lib/forge-store";

/**
 * Crops the image to a centered square, resizes to `size` px, and exports
 * as a JPEG data URL (quality 0.85). Keeps payload small enough for
 * localStorage (~30-80 KB for 512px).
 */
async function fileToOptimizedDataUrl(file: File, size = 512): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("READ_ERROR"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("DECODE_ERROR"));
    i.src = dataUrl;
  });
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_ERROR");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; msg: string };

export function AvatarEditor({ name }: { name: string }) {
  const s = useForge();
  const photo = s.photo;
  const initials = (name || "?").trim().slice(0, 2).toUpperCase();

  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permitir re-seleccionar el mismo archivo
    if (!file) return;
    setMenuOpen(false);
    setStatus({ kind: "loading" });
    try {
      const url = await fileToOptimizedDataUrl(file, 512);
      setState((st) => ({ ...st, photo: url }));
      setStatus({ kind: "idle" });
    } catch (err) {
      const code = err instanceof Error ? err.message : "ERROR";
      const msgs: Record<string, string> = {
        INVALID_IMAGE: "Archivo inválido. Elegí una imagen.",
        READ_ERROR: "No se pudo leer el archivo.",
        DECODE_ERROR: "Formato de imagen no soportado.",
        CANVAS_ERROR: "No se pudo procesar la imagen.",
      };
      setStatus({ kind: "error", msg: msgs[code] || "Error inesperado." });
    }
  }

  function removePhoto() {
    setState((st) => ({ ...st, photo: null }));
    setMenuOpen(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Cambiar foto de perfil"
        className="avatar-btn"
      >
        <div className="avatar-frame">
          {photo ? (
            <img src={photo} alt="Foto de perfil" className="avatar-img" />
          ) : (
            <div className="avatar-fallback">
              <span>{initials}</span>
            </div>
          )}
          {status.kind === "loading" && (
            <div className="avatar-loading"><div className="spin" /></div>
          )}
        </div>
        <span className="avatar-edit-pill" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M14 6l4 4" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </span>
      </button>

      {status.kind === "error" && (
        <div className="avatar-err">{status.msg}</div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {menuOpen && (
        <div
          className="avatar-sheet-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setMenuOpen(false)}
        >
          <div className="avatar-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="avatar-sheet-title">FOTO DE PERFIL</div>
            <button className="btn" onClick={() => cameraRef.current?.click()}>
              📷 Tomar foto
            </button>
            <button className="btnO" onClick={() => galleryRef.current?.click()}>
              🖼 Elegir de la galería
            </button>
            {photo && (
              <button className="btnX" onClick={removePhoto} style={{ width: "100%" }}>
                Quitar foto
              </button>
            )}
            <button className="btnX" onClick={() => setMenuOpen(false)} style={{ width: "100%" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
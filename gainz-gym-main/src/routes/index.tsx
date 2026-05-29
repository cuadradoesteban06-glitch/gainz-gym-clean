import { createFileRoute } from "@tanstack/react-router";
import ForgeApp from "@/components/forge/ForgeApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GainZ — Tu entrenador personal" },
      { name: "description", content: "Entrená con rutinas personalizadas, subí de nivel y mantené tu racha. App de fitness para llevar siempre encima." },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#0F0F10" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "GainZ" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "GainZ" },
      { property: "og:description", content: "Rutinas personalizadas, XP y racha. Tu gimnasio en el bolsillo." },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/gainz-logo.png" },
      { rel: "icon", type: "image/png", href: "/gainz-logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Space+Mono:wght@400;700&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <ForgeApp />;
}

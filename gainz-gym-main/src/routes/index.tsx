import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <div style={{ padding: 40 }}>FUNCIONA GAINZ</div>;
}
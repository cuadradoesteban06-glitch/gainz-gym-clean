import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
      <Outlet />
    </div>
  );
}
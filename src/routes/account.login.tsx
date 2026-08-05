import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/account/login")({
  component: AccountLoginRedirect,
});

function AccountLoginRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/account", replace: true });
  }, [navigate]);

  return null;
}

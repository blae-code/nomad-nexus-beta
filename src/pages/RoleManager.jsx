import React, { useEffect } from "react";
import AdminConsolePage from "./AdminConsole";
import { useSearchParams } from "react-router-dom";

// Forward to AdminConsole with roles tab active
export default function RoleManagerPage() {
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    // This is just a thin wrapper for backward compatibility
  }, [setSearchParams]);

  // Render AdminConsole (will redirect attention to roles tab)
  return <AdminConsolePage initialTab="roles" />;
}
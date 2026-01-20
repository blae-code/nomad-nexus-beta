import React, { useEffect } from "react";
import AdminConsolePage from "./AdminConsole";

// Forward to AdminConsole with users tab active
export default function UserManagerPage() {
  useEffect(() => {
    // This is just a thin wrapper for backward compatibility
  }, []);

  return <AdminConsolePage initialTab="users" />;
}
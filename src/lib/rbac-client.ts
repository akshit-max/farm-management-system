"use client";

import { useSession } from "next-auth/react";

export function useRBAC() {
  const { data: session } = useSession();
  const role = session?.user?.role || "Worker";

  const isOwner = role === "Owner";
  const isManager = role === "Manager" || isOwner;
  const isAccountant = role === "Accountant" || isOwner;
  
  // Workers cannot mutate data (Create, Update, Delete)
  const canMutate = isManager;

  return {
    role,
    isOwner,
    isManager,
    isAccountant,
    canMutate,
  };
}

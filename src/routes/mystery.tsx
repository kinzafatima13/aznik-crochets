import { createFileRoute, redirect } from "@tanstack/react-router";
import { blankShopSearch } from "@/lib/shop/search";

export const Route = createFileRoute("/mystery")({
  beforeLoad: () => {
    throw redirect({ to: "/shop", search: { ...blankShopSearch, collection: "mystery" } });
  },
});

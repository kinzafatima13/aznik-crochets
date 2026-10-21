import { createFileRoute } from "@tanstack/react-router";
import { ProductForm, blankProduct } from "@/components/admin/product-form";

export const Route = createFileRoute("/admin/products/new")({
  component: () => (
    <div>
      <h1 className="mb-4 font-display text-4xl">New piece</h1>
      <ProductForm initial={blankProduct} />
    </div>
  ),
});

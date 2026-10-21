import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProductForm, blankProduct } from "@/components/admin/product-form";
import { adminProducts } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/products/$id")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const [initial, setInitial] = useState<typeof blankProduct | null>(null);
  useEffect(() => {
    adminProducts().then((rows) => {
      const product = rows.find((row) => row.id === id);
      if (!product) return;
      setInitial({
        ...blankProduct,
        ...product,
        status: product.status as "published" | "draft" | "archived",
        materialCostPkr: product.materialCostPkr ?? 0,
      });
    });
  }, [id]);
  if (!initial) return <p>Finding that piece…</p>;
  return (
    <div>
      <h1 className="mb-4 font-display text-4xl">Edit {initial.name}</h1>
      <ProductForm initial={initial} />
    </div>
  );
}

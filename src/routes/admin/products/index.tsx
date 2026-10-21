import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Price } from "@/components/site/ui";
import { adminProducts } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/products/")({
  component: ProductsPage,
});

function ProductsPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminProducts>>>([]);
  useEffect(() => {
    adminProducts().then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Products</h1>
        <Link to="/admin/products/new"><Button>New piece</Button></Link>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((product) => (
          <li key={product.id} className="flex items-center gap-3 py-3">
            <img src={product.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <Link to="/admin/products/$id" params={{ id: product.id }} className="font-medium">{product.name}</Link>
              <p className="text-xs text-muted">{product.status} · {product.trackStock ? `${product.stock} in stock` : "made to order"}</p>
            </div>
            <Price value={product.pricePkr} />
          </li>
        ))}
      </ul>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminProducts, removeProduct, updateStockPrice } from "@/lib/shop/server";

export const Route = createFileRoute("/admin/products/")({
  component: ProductsPage,
});

function ProductsPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminProducts>>>([]);
  const [drafts, setDrafts] = useState<Record<string, { price: string; stock: string }>>({});
  function load() {
    adminProducts()
      .then((next) => {
        setRows(next);
        setDrafts(Object.fromEntries(next.map((product) => [product.id, { price: String(product.pricePkr), stock: String(product.stock) }])));
      })
      .catch(() => setRows([]));
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-[1.35rem] font-semibold">Products</h1>
        <Link to="/admin/products/new" className="rounded-lg bg-[#202223] px-3 py-2 text-sm text-white">Add product</Link>
      </div>
      <p className="mt-1 text-sm text-[#6d7175]">Change the price or stock, then save. Remove takes the piece off the shop. Open a row to edit the full description.</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#e3e3e3] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-[#e3e3e3] text-[#6d7175]">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Price (Rs.)</th>
                <th className="px-3 py-2 font-medium">Stock</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id} className="border-b border-[#f1f1f1]">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <div>
                        <Link to="/admin/products/$id" params={{ id: product.id }} className="font-medium text-[#2c6ecb]">{product.name}</Link>
                        <p className="text-xs text-[#6d7175]">{product.status}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      className="h-9 w-28 rounded-lg border border-[#c9cccf] px-2"
                      value={drafts[product.id]?.price ?? ""}
                      onChange={(event) => setDrafts({ ...drafts, [product.id]: { price: event.target.value, stock: drafts[product.id]?.stock ?? "0" } })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      className="h-9 w-24 rounded-lg border border-[#c9cccf] px-2"
                      value={drafts[product.id]?.stock ?? ""}
                      onChange={(event) => setDrafts({ ...drafts, [product.id]: { price: drafts[product.id]?.price ?? "0", stock: event.target.value } })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="h-9 rounded-lg bg-[#202223] px-3 text-white"
                        onClick={() => {
                          const draft = drafts[product.id];
                          updateStockPrice({ data: { id: product.id, pricePkr: Number(draft?.price), stock: Number(draft?.stock) } })
                            .then(() => toast.success(`${product.name} updated`))
                            .catch((error: Error) => toast.error(error.message));
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="h-9 rounded-lg border border-[#c9cccf] px-3"
                        onClick={() => {
                          if (!confirm(`Remove ${product.name} from the shop?`)) return;
                          removeProduct({ data: { id: product.id } })
                            .then(() => {
                              toast.success("Removed");
                              load();
                            })
                            .catch((error: Error) => toast.error(error.message));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

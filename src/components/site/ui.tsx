import { Link } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { pkr } from "@/lib/shop/format";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="currentColor" opacity="0.12" />
      <path
        d="M9.5 19.5c1.8 3.2 8.2 4.4 11.4-.4 1.4-2.2-1.2-3.6-2.6-1.8-1.2 1.6 1.6 2.8 3.4 1.2 2.2-2 1.2-6.2-1.8-8.2-3.6-2.4-8 .2-9.2 3.2-1.4 3.4 1.4 5.6 4.2 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2 text-ink">
      <Mark className="h-9 w-9 text-berry" />
      <span className="leading-none">
        <span className="block font-display text-2xl italic">Aznik</span>
        <span className="block text-xs uppercase tracking-widest text-cocoa">Crochets</span>
      </span>
    </Link>
  );
}

const buttonStyles = {
  primary: "bg-berry text-paper hover:bg-berry-deep",
  ghost: "border border-line bg-paper text-ink hover:border-berry",
  soft: "bg-blush text-ink hover:bg-lilac",
  sage: "bg-sage-deep text-paper hover:bg-sage",
} as const;

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition disabled:opacity-50",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm text-cocoa">
      {label}
      <input
        {...props}
        className={cn(
          "mt-1 w-full min-h-11 rounded-2xl border border-line bg-paper px-3 text-ink outline-none ring-berry focus:ring-2",
          className,
        )}
      />
    </label>
  );
}

export function Area({ label, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block text-sm text-cocoa">
      {label}
      <textarea
        {...props}
        className={cn(
          "mt-1 min-h-28 w-full rounded-2xl border border-line bg-paper px-3 py-2 text-ink outline-none ring-berry focus:ring-2",
          className,
        )}
      />
    </label>
  );
}

export function Price({ value, className }: { value: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{pkr(value)}</span>;
}

export function ProductCard({
  product,
}: {
  product: { id: string; name: string; pricePkr: number; image: string; categoryId?: string; mystery?: boolean };
}) {
  return (
    <Link to="/shop/$slug" params={{ slug: product.id }} className="group block">
      <div className="overflow-hidden rounded-3xl bg-paper shadow-soft">
        <img
          src={product.image}
          alt={product.name}
          className="aspect-square w-full object-cover motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-105"
        />
      </div>
      {product.mystery ? <p className="mt-3 text-xs uppercase tracking-widest text-berry">Mystery gift · contents secret</p> : null}
      <div className="mt-3 flex items-start justify-between gap-3">
        <p className="font-display text-xl leading-tight">{product.name}</p>
        <Price value={product.pricePkr} className="shrink-0 text-sm" />
      </div>
    </Link>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-3xl bg-paper p-5 shadow-soft sm:p-8", className)}>{children}</section>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-paper px-6 py-12 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-cocoa">{body}</p>
    </div>
  );
}

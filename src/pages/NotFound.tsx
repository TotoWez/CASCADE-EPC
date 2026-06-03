import { Link } from "react-router-dom";
import { Brand } from "@/components/Brand";

export function NotFound() {
  return (
    <div className="grid min-h-full place-items-center bg-canvas bg-engineering px-4 text-center">
      <div>
        <Brand size={36} className="justify-center" />
        <p className="mt-8 font-brand text-6xl tracking-widest text-brand-blue">
          404
        </p>
        <p className="mt-2 text-ink-dim">This node has no path in the tree.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded bg-brand-blue px-4 py-2 font-mono text-2xs uppercase tracking-widest text-white hover:bg-brand-blue-dark"
        >
          Back to start
        </Link>
      </div>
    </div>
  );
}

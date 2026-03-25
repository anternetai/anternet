import Link from "next/link";

export function FooterMarketing() {
  return (
    <footer className="border-t border-white/5 bg-[#050505]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-white">
              HomeField{" "}
              <span className="text-orange-500">Hub</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              AI Lead Generation for Home Service Contractors
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/credentials"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Credentials
            </Link>
            <Link
              href="/call"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Book a Call
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-zinc-600">
            © 2026 HomeField Hub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

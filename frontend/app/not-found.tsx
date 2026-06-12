import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-3 mb-12">
        <img
          src="/ra-logo.png"
          alt=""
          className="w-9 h-9 flex-shrink-0"
          style={{ filter: "drop-shadow(0 4px 14px rgba(124,58,237,0.25))" }}
        />
        <span className="text-xl font-extrabold text-brand-900 tracking-tight">ReachAudit</span>
      </Link>

      <div className="text-center max-w-md">
        <p className="text-8xl font-extrabold text-brand-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-brand-900 mb-3">This page doesn&apos;t exist.</h1>
        <p className="text-gray-500 mb-8">
          The link may be broken or the page may have moved. Head back and scan your contacts instead.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/app?demo=true"
            className="btn-primary px-6 py-3 text-sm font-semibold rounded-xl"
          >
            Try the Live Demo
          </Link>
          <Link
            href="/"
            className="btn-secondary px-6 py-3 text-sm font-semibold rounded-xl"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

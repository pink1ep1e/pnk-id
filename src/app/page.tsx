import { Logo } from "@/components/logo";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#0c0d10] text-white flex flex-col">
      <header className="pt-8 md:pt-10 pb-6 flex justify-center px-4">
        <Logo priority href="/" />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <h1 className="sr-only">pnk ID</h1>
        <p className="text-[16px] md:text-[18px] text-white/50 text-center max-w-md font-[family-name:var(--font-manrope)] leading-relaxed">
          Единый аккаунт для почты и других сервисов pnk. Безопасный вход,
          QR-код и подключение приложений.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/login"
            className="h-12 px-6 rounded-[12px] bg-[#0066ff] hover:bg-[#0052cc] font-semibold font-[family-name:var(--font-manrope)] inline-flex items-center transition-colors"
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="h-12 px-6 rounded-[12px] bg-[#1a1c22] font-[family-name:var(--font-manrope)] inline-flex items-center hover:bg-[#22252c] transition-colors"
          >
            Создать ID
          </Link>
        </div>
      </main>
      <footer className="px-5 py-8 text-center text-[13px] text-white/35 font-[family-name:var(--font-manrope)]">
        © {new Date().getFullYear()} pnk ·{""}
        <Link href="/legal/terms" className="hover:text-white/60">
          Условия
        </Link>
      </footer>
    </div>
  );
}

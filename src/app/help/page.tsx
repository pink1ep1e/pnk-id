import { Logo } from "@/components/logo";
import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="min-h-dvh bg-[#0c0d10] text-white">
      <header className="px-4 py-4 flex items-center justify-between max-w-[800px] mx-auto">
        <Logo href="/" className="w-[96px]" />
        <Link href="/login" className="text-sm text-white/45 hover:text-white">
          Войти
        </Link>
      </header>
      <main className="max-w-[800px] mx-auto px-4 py-10">
        <h1 className="text-[28px] font-semibold font-[family-name:var(--font-unbounded)]">
          Справка pnk ID
        </h1>
        <div className="mt-6 space-y-4 text-[15px] text-white/60 font-[family-name:var(--font-manrope)] leading-relaxed">
          <p>
            pnk ID — единый аккаунт для входа в сервисы pnk. Можно войти по
            логину и паролю или подтвердить QR на другом устройстве.
          </p>
          <p>
            Если забыли пароль — восстановите доступ через телефон, указанный
            при регистрации, или напишите в поддержку.
          </p>
          <p>
            Поддержка:{""}
            <span className="text-[#4d9fff]">support@pnkmail.ru</span>
          </p>
        </div>
      </main>
    </div>
  );
}

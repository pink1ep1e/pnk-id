import { Logo } from "@/components/logo";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[#0c0d10] text-white">
      <header className="px-4 py-4 flex items-center justify-between max-w-[800px] mx-auto">
        <Logo href="/" className="w-[96px]" />
        <Link
          href="/register"
          className="text-sm text-white/45 hover:text-white"
        >
          Регистрация
        </Link>
      </header>
      <main className="max-w-[800px] mx-auto px-4 py-10">
        <h1 className="text-[28px] font-semibold font-[family-name:var(--font-unbounded)]">
          Условия использования pnk ID
        </h1>
        <div className="mt-6 space-y-4 text-[15px] text-white/60 font-[family-name:var(--font-manrope)] leading-relaxed">
          <p>
            Используя pnk ID, вы соглашаетесь на создание учётной записи и
            обработку данных, необходимых для входа и подключения сервисов pnk.
          </p>
          <p>
            Вы несёте ответственность за сохранность пароля и подтверждение
            входов по QR. Сторонним приложениям доступ выдаётся только с вашего
            согласия и может быть отозван в кабинете.
          </p>
        </div>
      </main>
    </div>
  );
}

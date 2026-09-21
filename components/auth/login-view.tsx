"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useI18n } from "@/components/i18n/i18n-provider"
import { LoginRobotBackdrop } from "@/components/auth/login-robot-backdrop"
import { SignupTermsAgreement, type SignupTermsDoc } from "@/components/auth/signup-terms-agreement"
import { LoginButtons } from "@/app/(public)/(auth)/login/login-buttons"
import {
  serializeSignupConsent,
  SIGNUP_CONSENT_COOKIE,
  SIGNUP_CONSENT_MAX_AGE_SECONDS,
} from "@/lib/terms/signup-consent"
import { cn } from "@/lib/utils"
import type { TermsSlug } from "@/types/terms"

type Mode = "login" | "signup"

export function LoginView({ error, termsDocs }: { error?: string; termsDocs: SignupTermsDoc[] }) {
  const { t } = useI18n()
  // 탭의 기준은 주소(?mode=signup)다. 헤더의 로그인·회원가입 버튼은 이 주소로 이동하므로,
  // 이미 이 화면에 있어도 주소가 바뀌면 탭이 따라 바뀐다.
  const urlMode: Mode = useSearchParams().get("mode") === "signup" ? "signup" : "login"
  const [mode, setMode] = useState<Mode>(urlMode)

  useEffect(() => {
    setMode(urlMode)
  }, [urlMode])

  // 탭을 직접 눌렀을 때는 바로 바꾸고, 주소도 같이 맞춘다(새로고침·공유·헤더 버튼과 어긋나지 않게).
  function switchMode(next: Mode) {
    setMode(next)
    const url = new URL(window.location.href)
    if (next === "signup") url.searchParams.set("mode", "signup")
    else url.searchParams.delete("mode")
    window.history.replaceState(null, "", `${url.pathname}${url.search}`)
  }
  const [checked, setChecked] = useState<Record<TermsSlug, boolean>>({ terms: false, privacy: false })

  const signup = mode === "signup"
  const agreed = termsDocs.every((doc) => checked[doc.slug])

  // Google 로 넘어가기 직전에, 어느 버전의 약관에 체크했는지를 짧은 쿠키로 남긴다.
  // 돌아온 콜백이 이걸 보고 약관 화면 없이 동의를 바로 기록한다.
  function rememberConsent() {
    const versions = Object.fromEntries(termsDocs.map((doc) => [doc.slug, doc.version])) as Record<TermsSlug, number>
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${SIGNUP_CONSENT_COOKIE}=${serializeSignupConsent(versions)}; path=/; max-age=${SIGNUP_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
  }

  return (
    <main id="main-content" tabIndex={-1} className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col overflow-hidden focus:outline-none">
      <LoginRobotBackdrop />

      {/* 모바일: 하단 카피. md+: 좌측 하단 카드, 캐릭터는 우측 */}
      <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-end px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 md:px-10 md:pb-20 md:pt-10">
        <div
          data-login-card
          className="pointer-events-auto w-full max-w-md space-y-5 rounded-2xl bg-[#fff8e8]/[0.55] p-6 shadow-[0_24px_60px_-28px_rgba(26,21,18,0.45)] ring-1 ring-[#6b4f3a]/10 backdrop-blur-xl dark:bg-[#241c16]/[0.6] dark:ring-[#c4a574]/15 dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] md:space-y-6 md:p-8"
        >
          <div
            role="tablist"
            aria-label={t("auth.tabsAria")}
            className="grid grid-cols-2 rounded-full bg-[#6b4f3a]/10 p-1 text-sm font-semibold dark:bg-white/[0.06]"
          >
            {(["login", "signup"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`auth-tab-${value}`}
                aria-selected={mode === value}
                aria-controls="auth-panel"
                onClick={() => switchMode(value)}
                className={cn(
                  "rounded-full px-4 py-2 transition-colors",
                  mode === value
                    ? "bg-[#fff8e8] text-[#1a1614] shadow-sm dark:bg-[#c4a574] dark:text-[#1a1614]"
                    : "text-[#5c4a3a] hover:text-[#1a1614] dark:text-[#d7c4a6] dark:hover:text-white"
                )}
              >
                {value === "login" ? t("auth.tabLogin") : t("auth.tabSignup")}
              </button>
            ))}
          </div>

          <div id="auth-panel" role="tabpanel" aria-labelledby={`auth-tab-${mode}`} className="space-y-5 md:space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b4f3a] dark:text-[#c4a574]">
                DevDeck
              </p>
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-[#1a1614] dark:text-[#f6f1e9] md:text-5xl">
                {signup ? t("auth.signupTitle") : t("auth.title")}
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-[#5c4a3a] dark:text-[#d7c4a6]">
                {signup ? t("auth.signupLede") : t("auth.lede")}
              </p>
            </div>

            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}

            {signup ? (
              <>
                <SignupTermsAgreement docs={termsDocs} checked={checked} onChange={setChecked} />
                <div className="space-y-2">
                  <LoginButtons label={t("auth.signupWithGoogle")} disabled={!agreed} beforeSignIn={rememberConsent} />
                  {!agreed ? (
                    <p className="text-center text-xs text-[#5c4a3a] dark:text-[#d7c4a6]">{t("auth.signupNeedAgree")}</p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <LoginButtons label={t("auth.loginWithGoogle")} />
                <p className="text-center text-xs text-[#5c4a3a] dark:text-[#d7c4a6]">{t("auth.firstTimeNote")}</p>
              </div>
            )}

            <p className="text-center text-sm text-[#5c4a3a] dark:text-[#d7c4a6]">
              {signup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
              <button
                type="button"
                onClick={() => switchMode(signup ? "login" : "signup")}
                className="font-semibold text-[#6b4f3a] underline underline-offset-2 hover:text-[#1a1614] dark:text-[#c4a574] dark:hover:text-white"
              >
                {signup ? t("auth.tabLogin") : t("auth.tabSignup")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

import { LoginView } from "@/components/auth/login-view"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return <LoginView error={searchParams.error} />
}

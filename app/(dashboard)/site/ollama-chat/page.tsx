import { OllamaChatPanel } from "@/app/(dashboard)/site/ollama-chat/ollama-chat-panel"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { requireOwner } from "@/lib/auth/owner"
import { getOllamaConnection, listOllamaModels } from "@/lib/ollama/client"

// 로컬에 설치된 두 모델을 기본값으로 보여 준다 — Ollama가 꺼져 있어도 화면은 뜨고,
// 실제 호출은 안내 메시지로 실패한다(actions.ts -> chatWithOllama).
const FALLBACK_MODELS = ["qwen2.5-coder:3b", "exaone3.5:2.4b"]

export default async function OllamaChatPage() {
  await requireOwner()
  const [models, connection] = await Promise.all([listOllamaModels(), getOllamaConnection()])

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title="로컬 LLM 테스트"
        description="Ollama 모델과 직접 대화해서 응답 품질·속도를 확인합니다. 대화는 저장되지 않습니다. 이 맥에서는 localhost로, Vercel에서는 사이트 설정의 터널 주소로 붙습니다."
      />
      <OllamaChatPanel
        models={models.ok && models.data.length > 0 ? models.data : FALLBACK_MODELS}
        ollamaOffline={!models.ok}
        ollamaHost={connection.host}
        ollamaSource={connection.source}
        ollamaError={!models.ok ? models.error : null}
      />
    </div>
  )
}

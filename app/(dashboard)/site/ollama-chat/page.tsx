import { OllamaChatPanel } from "@/app/(dashboard)/site/ollama-chat/ollama-chat-panel"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { requireOwner } from "@/lib/auth/owner"
import { listOllamaModels } from "@/lib/ollama/client"

// 로컬에 설치된 두 모델을 기본값으로 보여 준다 — Ollama가 꺼져 있어도 화면은 뜨고,
// 실제 호출은 안내 메시지로 실패한다(actions.ts -> chatWithOllama).
const FALLBACK_MODELS = ["qwen2.5-coder:3b", "exaone3.5:2.4b"]

export default async function OllamaChatPage() {
  await requireOwner()
  const models = await listOllamaModels()

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title="로컬 LLM 테스트"
        description="이 머신에 설치된 Ollama 모델과 직접 대화해서 응답 품질·속도를 확인합니다. 대화 내용은 저장되지 않고 화면을 벗어나면 사라집니다."
      />
      <OllamaChatPanel
        models={models.ok && models.data.length > 0 ? models.data : FALLBACK_MODELS}
        ollamaOffline={!models.ok}
      />
    </div>
  )
}

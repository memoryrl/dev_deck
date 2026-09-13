import { Briefcase, Gamepad2, Sparkles } from "lucide-react"

const cards = [
  { title: "PromptKit", icon: Sparkles, rotate: "-rotate-[14deg] translate-y-6", tint: "from-[hsl(var(--lux-champagne)/0.42)]" },
  { title: "CareerLog", icon: Briefcase, rotate: "-rotate-[5deg] translate-y-2", tint: "from-[hsl(var(--lux-cognac)/0.32)]" },
  { title: "Steam", icon: Gamepad2, rotate: "rotate-[7deg] -translate-y-1", tint: "from-[hsl(var(--lux-espresso)/0.28)]" },
]

export function HeroVisual() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[18rem] md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[min(52%,38rem)]">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-70 dark:opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 80% 70%, hsl(var(--lux-champagne) / 0.38), transparent 52%), radial-gradient(ellipse at 90% 100%, hsl(var(--lux-cognac) / 0.2), transparent 48%), radial-gradient(ellipse at 60% 90%, hsl(var(--lux-sand) / 0.85), transparent 55%)",
          WebkitMaskImage:
            "linear-gradient(to left, black 28%, transparent 92%), linear-gradient(to top, black 35%, transparent 90%)",
          maskImage:
            "linear-gradient(to left, black 28%, transparent 92%), linear-gradient(to top, black 35%, transparent 90%)",
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      />
      <div className="absolute bottom-6 right-4 flex h-48 w-[16.5rem] items-end justify-center sm:right-8 md:bottom-16 md:h-64 md:w-[20rem]">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className={`absolute h-36 w-28 rounded-2xl bg-gradient-to-br ${card.tint} to-background/80 shadow-[0_18px_40px_-18px_hsl(var(--foreground)/0.35)] ring-1 ring-foreground/10 backdrop-blur-md md:h-44 md:w-32 ${card.rotate}`}
            >
              <div className="flex h-full flex-col justify-between p-3.5">
                <Icon className="size-4 text-foreground/70" />
                <p className="font-display text-xs font-bold tracking-tight">{card.title}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

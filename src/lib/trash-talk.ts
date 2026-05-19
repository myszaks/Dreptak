/**
 * Trash talk generator - humorous, non-toxic, Polish-language comments
 */

interface TrashTalkContext {
  username: string
  stepCount?: number
  rank?: number
  totalParticipants?: number
  isLoser?: boolean
  isWinner?: boolean
  rankChange?: number // positive = climbed, negative = dropped
}

const LOSER_TEMPLATES = [
  '{name} zrobił/a dziś mniej kroków niż przeciętny golden retriever. 🐕',
  '{name} chyba teleportował/a się dziś tylko do lodówki. 🧊',
  '{name} aktywność dzisiejsza: kliknięcie "Śpij dalej" na budziku. ⏰',
  '{name} krokomierz dzisiaj był w trybie hibernacji. 💤',
  '{name} auto chyba zagubiło klucze do piwnicy... czyli brak kroków. 🔑',
  'Hej {name}, lodówka też się liczy jako cel podróży, tak? 🤷',
  '{name} spacer do kibla to nie jest wyzwanie fitness. 🚽',
  '{name} nawet Tortulak z Looney Tunes by dzisiaj wygrał. 🐢',
  'Aktywność {name}: zmienianie kanałów pilotem. 📺',
  '{name} próbował/a zliczyć kroki mrugając oczami. 👀',
]

const WINNER_TEMPLATES = [
  '{name} jest dziś absolutnym królem/królową krokomierza! 👑',
  '{name} walking simulator level: LEGEND. 🏆',
  '{name} ma więcej kroków niż wszyscy razem wzięci. Szacun! 💪',
  'Ktoś mówił {name} żeby się zatrzymał/a? Bo nie posłuchał/a! 🚀',
  '{name} dziś zamienił/a buty w rakiety. 🔥',
  '{name} z takim wynikiem mógłby/mogłaby obejść Polskę w pół roku. 🗺️',
]

const OVERTAKING_TEMPLATES = [
  '{name} właśnie przegonił/a {target}. Tak to się robi! 📈',
  'ALERT: {name} awansował/a i tepcze po piętach {target}! 👟',
  '{name} wskoczył/a na podium. {target} - lepiej zacznij chodzić! ⚡',
]

const LOW_STEPS_TEMPLATES = [
  'Tylko {steps} kroków? {name}, poważnie? 😂',
  '{steps} kroków - {name} chyba zapomniał/a wstać. 😴',
  '{name} ze {steps} krokami jest dowodem że teleportacja istnieje. 🌀',
  'Hej {name}, {steps} kroków to nawet nie lodówka i z powrotem. 🙈',
]

const PODIUM_CLOSE_TEMPLATES = [
  '{name} brakuje tylko {diff} kroków do podium! Wstawaj z kanapy! 🛋️',
  'Prawie podium dla {name}! Tylko {diff} kroków różnicy. Mała przebieżka? 🏃',
]

const JANUSZ_MODE_TEMPLATES = [
  'JANUSZ MODE ACTIVATED. {name} będzie żałował/a. 😈',
  '{name} zajął/a ostatnie miejsce. Kara czeka... 💀',
  'Gratulacje {name} - zdobyłeś/aś tytuł Janusza challange\'u! 🏅',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? key))
}

export function generateTrashTalk(ctx: TrashTalkContext): string {
  const name = ctx.username

  if (ctx.isWinner) {
    return fill(pickRandom(WINNER_TEMPLATES), { name })
  }

  if (ctx.isLoser) {
    return fill(pickRandom(JANUSZ_MODE_TEMPLATES), { name })
  }

  if (ctx.rankChange !== undefined && ctx.rankChange > 0 && ctx.rank && ctx.totalParticipants) {
    const target = `#${ctx.rank + 1}`
    return fill(pickRandom(OVERTAKING_TEMPLATES), { name, target })
  }

  if (ctx.stepCount !== undefined && ctx.stepCount < 2000) {
    return fill(pickRandom(LOW_STEPS_TEMPLATES), {
      name,
      steps: ctx.stepCount.toLocaleString('pl-PL'),
    })
  }

  if (ctx.rank !== undefined && ctx.rank > 3) {
    return fill(pickRandom(LOSER_TEMPLATES), { name })
  }

  return fill(pickRandom(WINNER_TEMPLATES), { name })
}

export function generatePodiumCloseMessage(username: string, stepsDiff: number): string {
  return fill(pickRandom(PODIUM_CLOSE_TEMPLATES), {
    name: username,
    diff: stepsDiff.toLocaleString('pl-PL'),
  })
}

export function generateOvertakenMessage(overtaker: string): string {
  return `${overtaker} właśnie Cię wyprzedził/a! Czas na kontratak! 🔥`
}

export function generateDailyRoast(
  entries: Array<{ username: string; stepCount: number }>,
  totalParticipants: number
): string[] {
  return entries.map((e, i) => {
    const rank = i + 1
    return generateTrashTalk({
      username: e.username,
      stepCount: e.stepCount,
      rank,
      totalParticipants,
      isWinner: rank === 1,
      isLoser: rank === totalParticipants,
    })
  })
}

// Janusz punishment generator
const PUNISHMENTS = [
  'Kupuje kebsa zwycięzcy 🥙',
  'Stawia kawę całej grupie ☕',
  'Wrzuca cringe selfie na grupkę 🤳',
  'Myje auto zwycięzcy 🚗',
  'Gotuje obiad dla całej grupy 🍳',
  'Robi 100 pompek na żywo 💪',
  'Śpiewa karaoke na następnym spotkaniu 🎤',
  'Płaci za pizzę na game night 🍕',
  'Przez tydzień jest dostępny 24/7 jako chłopiec na posyłki 📦',
  'Tańczy TikToka i wysyła na grupkę 💃',
]

export function getRandomPunishment(): string {
  return pickRandom(PUNISHMENTS)
}

export function getThreePunishments(): string[] {
  const shuffled = [...PUNISHMENTS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

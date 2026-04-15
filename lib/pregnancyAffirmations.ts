// lib/pregnancyAffirmations.ts
// 42 daily affirmations — keyed by dayOfYear % 42

export const pregnancyAffirmations: string[] = [
  "Your body knows exactly what to do. Trust it completely.",
  "Every day you are growing a miracle. You are extraordinary.",
  "You are stronger than you know and braver than you feel.",
  "Your baby feels your love with every heartbeat.",
  "Rest is productive. Nourishing yourself nourishes your baby.",
  "You were made for this. Your instincts are wise.",
  "A short walk can do wonders for your mood and circulation.",
  "Your emotions are valid. Growing life is hard and beautiful work.",
  "You are not alone on this journey. You are held and supported.",
  "Every ache and change is your body doing its incredible work.",
  "The love you already feel for your baby is real and powerful.",
  "Your body has built a human from scratch. That is extraordinary.",
  "Be gentle with yourself today. You are doing enough.",
  "You are exactly where you are supposed to be right now.",
  "Your baby hears your voice and finds comfort in it.",
  "Fear is natural. Courage is feeling it and moving forward anyway.",
  "This pregnancy is uniquely yours — there is no comparison.",
  "You are preparing a safe world for someone who will love you unconditionally.",
  "Take a deep breath. You and your baby are okay.",
  "Your body is strong, capable, and designed for this.",
  "Every craving, every kick, every sleepless night is part of the story.",
  "You are becoming someone's whole world.",
  "Trust the process. Your body and your baby are in sync.",
  "The way you love your baby already says everything about who you are.",
  "Nourish yourself as lovingly as you nourish your baby.",
  "You don't need to be perfect — your baby just needs you.",
  "Growth happens slowly, then all at once. You are growing too.",
  "Your strength has always been there. Pregnancy is revealing it.",
  "Today, let yourself feel joy about what is coming.",
  "You are writing the first chapter of someone's lifelong story.",
  "Your intuition about your pregnancy matters. Listen to it.",
  "The discomfort is temporary. The love is forever.",
  "You are held in the hands of every woman who came before you.",
  "Your baby is already learning from your calmness and your courage.",
  "Something beautiful is happening inside you right now.",
  "You deserve support, rest, and kindness — especially from yourself.",
  "Every kick is your baby saying 'I'm here, I'm growing, I'm yours.'",
  "The uncertainty is hard. Your love through it is the constant.",
  "You are not just having a baby — you are becoming a mother.",
  "What a privilege it is, to be the first home your child ever knows.",
  "Today is a good day to be gentle with your body and your heart.",
  "You are doing the most important thing there is.",
]

export function getDailyAffirmation(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return pregnancyAffirmations[dayOfYear % pregnancyAffirmations.length]
}

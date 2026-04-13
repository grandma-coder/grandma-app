/**
 * Baby & Toddler Food Calorie Reference
 *
 * Approximate calories per typical serving for common kid foods.
 * Used for live estimation as caregivers type what the child ate.
 */

interface FoodEntry {
  name: string
  aliases: string[]       // alternative names / spellings
  calsPer100g: number     // kcal per 100g
  typicalServingG: number // typical toddler serving in grams
  category: 'fruit' | 'vegetable' | 'grain' | 'protein' | 'dairy' | 'drink' | 'snack' | 'mixed'
}

const FOOD_DB: FoodEntry[] = [
  // ── Fruits ──
  { name: 'banana', aliases: ['bananas', 'nana'], calsPer100g: 89, typicalServingG: 60, category: 'fruit' },
  { name: 'apple', aliases: ['apples', 'apple sauce', 'applesauce'], calsPer100g: 52, typicalServingG: 60, category: 'fruit' },
  { name: 'strawberry', aliases: ['strawberries', 'morango'], calsPer100g: 32, typicalServingG: 50, category: 'fruit' },
  { name: 'blueberry', aliases: ['blueberries', 'mirtilo'], calsPer100g: 57, typicalServingG: 40, category: 'fruit' },
  { name: 'mango', aliases: ['mangos', 'manga'], calsPer100g: 60, typicalServingG: 60, category: 'fruit' },
  { name: 'avocado', aliases: ['abacate'], calsPer100g: 160, typicalServingG: 40, category: 'fruit' },
  { name: 'pear', aliases: ['pears', 'pera'], calsPer100g: 57, typicalServingG: 60, category: 'fruit' },
  { name: 'grape', aliases: ['grapes', 'uva', 'uvas'], calsPer100g: 69, typicalServingG: 40, category: 'fruit' },
  { name: 'pineapple', aliases: ['ananas', 'abacaxi', 'pinapple', 'pineaple'], calsPer100g: 50, typicalServingG: 60, category: 'fruit' },
  { name: 'watermelon', aliases: ['melancia'], calsPer100g: 30, typicalServingG: 80, category: 'fruit' },
  { name: 'orange', aliases: ['oranges', 'laranja'], calsPer100g: 47, typicalServingG: 60, category: 'fruit' },
  { name: 'peach', aliases: ['peaches', 'pessego'], calsPer100g: 39, typicalServingG: 60, category: 'fruit' },
  { name: 'papaya', aliases: ['mamao', 'mamão'], calsPer100g: 43, typicalServingG: 70, category: 'fruit' },
  { name: 'melon', aliases: ['melão', 'cantaloupe', 'honeydew'], calsPer100g: 34, typicalServingG: 70, category: 'fruit' },

  // ── Vegetables ──
  { name: 'carrot', aliases: ['carrots', 'cenoura'], calsPer100g: 41, typicalServingG: 40, category: 'vegetable' },
  { name: 'sweet potato', aliases: ['batata doce', 'yam'], calsPer100g: 86, typicalServingG: 60, category: 'vegetable' },
  { name: 'potato', aliases: ['potatoes', 'batata'], calsPer100g: 77, typicalServingG: 60, category: 'vegetable' },
  { name: 'broccoli', aliases: ['brocoli', 'brocolis'], calsPer100g: 34, typicalServingG: 40, category: 'vegetable' },
  { name: 'peas', aliases: ['pea', 'ervilha'], calsPer100g: 81, typicalServingG: 40, category: 'vegetable' },
  { name: 'corn', aliases: ['milho', 'sweet corn'], calsPer100g: 86, typicalServingG: 40, category: 'vegetable' },
  { name: 'spinach', aliases: ['espinafre'], calsPer100g: 23, typicalServingG: 30, category: 'vegetable' },
  { name: 'tomato', aliases: ['tomatoes', 'tomate'], calsPer100g: 18, typicalServingG: 40, category: 'vegetable' },
  { name: 'pumpkin', aliases: ['abobora', 'abóbora', 'squash'], calsPer100g: 26, typicalServingG: 60, category: 'vegetable' },
  { name: 'zucchini', aliases: ['abobrinha', 'courgette'], calsPer100g: 17, typicalServingG: 50, category: 'vegetable' },
  { name: 'beans', aliases: ['bean', 'feijao', 'feijão', 'black beans', 'kidney beans'], calsPer100g: 132, typicalServingG: 50, category: 'vegetable' },
  { name: 'lentils', aliases: ['lentil', 'lentilha'], calsPer100g: 116, typicalServingG: 50, category: 'vegetable' },

  // ── Grains & Carbs ──
  { name: 'rice', aliases: ['arroz', 'white rice', 'brown rice'], calsPer100g: 130, typicalServingG: 60, category: 'grain' },
  { name: 'pasta', aliases: ['noodles', 'macarrao', 'macarrão', 'spaghetti', 'penne'], calsPer100g: 131, typicalServingG: 60, category: 'grain' },
  { name: 'bread', aliases: ['pao', 'pão', 'toast'], calsPer100g: 265, typicalServingG: 25, category: 'grain' },
  { name: 'oatmeal', aliases: ['oats', 'aveia', 'porridge'], calsPer100g: 68, typicalServingG: 80, category: 'grain' },
  { name: 'cereal', aliases: ['cereals', 'baby cereal'], calsPer100g: 370, typicalServingG: 20, category: 'grain' },
  { name: 'pancake', aliases: ['pancakes', 'panqueca'], calsPer100g: 227, typicalServingG: 40, category: 'grain' },
  { name: 'crackers', aliases: ['cracker', 'biscoito', 'biscuit'], calsPer100g: 420, typicalServingG: 15, category: 'grain' },
  { name: 'tortilla', aliases: ['wrap'], calsPer100g: 237, typicalServingG: 30, category: 'grain' },

  // ── Protein ──
  { name: 'chicken', aliases: ['frango', 'pollo', 'chicken breast'], calsPer100g: 165, typicalServingG: 40, category: 'protein' },
  { name: 'beef', aliases: ['carne', 'meat', 'steak', 'ground beef'], calsPer100g: 250, typicalServingG: 40, category: 'protein' },
  { name: 'fish', aliases: ['peixe', 'salmon', 'tilapia', 'cod', 'tuna'], calsPer100g: 120, typicalServingG: 40, category: 'protein' },
  { name: 'egg', aliases: ['eggs', 'ovo', 'ovos', 'scrambled eggs'], calsPer100g: 155, typicalServingG: 50, category: 'protein' },
  { name: 'turkey', aliases: ['peru'], calsPer100g: 135, typicalServingG: 40, category: 'protein' },
  { name: 'tofu', aliases: [], calsPer100g: 76, typicalServingG: 40, category: 'protein' },
  { name: 'ham', aliases: ['presunto'], calsPer100g: 145, typicalServingG: 20, category: 'protein' },

  // ── Dairy ──
  { name: 'milk', aliases: ['leite', 'whole milk'], calsPer100g: 61, typicalServingG: 120, category: 'dairy' },
  { name: 'formula', aliases: ['baby formula', 'formula milk'], calsPer100g: 65, typicalServingG: 120, category: 'dairy' },
  { name: 'breast milk', aliases: ['breastmilk', 'leite materno'], calsPer100g: 70, typicalServingG: 120, category: 'dairy' },
  { name: 'yogurt', aliases: ['iogurte', 'yoghurt', 'yourgurt', 'yougurt', 'yoghurt'], calsPer100g: 59, typicalServingG: 80, category: 'dairy' },
  { name: 'cheese', aliases: ['queijo', 'cheddar', 'mozzarella'], calsPer100g: 350, typicalServingG: 15, category: 'dairy' },
  { name: 'cream cheese', aliases: ['requeijao', 'requeijão'], calsPer100g: 342, typicalServingG: 15, category: 'dairy' },
  { name: 'butter', aliases: ['manteiga'], calsPer100g: 717, typicalServingG: 5, category: 'dairy' },

  // ── Drinks ──
  { name: 'juice', aliases: ['suco', 'orange juice', 'apple juice', 'fruit juice'], calsPer100g: 45, typicalServingG: 100, category: 'drink' },
  { name: 'water', aliases: ['agua', 'água'], calsPer100g: 0, typicalServingG: 120, category: 'drink' },
  { name: 'coconut water', aliases: ['agua de coco', 'água de coco'], calsPer100g: 19, typicalServingG: 120, category: 'drink' },
  { name: 'smoothie', aliases: ['vitamina'], calsPer100g: 55, typicalServingG: 120, category: 'drink' },

  // ── Snacks ──
  { name: 'cookie', aliases: ['cookies', 'bolacha', 'bolachas'], calsPer100g: 450, typicalServingG: 15, category: 'snack' },
  { name: 'cake', aliases: ['bolo'], calsPer100g: 350, typicalServingG: 40, category: 'snack' },
  { name: 'ice cream', aliases: ['sorvete', 'gelato'], calsPer100g: 207, typicalServingG: 50, category: 'snack' },
  { name: 'chocolate', aliases: [], calsPer100g: 546, typicalServingG: 10, category: 'snack' },
  { name: 'peanut butter', aliases: ['pasta de amendoim', 'pb'], calsPer100g: 588, typicalServingG: 15, category: 'snack' },
  { name: 'granola bar', aliases: ['barra de cereal'], calsPer100g: 400, typicalServingG: 25, category: 'snack' },
  { name: 'fruit pouch', aliases: ['pouch', 'squeeze'], calsPer100g: 50, typicalServingG: 90, category: 'snack' },

  // ── Mixed / Meals ──
  { name: 'soup', aliases: ['sopa', 'caldo'], calsPer100g: 40, typicalServingG: 120, category: 'mixed' },
  { name: 'puree', aliases: ['pure', 'purê', 'baby food', 'papinha'], calsPer100g: 50, typicalServingG: 100, category: 'mixed' },
  { name: 'pizza', aliases: [], calsPer100g: 266, typicalServingG: 50, category: 'mixed' },
  { name: 'sandwich', aliases: ['sanduiche', 'sanduíche'], calsPer100g: 250, typicalServingG: 60, category: 'mixed' },
  { name: 'nuggets', aliases: ['nugget', 'chicken nuggets'], calsPer100g: 296, typicalServingG: 40, category: 'mixed' },
  { name: 'french fries', aliases: ['fries', 'batata frita', 'chips'], calsPer100g: 312, typicalServingG: 40, category: 'mixed' },
  { name: 'veggie sticks', aliases: ['vegetable sticks'], calsPer100g: 25, typicalServingG: 40, category: 'mixed' },
]

/**
 * Given a free-text food description, estimate total calories.
 * Returns matched foods with their individual calorie estimates.
 */
export interface CalorieMatch {
  food: string
  cals: number
  category: FoodEntry['category']
}

export interface CalorieEstimate {
  totalCals: number
  matches: CalorieMatch[]
}

/** Escape special regex chars in a food name */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True if `token` matches `candidate` as a whole word or exact string */
function tokenMatchesName(token: string, candidate: string): boolean {
  if (token === candidate) return true
  // Word-boundary match so "pineapple" doesn't match "apple"
  const re = new RegExp(`(?<![a-z])${escapeRegex(candidate)}(?![a-z])`)
  return re.test(token)
}

export function estimateCalories(description: string): CalorieEstimate {
  if (!description.trim()) return { totalCals: 0, matches: [] }

  // Each tag is a comma-separated token (from the tag chip input)
  const tokens = description.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean)

  const matches: CalorieMatch[] = []
  const matched = new Set<string>()

  for (const token of tokens) {
    for (const entry of FOOD_DB) {
      if (matched.has(entry.name)) continue
      const allNames = [entry.name, ...entry.aliases]
      const found = allNames.some((name) => tokenMatchesName(token, name.toLowerCase()))
      if (found) {
        matched.add(entry.name)
        const cals = Math.round((entry.calsPer100g * entry.typicalServingG) / 100)
        matches.push({ food: entry.name, cals, category: entry.category })
      }
    }
  }

  const totalCals = matches.reduce((sum, m) => sum + m.cals, 0)
  return { totalCals, matches }
}

/** Match a single food tag against the DB. Returns the match or null if unknown. */
export function matchSingleTag(tag: string): CalorieMatch | null {
  const token = tag.toLowerCase().trim()
  if (!token) return null
  for (const entry of FOOD_DB) {
    const allNames = [entry.name, ...entry.aliases]
    const found = allNames.some((name) => tokenMatchesName(token, name.toLowerCase()))
    if (found) {
      const cals = Math.round((entry.calsPer100g * entry.typicalServingG) / 100)
      return { food: entry.name, cals, category: entry.category }
    }
  }
  return null
}

/** Get a color for a calorie category */
export function categoryColor(cat: FoodEntry['category']): string {
  switch (cat) {
    case 'fruit': return '#4CAF50'
    case 'vegetable': return '#66BB6A'
    case 'grain': return '#FFA726'
    case 'protein': return '#EF5350'
    case 'dairy': return '#42A5F5'
    case 'drink': return '#26C6DA'
    case 'snack': return '#AB47BC'
    case 'mixed': return '#8D6E63'
  }
}

import type { Chip, ChipCfg, DemoData, Goal } from './types'

const MOOD: ChipCfg = { t: 'mood' }
const ok = (name: string, value: string, range: string) => ({ name, value, range, flag: 'ok' as const })
const low = (name: string, value: string, range: string) => ({ name, value, range, flag: 'low' as const })

const preHero = (goal: Goal) =>
  goal === 'ttc'
    ? { label: 'Dia do ciclo', n: '14', em: 'janela fértil', row: [{ label: 'Melhor momento pra tentar', value: 'hoje e amanhã' }, { label: 'Teste de gravidez', value: 'a partir de 13 nov' }], icon: 'heart' as const }
    : { label: 'Dia do ciclo', n: '14', em: 'fase fértil', row: [{ label: 'Próxima menstruação', value: 'em 14 dias' }, { label: 'Ciclo médio', value: '28 dias' }], icon: 'moon' as const }

export const dataPt: DemoData = {
  locale: 'pt',
  kids: {
    kenji: { name: 'Kenji', age: '2 anos', icon: 'baby', tone: '#CFE1FA', dot: '#4C79CE' },
    lua: { name: 'Lua', age: '5 meses', icon: 'baby2', tone: '#FBE3A6', dot: '#F2B705' },
  },
  phases: {
    pre: {
      name: 'Ciclo', tone: '#F9CFE0', accent: '#E0709A', icon: 'flower',
      hero: preHero,
      kidHero: null,
      chips: (goal): Chip[] => {
        const base: Chip[] = [
          { id: 'mood' as const, label: 'Humor', icon: 'face3' as const, cfg: MOOD },
          { id: 'flow' as const, label: 'Fluxo', icon: 'drop' as const, cfg: { t: 'pick' as const, memory: false, options: [{ id: 'none', label: 'Nenhum' }, { id: 'light', label: 'Leve' }, { id: 'medium', label: 'Médio' }, { id: 'heavy', label: 'Intenso' }] } },
        ]
        return goal === 'ttc'
          ? [...base,
            { id: 'temp' as const, label: 'Temperatura', icon: 'thermo' as const, cfg: { t: 'range' as const, min: 35.8, max: 37.6, step: 0.1, v: 36.7, unit: ' °C' } },
            { id: 'ovtest' as const, label: 'Teste de ovulação', icon: 'otest' as const, cfg: { t: 'pick' as const, memory: false, options: [{ id: 'negative', label: 'Negativo' }, { id: 'positive', label: 'Positivo' }] } }]
          : [...base,
            { id: 'symptoms' as const, label: 'Sintomas', icon: 'brain' as const, cfg: { t: 'pick' as const, memory: false, options: [{ id: 'cramps', label: 'Cólica' }, { id: 'bloating', label: 'Inchaço' }, { id: 'headache', label: 'Dor de cabeça' }, { id: 'acne', label: 'Acne' }] } },
            { id: 'sleep' as const, label: 'Sono', icon: 'zz' as const, cfg: { t: 'range' as const, min: 3, max: 12, step: 0.5, v: 7.5, unit: 'h' } }]
      },
      today: [
        { icon: 'thermo', label: 'Temperatura', value: '36,7 °C · subiu', time: '07:00', kid: null },
        { icon: 'face3', label: 'Humor', value: 'bem', time: '09:12', kid: null },
        { icon: 'brain', label: 'Sintomas', value: 'cólica leve', time: '10:40', kid: null },
      ],
      quick: (goal) => goal === 'ttc'
        ? [{ screen: 'reminders', sub: 'Vitamina às 8h' }, { screen: 'exams', sub: '2 guardados' }, { screen: 'community', sub: 'Tentando engravidar' }, { screen: 'memories', sub: '3 momentos' }]
        : [{ screen: 'reminders', sub: 'Menstruação em 14 dias' }, { screen: 'exams', sub: '2 guardados' }, { screen: 'community', sub: 'Ciclo e TPM' }, { screen: 'memories', sub: '3 momentos' }],
      cal: {
        per: [17, 18, 19, 20, 21], fer: [26, 27, 28, 29, 31], ev: [], star: 30, dots: [17, 19, 22, 24, 26, 28, 29], kd: null,
        legend: [{ color: '#F4A6C9', label: 'menstruação', ring: null }, { color: '#fff', label: 'janela fértil', ring: '#1E8A6A' }, { color: '#161513', label: 'registros', ring: null }],
      },
      events: [
        { icon: 'bell', title: 'Exame de sangue', sub: 'jejum de 8h', when: 'qua 4 nov · 7:30', kid: null },
        { icon: 'doc', title: 'Ginecologista', sub: 'levar os registros', when: 'sex 13 nov · 10:00', kid: null },
        { icon: 'moon', title: 'Próxima menstruação', sub: 'previsão', when: '13 nov', kid: null },
      ],
      chans: (goal) => goal === 'ttc'
        ? [{ id: 'ttc', icon: 'heart', title: 'Tentando engravidar', kind: 'channel', tone: '#F9CFE0' }, { id: 'irregular', icon: 'owl', title: 'Ciclos irregulares', kind: 'anon', tone: '#FFF1B8' }, { id: 'afterPositive', icon: 'star', title: 'Depois do positivo', kind: 'channel', tone: '#DCCFF9' }]
        : [{ id: 'cycle', icon: 'flower', title: 'Ciclo e TPM', kind: 'channel', tone: '#F9CFE0' }, { id: 'irregular', icon: 'owl', title: 'Ciclos irregulares', kind: 'anon', tone: '#FFF1B8' }, { id: 'endo', icon: 'drop', title: 'Endometriose', kind: 'channel', tone: '#DCCFF9' }],
      exams: [
        { title: 'Hormônios', date: 'set 2026', status: 'ok', read: 'Reserva ovariana boa pra sua idade. Tireoide em ordem.', vals: [ok('AMH', '2,8 ng/mL', '1,0–4,0'), ok('FSH (3º dia)', '6,2 mUI/mL', '3,5–12,5'), ok('TSH', '2,1 mUI/L', '0,4–4,0')] },
        { title: 'Vitamina D', date: 'ago 2026', status: 'warn', read: 'A vitamina D está baixa. Um pouco de sol e vale perguntar sobre suplemento.', vals: [low('25-OH vitamina D', '22 ng/mL', '30–100')] },
      ],
      mem: [
        { year: '2026', month: 'out', title: 'Primeiro ciclo registrado inteiro', sub: 'você', icon: 'moon', tone: '#F9CFE0', kid: null },
        { year: '2026', month: 'set', title: 'A cólica melhorou com a caminhada', sub: 'você', icon: 'shoe', tone: '#D7F0DD', kid: null },
        { year: '2026', month: 'jun', title: 'Comecei a me conhecer de verdade', sub: 'você', icon: 'flower', tone: '#FFF1B8', kid: null },
      ],
    },
    preg: {
      name: 'Grávida', tone: '#DCCFF9', accent: '#8F5FC6', icon: 'heart',
      hero: null, kidHero: null,
      chips: [
        { id: 'kicks', label: 'Chutes', icon: 'heart', cfg: { t: 'kick' } },
        { id: 'mood', label: 'Humor', icon: 'face3', cfg: MOOD },
        { id: 'sleep', label: 'Sono', icon: 'zz', cfg: { t: 'range', min: 3, max: 12, step: 0.5, v: 7, unit: 'h' } },
        { id: 'visit', label: 'Consulta', icon: 'doc', cfg: { t: 'pick', memory: false, options: [{ id: 'prenatal', label: 'Pré-natal' }, { id: 'ultrasound', label: 'Ultrassom' }, { id: 'blood', label: 'Exame de sangue' }, { id: 'other', label: 'Outra' }] } },
      ],
      today: [
        { icon: 'heart', label: 'Chutes', value: '12 em 40 min', time: '09:30', kid: null },
        { icon: 'face4', label: 'Humor', value: 'ótimo', time: '11:00', kid: null },
        { icon: 'zz', label: 'Sono', value: '7h', time: '07:00', kid: null },
      ],
      quick: [{ screen: 'appointments', sub: '8 de 12 feitas' }, { screen: 'exams', sub: 'morfológico ok' }, { screen: 'memories', sub: '4 momentos' }, { screen: 'community', sub: 'Mães de fevereiro' }],
      cal: {
        per: [], fer: [], ev: [11], star: null, dots: [2, 5, 9, 12, 16, 19, 22, 23, 26, 29, 30], kd: null,
        legend: [{ color: '#DCCFF9', label: 'consulta', ring: null }, { color: '#161513', label: 'registros', ring: null }],
      },
      events: [
        { icon: 'bell', title: 'Curva glicêmica', sub: 'semana 26', when: 'qua 11 nov · 8:00', kid: null },
        { icon: 'bell', title: 'Consulta 28 semanas', sub: 'com a dra. Lúcia', when: 'sex 27 nov', kid: null },
        { icon: 'doc', title: 'Ultrassom morfológico', sub: 'tudo certo', when: 'feito ✓', kid: null },
      ],
      chans: [
        { id: 'feb', icon: 'heart', title: 'Mães de fevereiro 2027', kind: 'channel', tone: '#DCCFF9' },
        { id: 'fears', icon: 'owl', title: 'Medos da gravidez', kind: 'anon', tone: '#FFF1B8' },
        { id: 'layette', icon: 'bodysuit', title: 'Enxoval', kind: 'channel', tone: '#FBE3A6' },
      ],
      exams: [
        { title: 'Ultrassom morfológico', date: 'out 2026 · semana 22', status: 'ok', read: 'O bebê está crescendo bem e na medida certa pra semana.', vals: [ok('Peso estimado', '510 g', 'p50'), ok('Batimentos', '148 bpm', '110–160'), ok('Líquido amniótico', 'normal', '')] },
        { title: 'Hemograma', date: 'set 2026', status: 'warn', read: 'A hemoglobina está um pouco baixa. Vale falar com a sua médica sobre ferro.', vals: [low('Hemoglobina', '10,8 g/dL', '11–14'), low('Ferritina', '14 ng/mL', '15–150'), ok('Plaquetas', '230 mil', '150–450 mil')] },
        { title: 'Glicemia de jejum', date: 'set 2026', status: 'ok', read: 'Glicose normal pra gravidez.', vals: [ok('Glicose', '84 mg/dL', '< 92')] },
      ],
      mem: [
        { year: '2026', month: 'out', title: 'Barriga de 20 semanas', sub: 'você', icon: 'flower', tone: '#FFF1B8', kid: null },
        { year: '2026', month: 'set', title: 'Primeiro chute', sub: 'semana 19', icon: 'heart', tone: '#F9CFE0', kid: null },
        { year: '2026', month: 'ago', title: 'Ultrassom de 12 semanas', sub: 'com o papai', icon: 'pola', tone: '#DCCFF9', kid: null },
        { year: '2026', month: 'jun', title: 'O positivo', sub: 'às 6h da manhã', icon: 'star', tone: '#FBE3A6', kid: null },
      ],
    },
    kids: {
      name: 'Filhos', tone: '#CFE1FA', accent: '#4C79CE', icon: 'baby',
      hero: null,
      kidHero: {
        kenji: { n: '10h', em: 'de sono ontem', row: [{ label: 'Última refeição', value: '12:30' }, { label: 'Próxima vacina', value: 'dom 8 nov' }] },
        lua: { n: '5', em: 'mamadas hoje', row: [{ label: 'Última mamada', value: '13:10 · esq.' }, { label: 'Próxima vacina', value: 'qui 12 nov' }] },
      },
      chips: [
        { id: 'sleep', label: 'Sono', icon: 'zz', cfg: { t: 'range', min: 0.5, max: 14, step: 0.5, v: 10, unit: 'h' } },
        { id: 'food', label: 'Comida', icon: 'bottle', cfg: { t: 'pick', memory: false, options: [{ id: 'nursing', label: 'Mamada' }, { id: 'puree', label: 'Papinha' }, { id: 'fruit', label: 'Fruta' }, { id: 'snack', label: 'Lanche' }] } },
        { id: 'diaper', label: 'Fralda', icon: 'diaper', cfg: { t: 'pick', memory: false, options: [{ id: 'pee', label: 'Xixi' }, { id: 'poop', label: 'Cocô' }, { id: 'both', label: 'Os dois' }] } },
        { id: 'milestone', label: 'Marco', icon: 'star', cfg: { t: 'pick', memory: true, options: [{ id: 'firstStep', label: 'Primeiro passo' }, { id: 'firstWord', label: 'Primeira palavra' }, { id: 'firstTooth', label: 'Primeiro dente' }, { id: 'other', label: 'Outro' }] } },
      ],
      today: [
        { icon: 'bottle', label: 'Mamada', value: '12 min · esquerdo', time: '13:10', kid: 'lua' },
        { icon: 'bottle', label: 'Comida', value: 'papinha de abóbora · pela babá', time: '12:30', kid: 'kenji' },
        { icon: 'zz', label: 'Soneca', value: '1h20', time: '10:40', kid: 'lua' },
        { icon: 'diaper', label: 'Fralda', value: 'xixi · pela babá', time: '11:05', kid: 'kenji' },
        { icon: 'zz', label: 'Sono', value: '10h · noite', time: '07:10', kid: 'kenji' },
      ],
      quick: [{ screen: 'vaccines', sub: 'Lua: 12 nov' }, { screen: 'growth', sub: 'Kenji p55' }, { screen: 'care', sub: '4 pessoas' }, { screen: 'village', sub: '4 anúncios perto' }],
      cal: {
        per: [], fer: [], ev: [8, 12], star: null, dots: [],
        kd: { kenji: [1, 3, 6, 8, 10, 13, 15, 17, 20, 22, 24, 27, 29, 30], lua: [2, 3, 5, 7, 9, 12, 14, 16, 19, 21, 23, 26, 28, 30] },
        legend: [{ color: '#4C79CE', label: 'Kenji', ring: null }, { color: '#F2B705', label: 'Lua', ring: null }, { color: '#CFE1FA', label: 'vacina ou consulta', ring: '#161513' }],
      },
      events: [
        { icon: 'bell', title: 'Pediatra', sub: 'rotina', when: 'hoje · 16:00', kid: 'kenji' },
        { icon: 'syringe', title: 'DTP (reforço)', sub: 'calendário PNI', when: 'dom 8 nov', kid: 'kenji' },
        { icon: 'syringe', title: 'Pentavalente 6 meses', sub: 'calendário PNI', when: 'qui 12 nov', kid: 'lua' },
        { icon: 'house', title: 'Babá: Ana', sub: 'os dois · seg a sex', when: '8h às 17h', kid: null },
      ],
      chans: [
        { id: 'babySleep', icon: 'zz', title: 'Sono do bebê', kind: 'channel', tone: '#CFE1FA' },
        { id: 'solids', icon: 'bottle', title: 'Introdução alimentar', kind: 'channel', tone: '#D7F0DD' },
        { id: 'momsOfTwo', icon: 'baby2', title: 'Mães de 2', kind: 'channel', tone: '#FBE3A6' },
        { id: 'exhaustion', icon: 'owl', title: 'Exaustão', kind: 'anon', tone: '#FFF1B8' },
      ],
      exams: [
        { title: 'Hemograma · Kenji', date: 'set 2026', status: 'ok', read: 'Tudo dentro do esperado pra idade. O ferro está bom.', vals: [ok('Hemoglobina', '12,1 g/dL', '11–14'), ok('Leucócitos', '8.200 /µL', '6.000–17.500'), ok('Ferritina', '32 ng/mL', '12–140')] },
        { title: 'Ultrassom de quadril · Lua', date: 'jun 2026', status: 'ok', read: 'Quadril normal dos dois lados.', vals: [ok('Ângulo alfa (D)', '64°', '≥ 60°'), ok('Ângulo alfa (E)', '63°', '≥ 60°')] },
      ],
      mem: [
        { year: '2026', month: 'out', title: 'Primeiro dia na creche', sub: 'Kenji · 2 anos', icon: 'backpack', tone: '#CFE1FA', kid: 'kenji' },
        { year: '2026', month: 'set', title: 'Rolou sozinha!', sub: 'Lua · 4 meses', icon: 'star', tone: '#FBE3A6', kid: 'lua' },
        { year: '2026', month: 'ago', title: 'Primeiro sorriso de verdade', sub: 'Lua · 2 meses', icon: 'baby2', tone: '#F9CFE0', kid: 'lua' },
        { year: '2026', month: 'jun', title: 'A Lua chegou', sub: '3,2 kg · 14:05', icon: 'heart', tone: '#FBE3A6', kid: 'lua' },
        { year: '2025', month: 'nov', title: 'Primeiro passo', sub: 'Kenji · 13 meses', icon: 'shoe', tone: '#F9CFE0', kid: 'kenji' },
        { year: '2025', month: 'set', title: 'Primeira palavra: “vó”', sub: 'Kenji · 11 meses', icon: 'bubble', tone: '#CFE1FA', kid: 'kenji' },
        { year: '2025', month: 'mai', title: 'Primeiro dente', sub: 'Kenji · 7 meses', icon: 'star', tone: '#D7F0DD', kid: 'kenji' },
      ],
    },
    meno: {
      name: 'Menopausa', tone: '#FBD3B3', accent: '#D9672A', icon: 'flame',
      hero: { label: 'Esta semana', n: '3', em: 'ondas de calor', row: [{ label: 'Semana passada', value: '5' }, { label: 'Sono médio', value: '6h40' }], icon: 'flame' },
      kidHero: null,
      chips: [
        { id: 'heat', label: 'Ondas de calor', icon: 'flame', cfg: { t: 'range', min: 1, max: 5, step: 1, v: 3, unit: ' de 5' } },
        { id: 'sleep', label: 'Sono', icon: 'zz', cfg: { t: 'range', min: 3, max: 10, step: 0.5, v: 6.5, unit: 'h' } },
        { id: 'mood', label: 'Humor', icon: 'face3', cfg: MOOD },
        { id: 'fog', label: 'Névoa mental', icon: 'brain', cfg: { t: 'pick', memory: false, options: [{ id: 'mild', label: 'Leve' }, { id: 'medium', label: 'Média' }, { id: 'strong', label: 'Forte' }] } },
      ],
      today: [
        { icon: 'flame', label: 'Ondas de calor', value: 'intensidade 3 de 5', time: '10:20', kid: null },
        { icon: 'zz', label: 'Sono', value: '6h30', time: '07:00', kid: null },
      ],
      quick: [{ screen: 'reminders', sub: 'Caminhada às 18h' }, { screen: 'community', sub: 'Ondas de calor' }, { screen: 'exams', sub: 'densitometria ok' }, { screen: 'memories', sub: '3 momentos' }],
      cal: {
        per: [], fer: [], ev: [12], star: null, dots: [2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25, 28, 30], kd: null,
        legend: [{ color: '#FBD3B3', label: 'consulta', ring: null }, { color: '#161513', label: 'sintomas registrados', ring: null }],
      },
      events: [
        { icon: 'doc', title: 'Ginecologista', sub: 'levar o resumo das semanas', when: 'qui 12 nov · 9:00', kid: null },
        { icon: 'bell', title: 'Densitometria', sub: 'agendar', when: 'dez', kid: null },
      ],
      chans: [
        { id: 'hotFlashes', icon: 'flame', title: 'Ondas de calor', kind: 'anon', tone: '#FBD3B3' },
        { id: 'menoSleep', icon: 'zz', title: 'Sono na menopausa', kind: 'channel', tone: '#DCCFF9' },
        { id: 'running', icon: 'shoe', title: 'Começando a correr', kind: 'channel', tone: '#D7F0DD' },
      ],
      exams: [
        { title: 'Densitometria', date: 'jul 2026', status: 'ok', read: 'Os ossos estão bem pra idade.', vals: [ok('Coluna (T-score)', '-0,8', '> -1,0'), ok('Fêmur (T-score)', '-0,5', '> -1,0')] },
        { title: 'Hormônios', date: 'set 2026', status: 'ok', read: 'O FSH alto confirma a transição. É o esperado nessa fase.', vals: [ok('FSH', '48 mUI/mL', 'pós-menopausa'), ok('Estradiol', '18 pg/mL', '')] },
        { title: 'Vitamina D', date: 'set 2026', status: 'warn', read: 'A vitamina D está baixa. Vale perguntar sobre suplemento.', vals: [low('25-OH vitamina D', '24 ng/mL', '30–100')] },
      ],
      mem: [
        { year: '2026', month: 'out', title: 'Primeira semana com só 3 ondas de calor', sub: 'você', icon: 'flame', tone: '#FBD3B3', kid: null },
        { year: '2026', month: 'set', title: 'Primeiros 5 km', sub: 'você', icon: 'shoe', tone: '#D7F0DD', kid: null },
        { year: '2026', month: 'mar', title: 'Meus 50 anos', sub: 'com as amigas', icon: 'star', tone: '#FFF1B8', kid: null },
      ],
    },
  },
  weeks: [
    { week: 8, name: 'uma framboesa', icon: 'rasp', len: '1,6 cm', wt: '1 g' },
    { week: 12, name: 'uma ameixa', icon: 'plum', len: '5,4 cm', wt: '14 g' },
    { week: 16, name: 'um abacate', icon: 'avocado', len: '18,6 cm', wt: '100 g' },
    { week: 20, name: 'uma banana', icon: 'banana', len: '25,7 cm', wt: '300 g' },
    { week: 24, name: 'uma espiga de milho', icon: 'corn', len: '30 cm', wt: '600 g' },
    { week: 28, name: 'uma berinjela', icon: 'eggplant', len: '38 cm', wt: '1 kg' },
    { week: 32, name: 'uma jícama', icon: 'jicama', len: '42 cm', wt: '1,7 kg' },
    { week: 36, name: 'um pé de alface', icon: 'lettuce', len: '47 cm', wt: '2,6 kg' },
    { week: 40, name: 'uma abóbora', icon: 'pumpkin', len: '51 cm', wt: '3,5 kg' },
  ],
  msgs: {
    babySleep: [
      { icon: 'owl', who: 'Coruja anônima', text: 'Alguém aí com bebê de 5 meses acordando de 2 em 2 horas? Tô um zumbi.', likes: 6 },
      { icon: 'face4', who: 'Carol · mãe do Theo', text: 'Aqui foi a regressão dos 4 meses. Passou em umas 3 semanas, juro.', likes: 9 },
      { icon: 'eye', who: 'Dra. Marina · pediatra', text: 'Rotina de soneca ajuda muito nessa fase. Querem que eu poste um modelo?', likes: 14 },
    ],
    solids: [
      { icon: 'face3', who: 'Ju · mãe da Bia', text: 'Primeira papinha hoje! Ela fez careta pra abóbora 😂', likes: 4 },
      { icon: 'owl', who: 'Coruja anônima', text: 'Normal! Às vezes precisa oferecer umas 10 vezes.', likes: 7 },
    ],
    momsOfTwo: [
      { icon: 'face4', who: 'Rê · Pedro e Ana', text: 'Como vocês dividem a atenção quando os dois choram juntos?', likes: 3 },
      { icon: 'face3', who: 'Lu · mãe de 2', text: 'Atendo quem tá com fome e vou conversando com o outro. Nem sempre dá certo 😅', likes: 8 },
    ],
    exhaustion: [
      { icon: 'face3', who: 'Comunidade', text: 'Bem-vinda! Conta pra gente como você tá.', likes: 3 },
    ],
    feb: [
      { icon: 'face4', who: 'Bia · 24 semanas', text: 'Quem mais sente chute de madrugada?', likes: 11 },
      { icon: 'face3', who: 'Nanda · 23 semanas', text: 'Eu!! Parece que ele acorda quando eu deito.', likes: 6 },
      { icon: 'eye', who: 'Enf. Paula', text: 'É bem comum: quando você para, percebe mais os movimentos.', likes: 15 },
    ],
    fears: [
      { icon: 'owl', who: 'Coruja anônima', text: 'Tenho medo do parto e não consigo falar disso com ninguém.', likes: 22 },
      { icon: 'owl', who: 'Gaivota anônima', text: 'Eu também. Fiz um plano de parto com a minha médica e me acalmou muito.', likes: 17 },
    ],
    layette: [
      { icon: 'face3', who: 'Comunidade', text: 'Bem-vinda! Conta pra gente como você tá.', likes: 3 },
    ],
    cycle: [
      { icon: 'face3', who: 'Bia · 29', text: 'Alguém mais tem enxaqueca na TPM? Comecei a anotar e é sempre perto do dia 26.', likes: 14 },
      { icon: 'owl', who: 'Coruja anônima', text: 'Eu! Anotar me ajudou a mostrar o padrão pra minha médica.', likes: 11 },
    ],
    endo: [
      { icon: 'face4', who: 'Rê', text: 'Diagnóstico depois de 7 anos de cólica. Quem mais?', likes: 22 },
      { icon: 'owl', who: 'Coruja anônima', text: 'Aqui foram 9. Você não está sozinha.', likes: 19 },
    ],
    ttc: [
      { icon: 'face3', who: 'Mari · 7º ciclo', text: 'Testei hoje cedo… negativo de novo. Bora pro próximo.', likes: 18 },
      { icon: 'owl', who: 'Coruja anônima', text: 'Te abraço. Aqui foi no 9º, não desiste ❤', likes: 25 },
    ],
    irregular: [
      { icon: 'face3', who: 'Comunidade', text: 'Bem-vinda! Conta pra gente como você tá.', likes: 3 },
    ],
    afterPositive: [
      { icon: 'face3', who: 'Comunidade', text: 'Bem-vinda! Conta pra gente como você tá.', likes: 3 },
    ],
    hotFlashes: [
      { icon: 'owl', who: 'Coruja anônima', text: 'Cortar café depois do almoço mudou minhas noites.', likes: 12 },
      { icon: 'face4', who: 'Sônia · 52', text: 'Ventilador de mesa no trabalho. Sem vergonha nenhuma 😂', likes: 9 },
    ],
    menoSleep: [
      { icon: 'face3', who: 'Comunidade', text: 'Bem-vinda! Conta pra gente como você tá.', likes: 3 },
    ],
    running: [
      { icon: 'face3', who: 'Comunidade', text: 'Bem-vinda! Conta pra gente como você tá.', likes: 3 },
    ],
  },
  replies: ['Te entendo demais. Aqui foi igual 💛', 'Obrigada por dividir isso.', 'Força! Você não tá sozinha.'],
  village: [
    { icon: 'stroller', tone: '#F9CFE0', rot: -6, title: 'Carrinho de passeio', who: { icon: 'face4', name: 'Carol', place: 'Pinheiros · 1,2 km' }, price: 'R$ 180', kind: 'sell', badge: '#FFF1B8', likes: 12, comments: [{ name: 'Ju', text: 'Ainda tá disponível?' }, { name: 'Carol', text: 'Tá sim! Pode buscar sábado.' }] },
    { icon: 'crib', tone: '#CFE1FA', rot: 4, title: 'Berço portátil', who: { icon: 'face3', name: 'Rê', place: 'Vila Madalena · 2 km' }, price: 'Doação', kind: 'free', badge: '#D7F0DD', likes: 31, comments: [{ name: 'Mari', text: 'Que gesto lindo ❤' }] },
    { icon: 'bodysuit', tone: '#FBE3A6', rot: -3, title: 'Kit 6 bodies · 3–6 meses', who: { icon: 'baby2', name: 'Lu', place: 'Perdizes · 3 km' }, price: 'Troca', kind: 'swap', badge: '#DCCFF9', likes: 8, comments: [{ name: 'Bia', text: 'Troco por 6–9 meses!' }] },
    { icon: 'books', tone: '#D7F0DD', rot: 5, title: 'Livros de banho', who: { icon: 'owl', name: 'Nanda', place: 'Butantã · 4 km' }, price: 'R$ 40', kind: 'sell', badge: '#FFF1B8', likes: 5, comments: [] },
  ],
  growth: {
    kenji: {
      xs: [0, 6, 12, 18, 24], xl: ['0', '6m', '12m', '18m', '2a'],
      weight: { p3: [2.5, 6.4, 7.8, 8.9, 10.0], p50: [3.3, 7.9, 9.6, 10.9, 12.2], p97: [4.3, 9.7, 11.8, 13.5, 15.1], me: [3.4, 7.8, 9.9, 11.2, 12.4], u: 'kg', p: 'p55' },
      height: { p3: [46.3, 63.6, 71.3, 77.2, 81.4], p50: [49.9, 67.6, 75.7, 82.3, 87.1], p97: [53.4, 71.6, 80.2, 87.7, 93.2], me: [50, 67, 76, 82, 86], u: 'cm', p: 'p40' },
      head: { p3: [32.1, 41.0, 43.6, 44.9, 45.8], p50: [34.5, 43.3, 46.1, 47.4, 48.3], p97: [36.9, 45.6, 48.6, 49.9, 50.8], me: [35, 43.5, 46, 47.5, 48.4], u: 'cm', p: 'p52' },
    },
    lua: {
      xs: [0, 1, 2, 3, 4, 5], xl: ['0', '1m', '2m', '3m', '4m', '5m'],
      weight: { p3: [2.4, 3.2, 3.9, 4.5, 5.0, 5.4], p50: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9], p97: [4.2, 5.5, 6.6, 7.5, 8.2, 8.8], me: [3.2, 4.3, 5.2, 5.9, 6.5, 7.0], u: 'kg', p: 'p55' },
      height: { p3: [45.6, 50.0, 53.2, 55.8, 58.0, 59.9], p50: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0], p97: [52.7, 57.4, 60.9, 63.8, 66.2, 68.2], me: [49, 54, 57.5, 60, 62.5, 64], u: 'cm', p: 'p50' },
      head: { p3: [31.7, 34.3, 36.0, 37.2, 38.2, 39.0], p50: [33.9, 36.5, 38.3, 39.5, 40.6, 41.5], p97: [36.1, 38.8, 40.5, 41.9, 43.0, 43.9], me: [34, 36.6, 38.4, 39.7, 40.8, 41.6], u: 'cm', p: 'p53' },
    },
  },
  vax: {
    kenji: [
      { name: 'BCG', when: 'ao nascer', done: true },
      { name: 'Pentavalente', when: '6 meses', done: true },
      { name: 'Febre amarela', when: '9 meses', done: true },
      { name: 'Tríplice viral', when: '12 meses', done: true },
      { name: 'DTP (reforço)', when: 'dom 8 nov', done: false },
    ],
    lua: [
      { name: 'BCG', when: 'ao nascer', done: true },
      { name: 'Hepatite B', when: 'ao nascer', done: true },
      { name: 'Pentavalente', when: '2 e 4 meses', done: true },
      { name: 'Rotavírus', when: '2 e 4 meses', done: true },
      { name: 'Pentavalente', when: 'qui 12 nov', done: false },
    ],
  },
  optIcons: {
    'flow:none': ['leaf'], 'flow:light': ['drop'], 'flow:medium': ['drop', 'drop'], 'flow:heavy': ['drop', 'drop', 'drop'],
    'symptoms:cramps': ['flame'], 'symptoms:bloating': ['cloud'], 'symptoms:headache': ['brain'], 'symptoms:acne': ['star'],
    'ovtest:negative': ['otest'], 'ovtest:positive': ['otest', 'heart'],
    'visit:prenatal': ['bell'], 'visit:ultrasound': ['pola'], 'visit:blood': ['syringe'], 'visit:other': ['doc'],
    'food:nursing': ['bottle'], 'food:puree': ['pumpkin'], 'food:fruit': ['banana'], 'food:snack': ['avocado'],
    'diaper:pee': ['diaper', 'drop'], 'diaper:poop': ['diaper'], 'diaper:both': ['diaper', 'star'],
    'milestone:firstStep': ['shoe'], 'milestone:firstWord': ['bubble'], 'milestone:firstTooth': ['star'], 'milestone:other': ['pola'],
    'fog:mild': ['brain'], 'fog:medium': ['brain', 'brain'], 'fog:strong': ['brain', 'brain', 'brain'],
  },
  rangeVis: { sleep: { icon: 'zz', how: 'grow' }, heat: { icon: 'flame', how: 'count' }, temp: { icon: 'thermo', how: 'grow' } },
  feats: [
    { icon: 'moon', title: 'Ciclo', desc: 'Seu ciclo, sintomas e previsões. E a janela fértil, se um dia quiser engravidar.', action: { mode: 'pre' } },
    { icon: 'heart', title: 'Gravidez', desc: 'Semana a semana, chutes e todas as consultas.', action: { mode: 'preg' } },
    { icon: 'baby', title: 'Filhos', desc: 'Sono, comida, fraldas e marcos de cada filho.', action: { mode: 'kids' } },
    { icon: 'flame', title: 'Menopausa', desc: 'Sintomas ao longo das semanas, pra entender o que muda.', action: { mode: 'meno' } },
    { icon: 'syringe', title: 'Vacinas', desc: 'O calendário do seu país, com aviso antes de cada dose.', action: { screen: 'vaccines' } },
    { icon: 'pola', title: 'Memórias', desc: 'Primeiro passo, primeira palavra, com foto e data.', action: { screen: 'memories' } },
    { icon: 'house', title: 'Rede de cuidado', desc: 'Parceiro, avó e babá registram junto. Cada um vê só o que você libera.', action: { screen: 'care' } },
    { icon: 'stroller', title: 'Vila', desc: 'O que não serve mais vira o carrinho de outra família.', action: { screen: 'village' } },
    { icon: 'bubble', title: 'Comunidade', desc: 'Canais por fase e círculos anônimos.', action: { screen: 'community' } },
    { icon: 'doc', title: 'Pro pediatra', desc: 'Crescimento, vacinas e alergias numa página pronta pra consulta.', action: { screen: 'pediatric' } },
    { icon: 'ruler', title: 'Crescimento', desc: 'Peso e altura com percentis.', action: { screen: 'growth' } },
    { icon: 'lock', title: 'Privacidade', desc: 'PIN e Face ID. Exporte ou apague tudo quando quiser.', action: { screen: 'privacy' } },
  ],
  cyc: {
    per: { icon: 'drop', name: 'Menstruação', what: 'sangramento' },
    fol: { icon: 'leaf', name: 'Folicular', what: 'energia subindo' },
    ovu: { icon: 'egg', name: 'Ovulação', what: 'janela fértil' },
    lut: { icon: 'moon2', name: 'Lútea', what: 'progesterona' },
  },
  demoDate: { year: 2026, month: 10, day: 30 },
  ui: {
    user: 'Amara',
    dateLocale: 'pt-BR',
    decimal: ',',
    all: 'Todos',
    back: 'Voltar',
    close: 'Fechar',
    save: 'Salvar',
    send: 'Enviar',
    you: 'Você',
    home: {
      hello: 'Olá, {name}.',
      nudgeTitle: 'Isso é só um gostinho.',
      nudgeSub: 'Toque aqui e guarde seu lugar na fila.',
      goalTrack: 'Só acompanhar',
      goalTtc: 'Quero engravidar',
      registerToday: 'Registrar hoje',
      tapSign: 'toque num sinal',
      today: 'Hoje',
      records: '{n} registros',
      quickAccess: 'Acesso rápido',
      pregTiles: { daysValue: '112', daysLabel: 'dias pra chegar', kicksLabel: 'chutes hoje', visitValue: '27 nov', visitLabel: 'próxima consulta' },
    },
    size: {
      here: 'Semana 24 · você está aqui',
      week: 'Semana {w}',
      sizeOf: 'Do tamanho de {name}',
      length: 'comprimento',
      weight: 'peso',
      factHere: 'O ouvido interno está pronto: o bebê já ouve o seu coração e a sua voz.',
      weeksAgo: 'Há {n} semanas.',
      weeksAhead: 'Daqui a {n} semanas.',
      sliderAria: 'Semana da gravidez',
    },
    cycle: { day: 'DIA', todayPrefix: 'hoje · ', dayAria: 'Dia {d}' },
    weekdays: { mondayFirst: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'], sundayFirst: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] },
    agenda: { title: 'Agenda', next: 'Próximos', shared: 'compartilhado', today: 'Hoje', states: { period: 'menstruação', fertile: 'janela fértil', event: 'consulta', today: 'hoje' } },
    week: { title: 'Sua semana' },
    profile: {
      title: 'Perfil', kids: 'Filhos', add: 'Adicionar', network: 'Sua rede', people: '4 pessoas', kidsSuffix: ' · Kenji e Lua',
      items: [
        { screen: 'care', icon: 'house', title: 'Rede de cuidado' },
        { screen: 'exams', icon: 'doc', title: 'Exames' },
        { screen: 'privacy', icon: 'lock', title: 'Privacidade' },
        { screen: 'reminders', icon: 'bell', title: 'Lembretes' },
        { screen: 'memories', icon: 'pola', title: 'Memórias' },
      ],
    },
    tabs: { home: 'Início', agenda: 'Agenda', shortcuts: 'Atalhos', week: 'Semana', profile: 'Perfil' },
    shortcuts: {
      title: 'Atalhos',
      items: [
        { screen: 'memories', icon: 'pola', title: 'Memórias' },
        { screen: 'vaccines', icon: 'syringe', title: 'Vacinas' },
        { screen: 'care', icon: 'house', title: 'Rede' },
        { screen: 'village', icon: 'stroller', title: 'Vila' },
        { screen: 'community', icon: 'bubble', title: 'Comunidade' },
        { screen: 'exams', icon: 'doc', title: 'Exames' },
      ],
    },
    register: { title: 'Registrar hoje' },
    log: {
      title: 'Registrar {label}',
      howAreYou: 'Como você está?',
      faces: [{ icon: 'face1', label: 'baixo' }, { icon: 'face2', label: 'ok' }, { icon: 'face3', label: 'bem' }, { icon: 'face4', label: 'ótimo' }],
      kickHint: 'Toque a cada chute. Meta: 10 em 2 horas.',
      kicks: 'chutes',
      notePlaceholder: 'Quer anotar algo? (opcional)',
      savedToMemories: 'guardado nas memórias',
      saved: 'Registrado!',
      milestoneSaved: 'Guardado!',
      newMemory: 'Um momento de hoje',
      today: 'hoje',
    },
    charts: {
      baseline: 'linha de base', ovulation: 'ovulação?',
      cycleTitle: 'Seu ciclo', tapDay: 'toque num dia', bbtTitle: 'Temperatura basal', bbtSub: '°C · dia do ciclo', moodTitle: 'Humor da semana', moodSub: '7 dias',
      kicksTitle: 'Chutes por dia', kicksSub: 'cada ♡ = 2 chutes', weightTitle: 'Ganho de peso', weightSub: 'kg · faixa indicada', weekAbbr: 'sem {w}',
      trailTitle: 'Até aqui', trailSub: 'semanas',
      pregTiles: { gainValue: '+6,2 kg', gainLabel: 'desde o início', visitsValue: '8 de 12', visitsLabel: 'appointments', sleepValue: '7h10', sleepLabel: 'sono médio' },
      nightsTitle: 'Noites', nightsSub: '18h → 8h', nightsAxis: ['18h', '22h', '2h', '6h', '8h'],
      kenjiLegend: 'Kenji · média 10h40', luaLegend: 'Lua · acorda 2x',
      plateTitle: 'Prato do Kenji', plateSub: 'esta semana',
      plate: [{ label: 'Proteína', pct: 28, tone: '#F4A6C9' }, { label: 'Vegetais', pct: 24, tone: '#9ED8B0' }, { label: 'Frutas', pct: 22, tone: '#F9C846' }, { label: 'Carboidratos', pct: 26, tone: '#CFE1FA' }],
      proteinTitle: 'Proteína da semana', proteinPct: 86, proteinSub: '86% da meta', proteinNote: 'Somando o que a babá e você registraram.',
      feedsTitle: 'Mamadas da Lua', feedsSub: 'por dia', seeGrowth: 'Ver crescimento completo',
      heatTitle: 'Quando elas aparecem', heatSub: 'esta semana', heatSlots: ['manhã', 'tarde', 'noite', 'madrug.'], heatNote: 'Mais à tarde e de madrugada. Vale levar pra consulta.',
      trendTitle: 'Ondas de calor por semana', trendSub: '6 semanas', trendWeek: 'S{n}',
      menoTiles: { sleepValue: '4 de 7', sleepLabel: 'noites bem dormidas', fogValue: '2 dias', fogLabel: 'com névoa mental', dropValue: '−66%', dropLabel: 'ondas desde S1' },
    },
    screens: {
      vaccines: { title: 'Vacinas', icon: 'syringe', note: 'Calendário do PNI pra cada filho. A gente avisa antes de cada dose.' },
      memories: { title: 'Memórias', icon: 'pola', note: 'Os primeiros de tudo, em ordem. Um dia vai tudo pra quem vem depois.', newMemory: 'Nova memória', saved: 'Guardado!' },
      care: {
        title: 'Rede de cuidado', icon: 'house', note: 'Cada pessoa vê só o que você libera.',
        circle: { you: 'Você', partner: 'Parceiro', grandma: 'Avó', sitter: 'Babá' },
        access: { partner: 'tudo', grandma: 'fotos e marcos', sitter: 'registra o dia' },
        memoFrom: 'Babá · 12:30', memo: 'Kenji comeu tudo e pediu mais. Lua mamou e dormiu 1h20.',
      },
      village: {
        title: 'Vila', icon: 'stroller',
        filters: { all: 'Tudo', sell: 'Venda', swap: 'Troca', free: 'Doação' },
        kinds: { sell: 'Venda', free: 'Doação', swap: 'Troca' },
        buy: 'Comprar', want: 'Quero', commentPlaceholder: 'Comentar…', commentAria: 'Comentar', send: 'Enviar', likeAria: 'Curtir', commentsAria: 'Comentários',
        requestSent: 'Pedido enviado!', messageSent: 'Mensagem enviada!',
      },
      community: {
        title: 'Comunidade', icon: 'bubble', note: 'Canais por fase e círculos onde ninguém sabe quem você é.',
        kinds: { channel: 'canal', anon: 'anônimo' },
        noteAnon: 'Círculo anônimo: aqui você aparece como Coruja anônima.',
        noteOpen: 'Canal aberto, com profissionais verificadas.',
        composerPlaceholder: 'Escreva pra comunidade…', composerAria: 'Mensagem', typing: 'alguém está escrevendo…',
        meAnon: 'Coruja anônima (você)', me: 'Você',
        replyAnon: { icon: 'owl', who: 'Gaivota anônima' }, replyOpen: { icon: 'face4', who: 'Carol · mãe do Theo' },
      },
      exams: {
        title: 'Exames', icon: 'doc', note: 'Foto do exame, a vovó lê, explica e guarda. Tudo num lugar pra mostrar ao médico.',
        normal: 'normal', attention: 'atenção', add: 'Adicionar exame',
        kept: 'guardado em Exames', readBy: 'A vovó leu pra você', low: 'baixo', share: 'Compartilhar com o médico', original: 'Ver original',
        addNote: 'Tire uma foto do resultado. A vovó lê, explica e guarda.', takePhoto: 'Tirar foto', reading: 'Lendo o exame…', done: 'Lido e guardado!',
        newExam: { title: 'Exame de hoje', date: 'hoje', status: 'ok', read: 'Li e guardei. Está tudo dentro do esperado.', vals: [ok('Glicose', '86 mg/dL', '< 99'), ok('Colesterol total', '168 mg/dL', '< 190')] },
      },
      appointments: {
        title: 'Consultas', icon: 'bell', note: 'O pré-natal inteiro, semana a semana.',
        items: [{ name: 'Primeira consulta', when: 'feito', done: true }, { name: 'Ultrassom morfológico', when: 'feito', done: true }, { name: 'Curva glicêmica', when: 'semana 26', done: false }, { name: 'Consulta 28 semanas', when: 'semana 28', done: false }],
      },
      reminders: {
        title: 'Lembretes', icon: 'bell', note: 'A vovó lembra por você.',
        items: [{ name: 'Tomar vitamina', when: '08:00' }, { name: 'Registrar temperatura', when: '07:00' }, { name: 'Consulta', when: 'qui, 14:00' }],
      },
      pediatric: {
        title: 'Pro pediatra', icon: 'doc', note: 'Uma página pronta pra levar na consulta.',
        items: {
          kenji: [{ label: 'Peso', value: '12,4 kg · p55' }, { label: 'Altura', value: '86 cm · p40' }, { label: 'Vacinas', value: 'em dia' }, { label: 'Alergias', value: 'nenhuma' }, { label: 'Sono médio', value: '10h' }],
          lua: [{ label: 'Peso', value: '7,0 kg · p55' }, { label: 'Altura', value: '64 cm · p50' }, { label: 'Vacinas', value: 'em dia' }, { label: 'Mamadas', value: '7 por dia' }, { label: 'Sono', value: '14h por dia' }],
        },
      },
      growth: {
        title: 'Crescimento', icon: 'ruler',
        tabs: { weight: 'Peso', height: 'Altura', head: 'Cabeça' },
        chartTitles: { weight: 'Peso', height: 'Altura', head: 'Perímetro da cabeça' },
        curve: 'curva OMS', now: 'agora', percentile: 'percentil', nextMeasure: 'próxima medida',
        next: { kenji: 'hoje', lua: '12 nov' },
        milestones: 'Marcos',
        milestoneItems: {
          kenji: [{ icon: 'shoe', label: 'Andou', when: '13 meses' }, { icon: 'bubble', label: 'Primeiras palavras', when: '11 meses' }, { icon: 'star', label: 'Primeiro dente', when: '7 meses' }],
          lua: [{ icon: 'star', label: 'Rolou sozinha', when: '4 meses' }, { icon: 'baby2', label: 'Sorriso social', when: '2 meses' }],
        },
      },
      privacy: {
        title: 'Privacidade', icon: 'lock', note: 'Seus dados são seus.',
        items: [{ label: 'PIN e Face ID', value: 'ligado' }, { label: 'Nada é vendido', value: 'nunca' }, { label: 'Exportar tudo', value: 'a qualquer hora' }, { label: 'Apagar a conta', value: 'de verdade' }],
      },
    },
  },
}

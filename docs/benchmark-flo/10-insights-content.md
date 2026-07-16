# Flo Insights & Content — 30 Screen Benchmark

## Checkpoint 1: Screens 098–126 (10 screens)

### Screen #098 — Story Loading
- **Purpose:** Loading animation for content stories.
- **Text inventory:** (Spinner only, no visible text)
- **UI structure:** Full-screen dark background, centered loading spinner, bookmark icon (bottom), "Save this story for later" teal button.
- **Flow & logic:** Placeholder state while content loads; save-to-bookmarks available even during load.

---

### Screen #099 — Bloating Story (Reviewed by Expert)
- **Purpose:** Expert-reviewed story on bloating and dietary triggers.
- **Text inventory:** "REVIEWED BY" badge; "Sarina Schrager, MD" (photo + credentials: Professor (CSH), UW School of Medicine and Public Health, USA); "You logged bloating"; "Diet Tips"; "Which foods should you avoid?"
- **UI structure:** Expert profile card (photo, name, credentials, green checkmark); headline in large sans; illustrated character (pink hair, fork/knife, eating); colorful sticker-style food icons; "Save this story for later" button.
- **Flow & logic:** Log-triggered content (`You logged bloating` context); medical credibility via named expert bio + title; educational via visuals; saveable.

---

### Screen #100 — Bloating Content Slide (Educational)
- **Purpose:** Contextual education: why bloating happens and when to worry.
- **Text inventory:** "It's common to feel bloated after big meals"; "But persistent bloating may be a result of dietary choices"; "Watch out for these foods and drinks"
- **UI structure:** Full-width character illustration (pink hair, thoughtful); text hierarchy (display + body sans).
- **Flow & logic:** Reassurance + education pattern; illustrated persona makes medical content approachable.

---

### Screen #101 — Bloating Foods Guide (Sticker-Illustrated)
- **Purpose:** Visual reference for gas-causing foods grouped by category.
- **Text inventory:** "These foods are known to cause gas:"; categories: "beans, lentils, and peas" | "vegetables like cabbage, cauliflower, broccoli, and onions" | "whole-grain foods like wheat and oats" | "mushrooms" | "apples, bananas, and pears" | "beer and other carbonated drinks"; checkmark icon with teal background.
- **UI structure:** Pink background; white card; 6-item grid with sticker-style food icons + text labels; checkmark pill.
- **Flow & logic:** Categorized, visual-first reference; sticker icons aid memory; color-coded (teal checkmark highlights valid info).

---

### Screen #102 — Bloating Foods (Continuation Slide)
- **Purpose:** Personalization step: variance explanation.
- **Text inventory:** "The amount of gas these foods cause varies from person to person"; "Keep a food diary for a couple of weeks, noting what you eat and drink and when bloating appears — and adjust your diet accordingly"; illustrated journal/diary stickers.
- **UI structure:** Light pink background; centered sans text; diary/notebook illustration with pencils; actionable callout.
- **Flow & logic:** Moves from list to action; diary as call-to-action tool; personalization emphasis (not one-size-fits-all).

---

### Screen #103 — Symptom Log Call-to-Action
- **Purpose:** Nudge user to log symptoms in-app for future insights.
- **Text inventory:** "Log your symptoms in Flo regularly for more useful tips!"; character with wings (metaphor for tracking).
- **UI structure:** Light pink background; character illustration (pink hair, wings, holding phone showing symptom selector with 6 mood/symptom icons); "Save for later" button; bookmark icon.
- **Flow & logic:** Content → action loop; promises personalization if user logs; character reinforces friendly tone; low friction (save bookmark instead of push).

---

### Screen #104 — Save Confirmation Toast
- **Purpose:** Confirmation that content was bookmarked.
- **Text inventory:** "Successfully saved! Click here to see all your bookmarks"
- **UI structure:** Teal toast at bottom of screen; white text; clickable link to bookmarks hub.
- **Flow & logic:** Immediate feedback for save action; low-friction navigation to curated collection.

---

### Screen #124 — Insights Hub (Home/Discovery)
- **Purpose:** Tab for personalized content discovery based on cycle/symptom logs.
- **Text inventory:** Search placeholder; tab labels: "Today", "Insights" (active), "Secret Chats", "Messages", "Partner"
- **UI structure:** Skeleton loading state; search bar; 3-column pill carousel; section headers; 2-column card grid (articles/videos); bottom tab bar.
- **Flow & logic:** Loading state; search + browse dual discovery; content organized by mood/log context; section headers create narrative flow.

---

### Screen #125 — Insights Detail: Your Fertile Days (Personalized)
- **Purpose:** Phase-specific content hub showing today's cycle phase + themed content.
- **Text inventory:** "Your fertile days"; "March 15 • Cycle day 15"; "Orgasms and pleasure" | "Vaginal discharge" | "How to get pregnant" (3 action tiles); "Reproductive health 101" (section header); "Vaginal discharge color guide" | "How to clean your vulva" | "E..." (truncated); "Sex" (section); "9 life-changing masturbation tips" (video course badge); "Mastering your orgasm" (video); tab bar.
- **UI structure:** Light gradient background; 3-icon-action tiles; multi-column card grid (colored backgrounds per topic); video badges; "Video Course" overlay.
- **Flow & logic:** Cycle-day aware (shows "Cycle day 15", fertile window); phase-driven content hierarchy (Orgasms/pleasure prioritized); discovery via topical sections; video/course content mixed in; tabs create secondary navigation.

---

### Screen #126 — Insights: Common Sex Worries (Curated Topic)
- **Purpose:** Curated collection under "sex" category, surfacing taboo/shame topics.
- **Text inventory:** "Common sex worries"; "A doctor reacts" (video label); "Masturbation shame"; "A guide to period masturbation"; "The lowdown on late periods" (section); "Early signs of pregnancy" | "What counts as a late period?"; "Safer sex" (section); colored backgrounds distinguish sections.
- **UI structure:** Light background; multi-column card layout; video play badge; color-coded card backgrounds (blue, pink, yellow per topic); section headers.
- **Flow & logic:** Sensitivity-aware naming ("worries" not "problems"); expert video content for shame topics; normalized language; content grouped by use-case (early pregnancy signs, late periods, safer sex); color coding creates visual hierarchy.

---

## Checkpoint 2: Screens 127–145 (19 screens)

### Screen #127 — Insights: Content Grid (Continued Discovery)
- **Purpose:** Continued editorial browsing after fertile-day context.
- **Text inventory:** "Tilted uterus: Need-to-knows" | "Living with uterine fibroids"; "OB-GYN's choice" (section); "How to recognize yeast infections" | "How to clean your vulva"; "Flo recommends" (section); "What causes irregular cycles" | "Why I'll never shave again" (with author/testimonial); article titles truncated.
- **UI structure:** Multi-column card grid; section headers; colored backgrounds per card (pink, blue, peach); no extra badges visible.
- **Flow & logic:** Topics ordered by: (1) condition-specific (tilted uterus, fibroids), (2) expert-curated, (3) editor-recommended; editorial voice + user voices mixed.

---

### Screen #128 — Article Detail: Irregular Cycles (Expert Review)
- **Purpose:** Full-article view with expert bio, topic overview, and related content.
- **Text inventory:** "What causes irregular cycles"; pink circle with heart icon; "Reviewed By"; "Flo Medical Board, 100+ doctors and experts from Europe and North America"; article preview: "If you menstruate, you're probably going to experience an irregular period at some point in your life. Check out what makes periods irregular and ways to try to regulate them."; related articles with thumbnails: "What can cause late periods and irregular cycles?" | "How the thyroid affects the female reproductive system" | "Why are there breaks in your flow?" | "What causes scanty periods" | "Two periods in one month: What's the cause?" | "How to make your cycle regular" | "Your period has started early. Is this normal?" | "What can cause your period to start earlier?"; scroll indicator.
- **UI structure:** Article header with icon; expert credential card (pink badge, multi-line bio); rich-text body; thumbnail-based related articles section (6-8 visible in scroll list); stacked cards with icons + excerpt.
- **Flow & logic:** Medical board credibility (100+ doctors); content teaser; related articles serve as next-read suggestions; visual hierarchy (expert first, then overview, then related); cards are scannable (icon + title + preview text).

---

### Screen #129 — Article: Irregular Cycles Related Articles
- **Purpose:** Scrollable list of related deep-dive articles.
- **Text inventory:** "What causes irregular cycles" (title, from 128); "What can cause late periods and irregular cycles?" | "How the thyroid affects the female reproductive system" | "Why are there breaks in your flow?" | "What causes scanty periods" | "Two periods in one month: What's the cause?" | "How to make your cycle regular" | "Your period has started early. Is this normal?" | "What can cause your period to start earlier?"; each with preview text (preview truncated to 1–2 lines).
- **UI structure:** Vertically stacked cards, each with colored thumbnail icon + title + preview excerpt; scroll indicates more below.
- **Flow & logic:** Topic sprawl (user browsing related symptoms); each card is scannable and clickable; icons aid visual distinction.

---

### Screen #130 — Insights Loading (Personalization)
- **Purpose:** Loading state for personalized insights generation.
- **Text inventory:** Title "Insights"
- **UI structure:** Skeleton placeholder cards; light gray background; indicates content is being generated.
- **Flow & logic:** Transparent loading feedback.

---

### Screen #131 — Article Detail: Late Periods (Expert Review + Deep-Dive)
- **Purpose:** Full expert article on irregular cycles, categorized by cause type.
- **Text inventory:** "What can cause late periods and irregular cycles?" (title); "Reviewed By"; "Dr. Lee P. Shulman, Professor of obstetrics and gynecology, Northwestern University, Illinois, US, 30+ years in obstetrics and gynecology"; article image (contraceptive pills); body text: "The absence of menstruation doesn't necessarily indicate pregnancy. Other explanations for late periods and irregular cycles can be divided into three categories:"; bullet points: "Physiological: stress, sudden weight changes (especially a weight loss of 10 to 15 percent or more), strenuous exercise, frequent climate or time zone changes, breastfeeding, etc."; "Medical: taking or discontinuing medications, including hormonal contraceptives, certain antihistamines, or antidepressants"; "Pathological: polycystic ovaries, uterine disorders or anomalies, or endocrine system disorders, etc."; "If your periods are at least 10–14 days late, it's best to consult a doctor. However, if you had unprotected vaginal intercourse during your last cycle, you may want to take a pregnancy test first."; "References" (collapsible section).
- **UI structure:** Expert bio (photo, credentials); full article body with rich formatting (bullets, emphasis); "Up next" section links to related article.
- **Flow & logic:** Expert credibility (photo + bio + 30+ years); medical categorization (physiological, medical, pathological) clarifies complexity; actionable guidance (when to see doctor, when to test); references for transparency.

---

### Screen #132 — How to Get Pregnant (Pre-Pregnancy Hub)
- **Purpose:** Top-level entry point for TTC (trying-to-conceive) topic cluster.
- **Text inventory:** "How to get pregnant"; tagline: "Thinking about trying to conceive? Here's everything you'll need to kick-start the process."; search bar; action tiles: "Stop birth control" | "Understand ovulation" | "H[...]" (truncated); "Common questions answered" (section); Q&A items: "How can weight affect how long it takes to get pregnant?" (dropdown) | "What happens if you drink alcohol without knowing you're pregnant?" | "Which has a bigger impact on fertility: age or lifestyle?" | "Is vaping safer than smoking when trying to conceive?" (4 visible dropdowns); "Understanding your chances" (section).
- **UI structure:** Blue hero background with pregnancy test hero image; search bar; 3-column action tile carousel; 2-column Q&A dropdowns (gray backgrounds); section headers.
- **Flow & logic:** Topic entry point (blue color distinct from cycle/pregnancy); search + browse dual paths; FAQ pattern (common questions); action tiles for guided workflows; "Understanding your chances" teases related topic.

---

### Screen #133 — How to Get Pregnant (Action Tiles Variant)
- **Purpose:** Alternative view of TTC hub with different action tile set.
- **Text inventory:** Same layout as 132; action tiles: "Take prenatal vitamins" | "Focus on nutrition" | "Upg[radeLIFESTYLE]" (truncated); "Common questions answered" section.
- **UI structure:** Identical to 132; only action tiles differ (prenatal, nutrition, lifestyle swapped in).
- **Flow & logic:** Content personalization; shows multiple action paths for TTC (stop BC, understand ovulation, vitamins, nutrition, lifestyle); system adapts tiles based on user profile or scroll state.

---

### Screen #134 — How to Get Pregnant (Understanding Chances Section)
- **Purpose:** Mid-scroll section showing content cards for fertility topics.
- **Text inventory:** "Understanding your chances" (section header); "Can I get pregnant my first cycle trying?" (1 min watch, video); "How long should it take to get pregnant?" (9 min read); "Ho[...]" (truncated, additional article); "Checkups you'll need" (section); "Visit this doctor before trying" | "Check your teeth before a baby" | "Who needs extra appointments?" (3 sticker-icon action cards); "Foods for fertility" (section); "Recipe #1 Overnight oats" | "Recipe #2 Quinoa stir-fry" | "Recipe #3 Energy balls" (3 recipe cards with photos); "Prepregnancy fitness" (section); "Beginner legs & core workout" | "Beginner arms, back & core workout" | "Intermediate arms, back & core workout" (3 cards).
- **UI structure:** Stacked sections; mixed content types (video + article, action cards, recipe cards, workout cards); each has thumbnail/icon + title + metadata (duration, recipe format, difficulty).
- **Flow & logic:** Curated journeys: (1) learning (video + articles), (2) health checkups, (3) recipes, (4) fitness; content types signal engagement depth (video < read < recipe < workout); accessibility via icons/photos.

---

### Screen #135 — TTC Content Continued (Recipes & Fitness)
- **Purpose:** Scrollable view of TTC recipes and prepregnancy fitness.
- **Text inventory:** "Foods for fertility" (section); "Recipe #1 Overnight oats" | "Recipe #2 Quinoa stir-fry" | "Recipe #3 Energy balls" (titles, recipe format); "Prepregnancy fitness" (section); "Beginner legs & core workout" | "Beginner arms, back & core workout" | "Intermediate arms, back & core workout" (titles, workout names); scroll indicator.
- **UI structure:** Horizontally scrollable card sections; colored backgrounds per recipe (warm tones, cool tones); same for fitness (warm, cool).
- **Flow & logic:** Horizontal scroll discovers sub-content within a topic; recipes + fitness as complementary pillars of fertility prep.

---

### Screen #136 — Q&A Article: Weight & Fertility (Expert Answer)
- **Purpose:** Expanded Q&A article from TTC hub, answered by expert.
- **Text inventory:** "How to get pregnant" (breadcrumb); "Common questions answered" (section); "How can weight affect how long it takes to get pregnant?" (question, now expanded with answer); "Answered by Dr. Sara Twogood" (expert); answer text: "First up — know that there's so much more to health than just the number on a scale, and lots of people conceive no matter their weight. But clinically speaking, being under or overweight can make the road to conception a longer one. The reason? Well, weighing more or less might affect your reproductive hormones and menstrual cycle and can sometimes stop you from ovulating and having a period. Speak to your health care provider to find out a weight that's healthy for you."; additional dropdowns: "What happens if you drink alcohol without knowing you're pregnant?" | "Which has a bigger impact on fertility: age or lifestyle?" | "Is vaping safer than smoking when trying to conceive?"
- **UI structure:** Q&A card layout; question in large sans; expert badge with checkmark; rich-text answer body; related Q dropdowns below.
- **Flow & logic:** Answer structure: (1) reassurance ("people conceive no matter their weight"), (2) clinical explanation (hormones, menstrual cycle), (3) action (consult provider); expert credibility + nuance = trust in sensitive topic.

---

### Screen #137 — TTC Content Grid (Recipes, Fitness, Community)
- **Purpose:** Editorial browsing for TTC: recipes, fitness, community.
- **Text inventory:** Food recipes continuation; "Prepregnancy fitness" cards; "Fertility-friendly living" (section); "Safe skin care for pregnancy" | "Sleep tips for fertility" | "Cannabis and fertility: The facts" (3 wellness cards); "Discussions in the Flo community" (section); "Getting Pregnant Newbie Club"; "Tracking ovulation while trying to conceive: Share your favorite methods"; "20.2K comments >" (community thread metrics).
- **UI structure:** Multi-section scrollable view; colored card backgrounds per topic; community section has circle avatar (community indicator) + discussion title + engagement metric.
- **Flow & logic:** TTC content spans how-to (fitness, recipes), wellness (self-care), community (peer wisdom); community thread as trust-builder ("20.2K comments" signals active discussion).

---

### Screen #138 — Insights: TTC Variant (Different Lifestyle Cards)
- **Purpose:** Alternative variant showing different action paths from 125.
- **Text inventory:** Same top section as 125 ("Your fertile days", phase-specific tiles, tabs); "Reproductive health 101" with "Birth control 101" (video course card), additional cards; "Sex" section with "9 life-changing masturbation tips", "Mastering your orgasm" cards.
- **UI structure:** Identical to 125; different content featured.
- **Flow & logic:** Content variants based on user state/phase; shows Flo's multi-format strategy (how-tos, video courses, expert articles).

---

### Screen #139 — Birth Control 101 (Video Course Landing)
- **Purpose:** Course landing page for contraception video series.
- **Text inventory:** "Birth control 101" (title); hero image (contraceptive pills); "Written By Dr. Staci Tanouye, Obstetrician and gynecologist, private practice, Florida, US, 10+ years in obstetrics and gynecology"; "Thinking about birth control? You're not alone! Over 99 percent of reproductive-age women will use at least one form of birth control during their lives. Explore all methods of contraception, their efficacy, factors to consider when choosing birth control and common myths about it."; "Welcome to birth control 101 series" (video, 00:52); "Read before you start" (article card with illustration); "Episode 1. Birth control basics" (video, 03:58).
- **UI structure:** Course header (title + expert bio); hero image; course overview text; series navigator showing 1st video, pre-read article, first episode.
- **Flow & logic:** Course structure: welcome video → pre-read → episodic videos; expert credibility + statistics (99%) to validate topic importance; episodic format lowers friction (bite-sized, not one long video).

---

### Screen #140 — Birth Control 101 Series (Episode List)
- **Purpose:** Scrollable list of video episodes in birth control course.
- **Text inventory:** "Welcome to birth control 101 series" (00:52 video); "Read before you start" (article); "Episode 1. Birth control basics" (03:58); "Episode 2. Long-Acting reversible contraceptives" (04:44); "Episode 3. The pill" (05:18); "Episode 4. The patch, ring, and injection" (05:21); "Episode 5. Non-Hormonal birth control" (07:11); "Episode 6. Birth control myths and FAQs" (08:54).
- **UI structure:** Vertically stacked episode cards; each with play icon, episode number, title, duration; scrollable list.
- **Flow & logic:** Serial learning path; episode durations increase (scaffolding complexity); episode 6 addresses myths (objection-handling); 8 episodes = 40 min total (binge-watchable).

---

### Screen #141 — Video Loading State (Episode)
- **Purpose:** Loading spinner during episode playback.
- **Text inventory:** Flo logo watermark
- **UI structure:** Full-screen black background; loading spinner; Flo logo (bottom).
- **Flow & logic:** Minimal loading state indicates video player.

---

### Screen #142 — Video Playing (Birth Control Explainer)
- **Purpose:** In-video playback view with captioning.
- **Text inventory:** Video content: "will use at least one form of birth control during their lives?" (caption visible at bottom); "So if you're thinking about sex and birth control," (caption).
- **UI structure:** Full-screen video player; speaker icon (audio control); caption at bottom; Flo branding (top-left watermark).
- **Flow & logic:** Video-first content; captions enable sound-off viewing (important for mobile context); conversational tone in video script.

---

### Screen #143 — Video Paused (Birth Control Episode)
- **Purpose:** Paused video state with playback controls.
- **Text inventory:** Video caption visible; pause/play button centered; duration scrubber bar showing 00:09 / 00:51.
- **UI structure:** Video frame paused; pause button overlay; scrubber bar with time codes.
- **Flow & logic:** Standard video player UX; low friction to resume.

---

### Screen #144 — Birth Control Episode List (Revisited)
- **Purpose:** Return to episode list (same as #140).
- **Text inventory:** Episode list repeated.
- **UI structure:** Identical to 140.
- **Flow & logic:** Navigation back to course outline after video; carousel or series nav to next episode.

---

### Screen #145 — Bookmarks Hub (Saved Content)
- **Purpose:** Personal curation view of saved stories and topics.
- **Text inventory:** "Bookmarks" (title); "Stories" (section); "BLOATING" (topic tag, pink); "Which foods should you avoid?" (saved story card, with uterus icon); "Topics" (section); "What causes irregular cycles" (topic card, pink background with irregularity icon).
- **UI structure:** Two-section layout (Stories, Topics); saved items displayed as cards; topic tags; icon + title per item.
- **Flow & logic:** Personal library created via "save for later" CTAs; stories = short-form curated content, topics = deeper articles; enables easy return to valuable content.

---

### Screen #277 — Insights Tab Dark Theme
- **Purpose:** Dark-theme variant of Insights hub (same as 125, dark colors).
- **Text inventory:** "Your fertile days"; "March 15 • Cycle day 15"; action tiles: "Orgasms and pleasure" | "Vaginal discharge" | "How to get pregnant"; "Reproductive health 101", "Vaginal discharge color guide", "How to clean your vulva"; "Sex" section; card titles.
- **UI structure:** Dark background (dark gray/charcoal); same layout as 125; text inverted (white), card backgrounds darker.
- **Flow & logic:** Dark mode support; content structure unchanged.

---

## Synthesis

**Content Format Inventory:**
- Stories (expert-reviewed, log-triggered, 2–5 slide decks)
- Articles (long-form, expert-authored, with related-links)
- Video courses (episodic, 3–8 min per episode, 5–10 episodes per course)
- Video explainers (in-course, 30–90 sec)
- Q&A (FAQs, dropdown-based)
- Recipes (photo-heavy, quick browse)
- Workouts (video + difficulty labels)
- Community discussions (peer-moderated, engagement metrics)
- Checklists/action cards (visual icons, task-driven)

**Content Topic Map:**
- By cycle phase (fertile window, period, ovulation)
- By life stage (TTC → pregnancy → postpartum)
- By pillar (reproductive health, sex/pleasure, wellness, fitness, nutrition)
- By use case (symptoms logged → personalized content fed back)

**Credibility Strategy:**
- Named expert bios (photo, title, institution, years of experience)
- Medical board badges ("Reviewed By: 100+ doctors")
- Data points (statistics like "99% of women use birth control")
- References section (links to sources)
- Video personalization (real doctors/educators on-camera)

**Personalization Engine:**
- Phase-driven (cycle day detected → fertile window content prioritized)
- Log-triggered (symptom logged → related stories auto-surfaced)
- Bookmark history (saved items create personal library)
- Multi-format choice (video vs. article vs. recipe vs. workout)

**Discovery Mechanics:**
- Search bar (keyword-driven)
- Carousel tiles (action-driven TTC pathway)
- Section headers (editorial narrative flow)
- Related articles (linked at article bottom)
- Trending community threads (social proof)
- Save/bookmark (collection-building UX)

**Top Wins for Grandma.app:**
1. **Expert credibility badges** — photo + title + institution overcomes skepticism in parenting content
2. **Log → Content loop** — symptom tracking feeds personalized insights (not generic tips)
3. **Multi-format content** — video, article, recipe, worksheet serve different learning styles
4. **Episodic courses** — 5–10 short videos < 1 long guide (mobile-friendly, binge-able)
5. **Community threads with metrics** — "20K comments" signals trusted peer wisdom (not just top-down)
6. **Dark mode parity** — content UX identical in light/dark (not an afterthought)
7. **Scrollable discovery sections** — horizontal "Fitness", "Recipes", "Wellness" let users discover without deep nav

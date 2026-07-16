# Flo Secret Chats (Community) — 40-Screen Benchmark

**Date:** 2026-07-16 | **Focus:** Anonymity model, safety, moderation, engagement mechanics, topic organization

---

## CHECKPOINT 1: Screens 146–165 (Intro, Rules, Moderation, Topic Feed, Search)

### Screen 146 — Notifications
- **Purpose:** Alert user to new community guidelines  
- **Text:** "Introducing Secret Chats Rules! 🙌" | "Several guidelines to keep things safe and fun for everyone" | "Take a look >"
- **UI structure:** Pink banner card with icon + CTA link  
- **Flow & logic:** Notification entry point for rules disclosure

### Screen 147 — Secret Chats Rules (Intro)
- **Purpose:** Explain the community purpose and baseline expectations  
- **Text:** "Effective as of November 21, 2022" | "Welcome to the Flo Secret Chats — a safe digital community where you can anonymously discuss health- and wellness-related topics and get support from millions of other Flo users worldwide" | "The following rules apply to all user-generated content and activity in our Secret Chats community. Please familiarize yourself with our rules and help us keep things safe and enjoyable for everyone"  
- **UI structure:** Peach header graphic (checklist/document illustration) | Body text in two sections  
- **Flow & logic:** Onboarding-style rule disclosure; emphasis on anonymity + peer support

### Screen 148 — Secret Chats Rules (Appeals Process)
- **Purpose:** Detail enforcement appeals pathway  
- **Text:** Appeal submission process | "Once your appeal has been reviewed, we will reply by email to notify you of your appeal and account(s) status" | "Remember that appeals are reviewed in the order they are received, and we do not guarantee suspensions will be overturned" | Further Information & Resources | Links to Terms of Use, Privacy Policy, Crisis Support Center  
- **UI structure:** Plain text body | Hyperlinked resources  
- **Flow & logic:** Transparency in moderation + appeal fairness; external trust signals

### Screen 149 — Popular Feed + Highlights
- **Purpose:** Discover trending + curated content  
- **Text:** "You logged 'Bloating', how do you feel?" | "Get support and chat about it below with other Flo members 🤝" | Tabs: "Popular", "Following", "Saved", "My comments" | "Archived: Ask an Expert · Follow" | "Premium" badge | "Your top questions about healthy eating, answered by a dietitian. Read here!" | Post engagement: "1.9K ❤️ | 758 💬" | Excerpt: "I am having issues gaining weight and since don't hear as much about underweight issues…"  
- **UI structure:** Segmented tabs (pink active) | Image card with expert photo + premium badge | Post card with avatar + text + engagement metrics  
- **Flow & logic:** Hybrid discovery (trending + curated expert sessions) | Premium content gated | Follow/Save mechanics

### Screen 150 — Trending Post Detail (Weight Gain)
- **Purpose:** Display full post + comment count + related interests  
- **Text:** Full post text on weight gain & protein/fiber recommendations | "View all 758 comments" | Interests sidebar: "Acne Control", "Eating Healthy", "Cleansing" (3 cards with product/health imagery)  
- **UI structure:** Post card | Expandable comment link | Interest carousel below  
- **Flow & logic:** Post discovery + interest-driven recommendation engine

### Screen 151 — Contraception Topic Card
- **Purpose:** Topic-specific room entry  
- **Text:** "Contraception · Follow" | Hero card: "Share your experience with the pullout (withdrawal) method here" | "18+" badge + "Content is available for 18+ users only" | Engagement: "19K ❤️ | 44.4K 💬" | Top comment: "I hate it when the hubby pulls out though.. Just doesn't feel like a complete transaction 😂 am I the only one that feels like this"  
- **UI structure:** Topic header + follow button | Age-gated hero image (purple, stylized body illustration) | Engagement metrics | Comment preview  
- **Flow & logic:** Age-gating for sensitive content (18+) | Explicit topic scoping

### Screen 152 — Menstruation FAQs (Poll)
- **Purpose:** Crowdsource cycle data via interactive poll  
- **Text:** "Menstruation FAQs · Follow" | "How many days do your periods usually last?" | Options: "3 days or less", "4–7 days" (43% selected, highlighted in pink), "8–10 days", "11+ days", "Different each cycle" | Poll response shown with percentages  
- **UI structure:** Topic header | Poll UI with radio buttons | Color-coded selected state | Percentages overlaid  
- **Flow & logic:** Democratized health insights via user voting; trending answers ranked

### Screen 153 — Menstruation FAQs (Comments)
- **Purpose:** Discuss poll topic  
- **Text:** Same poll (now showing 4–7 days selected) | Comment from user: "I've been tracking my menstrual cycle for a few months now, and it's fascinating how my body goes through different phases each month. The first few days are always a bit uncomfortable with cramps and fatigue, but then I notice a shift towards more energy and mood stability during the ovulation phase. It's like my body is on its own unique schedule, and understanding it better has been really empowering!"  
- **UI structure:** Input field: "Write a comment..." | Keyboard visible  
- **Flow & logic:** Reply composition entry point

### Screen 154 — Search (Popular Requests)
- **Purpose:** Guided search discovery  
- **Text:** "Popular requests" with quick-access topics: "meditation", "skin", "brown discharge", "nausea", "pregnancy test"  
- **UI structure:** Search bar at top | Icon-labeled history shortcuts  
- **Flow & logic:** Reduce friction for first-time query; trending search terms surfaced

### Screen 155 — Search (Typed Query)
- **Purpose:** Auto-complete search  
- **Text:** User types "pre menst" → "pre menstrual symptoms" appears as auto-complete suggestion  
- **UI structure:** Search bar with X clear + Cancel button | Typeahead dropdown  
- **Flow & logic:** Predictive search reduces friction

### Screen 156 — Search Results (Loading)
- **Purpose:** Skeleton loader during search  
- **Text:** (blank — placeholder shimmer state)  
- **UI structure:** Repeating avatar + text placeholder bars  
- **Flow & logic:** Loading state transparency

### Screen 157 — Comment Composition
- **Purpose:** Typing interface  
- **Text:** Same poll question + options | Input: "Write a comment..." | User starts typing partial response about cycle phases  
- **UI structure:** Keyboard open | Text input field  
- **Flow & logic:** Mobile keyboard-aware input

### Screen 158 — Comment Sort (Tabs)
- **Purpose:** Sort comments by recency or popularity  
- **Text:** Tabs: "Top", "Newest", "My" | Same poll question | First comment visible below tabs  
- **UI structure:** Segmented tabs (pink "Top" active) | Comment preview  
- **Flow & logic:** Multi-sort strategy for comment discovery

### Screen 159 — Search Results (Pre-Menstrual Symptoms)
- **Purpose:** Topic discovery via search  
- **Text:** Query: "pre menstrual symptoms" | Secret Chats section: "Sleep" (topic + "What are your pre-sleep rituals?" + "3.2K comments >") | "Weight Journey" ("Have weight fluctuations ever affected your menstrual cycle?" + "479 comments >") | "Acne Control" ("Pre-period acne: How do you prevent it?" + "3.1K comments >") | "See all Secret Chats" button | Interests section below: "Reusable Period Items" + "Pre-Pregnancy Checkups" (2 cards)  
- **UI structure:** Search bar | Topic list cards | Interest carousel  
- **Flow & logic:** Blended results (Secret Chats topics + related interests); topic scoping

### Screen 160 — Search Result Detail (Related)
- **Purpose:** Show replies to a specific search result  
- **Text:** Same results page | Replies section: Anonymous user ("GUYS") comments: "SO PMS MEANS PRE MENSURAL SYNDROME BUT I SOMETIMES HAVE PMS..." (29 ❤️) | Next reply: "I usually experience PMS symptoms only after my period is done...." (6 ❤️) | Third: "protected and unprotected sex at same time with my boyfriend 9 days ago.. my period is suppose to be tomorrow but i never felt any pre-..." (0 ❤️) | Fourth: "I always have pre-menstrual cramps . and also feel like having sex ...." (3 ❤️)  
- **UI structure:** Reply cards with avatar + text + like count  
- **Flow & logic:** Deep thread discovery; like-based ranking

### Screen 161 — Full Thread View
- **Purpose:** Expanded comment with metadata  
- **Text:** Same comment visible in full (previously truncated) | Engagement: "29 ❤️"  
- **UI structure:** Full comment card | Like button state  
- **Flow & logic:** Tappable expansion for context

---

## CHECKPOINT 1 SUMMARY

| Dimension | Finding |
|-----------|---------|
| **Community structure** | Topic-organized (Contraception, Menstruation FAQs, Sleep, Weight Journey, Acne, etc.) | rooms accessed via search or Popular feed; hybrid discovery (trending + curated expert sessions) |
| **Anonymity model** | Full anonymity guaranteed (no usernames shown, avatar-only); age-gating with 18+ badges for sensitive topics |
| **Safety/Moderation** | Documented rules (Nov 2022); appeals process transparent; offline external resources (Crisis Support Center) |
| **Engagement mechanics** | Hearts (likes), comment counts, polls with live voting (%, user count), save bookmarks, follow topics, sort by Top/Newest/My |
| **Content moderation** | Age-gate enforcement (18+ topics), explicit topic scoping, rules referenced; no visible moderation UI yet in these screens |
| **Trust signals** | Expert "Ask an Expert" room + Premium badge, Terms/Privacy/Crisis links, rule transparency, community vote aggregation |

---

## CHECKPOINT 2: Screens 166–175 (Topic Detail, Moderation, Interest Management, Expertise Badges)

### Screen 166 — Search Results (Comment Replies)
- **Purpose:** Display threaded discussion  
- **Text:** Query: "pre menstrual symptoms" | Comments from search result: "Im only a week away but my pre-menstrual symptoms are insane...." (1 ❤️) | "At 3–4 weeks I had a surge of energy which was unlike my usual pre menstrual symptoms. Usually I'm exhausted...." (1 ❤️) | "I usually get a wet ass pussy and horny as hell but this time I got pre menstrual symptoms, extreme fatigue and moody and then..." (5 ❤️) | "Like pre menstrual feeling just weird, emotionless and so uncoordinated...." (59 ❤️) | "See all Replies" CTA
- **UI structure:** Stacked comments with varying engagement | Thread expansion link  
- **Flow & logic:** Deep nesting shows conversational threads; high-engagement comments float up

### Screen 167 — Topic Detail (Pre-Period Acne)
- **Purpose:** Topic hero + comment sorting  
- **Text:** Topic: "Pre-period acne: How do you prevent it?" | Hero image (woman looking in mirror) | Engagement: "5.5K ❤️" | Comment sort tabs: "Top", "Newest", "My", "Expert" | Top comment: "I prevent it by not looking in the mirror. If I can't see it, it must not be there" (2.7K ❤️, posted "2y") | Next comment: "But I feel it on my face😭" (5 ❤️, posted "4w") | Input: "Write a comment..."  
- **UI structure:** Full-width hero | Tab-based comment filter | Like state toggle (heart outline → filled)  
- **Flow & logic:** Four-tab sort strategy (Top/Newest/My/Expert); expert tab surfaces verified answers

### Screen 168 — Topic Detail (Like Toggle State)
- **Purpose:** Show like interaction feedback  
- **Text:** Same topic | Like button toggles from outline → filled red | Same comments  
- **UI structure:** Animated like button (fills on tap)  
- **Flow & logic:** Visual feedback for engagement action

### Screen 169 — Topic Detail (Bookmark Toggle)
- **Purpose:** Save topic for later  
- **Text:** Same topic | Bookmark icon toggles from outline → filled black  
- **UI structure:** Top-right bookmark button  
- **Flow & logic:** Persistent reading list feature

### Screen 170 — Archived Expert Session (Premium)
- **Purpose:** Display read-only expert Q&A  
- **Text:** "Your top questions about healthy eating, answered by a dietitian. Read here!" (Premium badge) | Engagement: "1.9K ❤️" | Tabs: "Top", "Newest", "My", "Expert" | Moderation note: "Reviewed by Florence, Community Manager" | "The AMA session with registered dietitian Angie Asche took place on November 9, 2022. The session is now archived (read-only). The expert is no longer present in the chat, and no more questions may be posted. You can find some helpful FAQs and expert replies below by clicking on the Expert tab." | Read-only notice: "This chat is read-only, you can't post anything here"  
- **UI structure:** Info card + status message (lock icon) | Moderator badge (checkmark next to name)  
- **Flow & logic:** Archived sessions freeze post date; moderate indicates curation

### Screen 171 — Expert Tab Comment
- **Purpose:** Show expert-verified answer within archived session  
- **Text:** Same topic + tabs | Top user comment (long-form, 409 ❤️) | Moderator "Florence" (with checkmark badge) + "Community Manager" label | Expert reply text | Read-only notice  
- **UI structure:** Avatar with badge/label | Verified checkmark icon  
- **Flow & logic:** Moderator comments flagged with credentials + verification badge

### Screen 172 — Comment Moderation Menu
- **Purpose:** User report/block options  
- **Text:** Three-dot menu → "Report comment", "Report user", "Block user", "Cancel"  
- **UI structure:** Modal menu (rounded sheet)  
- **Flow & logic:** User-initiated moderation; three pathways (content, user, blocking)

### Screen 173 — Report Confirmation
- **Purpose:** Confirm report submission  
- **Text:** Checkmark icon | "Thank you!" | "Our team will check if this content goes against our Community guidelines." | "OK" button  
- **UI structure:** Success modal with icon + text  
- **Flow & logic:** Immediate feedback; transparent review promise

### Screen 174 — Topic Context Menu (Hide/Manage Interests)
- **Purpose:** Topic preference controls  
- **Text:** Three-dot menu from feed → "Hide this topic", "Manage your interests", "Cancel"  
- **UI structure:** Modal sheet with two text options  
- **Flow & logic:** User personalization + discovery control

### Screen 175 — Interests Management
- **Purpose:** Browse and curate topic subscriptions  
- **Text:** "Interests" header | Tab segmentation: "My ❤️", "All", "Period & Cycle", "Harmony & Balance" | Period & Cycle section: "Menstruation FAQs" (with heart filled), "Period & Cycle Talk", "PMS Survival Guide", "Irregular Cycles", "Heavy Periods", "Reusable Period Items", "Perimenopausal & Menopause" | Harmony & Balance section: "Your Mental Health" | Heart + mute icons per item  
- **UI structure:** Category-segmented list | Toggle favorites via heart icon | Mute/hide options  
- **Flow & logic:** Interest subscriptions browsable by category; one-tap follow/unfollow

---

## CHECKPOINT 2 SUMMARY

| Dimension | Finding |
|-----------|---------|
| **Moderation UX** | User-initiated reporting (Report comment / Report user / Block user); success confirmation; flagged moderator comments with checkmarks + title |
| **Expert designation** | "Expert" tab in all threads; archived expert sessions labeled "Premium" + read-only + moderator attribution |
| **Engagement signals** | Like, bookmark, report, block, hide topic, manage interests all per-post/per-topic actions |
| **Notification** | Moderator-attributed replies in expert tabs; verification checkmarks next to Community Manager names |
| **Interest discovery** | Interests organized by category (Period & Cycle, Harmony & Balance); follow/mute toggles per interest; "My ❤️" personalizes feed |
| **Archive strategy** | Expert sessions archived with lock + read-only notice + moderator context; maintains reference value while freezing new questions |

---

## CHECKPOINT 3: Screens 176–184 (Full Interest Catalog, Block/Unblock Flows, Hide & Undo)

### Screen 176 — Interests (Harmony & Balance + Health)
- **Purpose:** Display categorical topic subscriptions  
- **Text:** Tab: "My ❤️", "All", "Period & Cycle", "Harmony & Balance" (active) | Harmony & Balance section: "Your Mental Health", "Social & Emotional Intelligence", "Let It Go & Move On", "Self-Love & Self-Care" | Health section: "General Health", "Medical Care", "Intimate Health & Hygiene", "Healthy Lifestyle" | Heart + mute toggle icons per item  
- **UI structure:** Scrollable category tabs | Item cards with iconography + toggle buttons  
- **Flow & logic:** Exhaustive topic catalog across health/lifestyle dimensions

### Screen 177 — Interests (Extended Catalog)
- **Purpose:** Show all topic categories (Maternity, Medical, Flo Community, Premium)  
- **Text:** Continued scrolling: "Breastfeeding & Formula", "Working Parents", "Parenthood" | Medical Topics: "Cervical Health", "PCOS Control", "Endometriosis Support" | Flo Community: "Chit-Chat" | Premium Content: "Archived: Ask an Expert" (with filled heart)  
- **UI structure:** Grouped sections with section headers | Toggle buttons (heart/mute)  
- **Flow & logic:** Premium content flagged and discoverable; all toggles persistent

### Screen 178 — Block Interest Confirmation
- **Purpose:** Confirm topic blocking/muting  
- **Text:** Modal: "Block PCOS Control?" | "If you block PCOS Control, we will stop showing discussions from this group. You can always change it later." | Buttons: "Cancel" (blue), "Block" (red)  
- **UI structure:** Confirmation modal with explanation + dual buttons  
- **Flow & logic:** Destructive action requires confirmation; explains consequence; reversible

### Screen 179 — Block State (Icon Change)
- **Purpose:** Visual feedback on blocked interest  
- **Text:** Same Interests view | PCOS Control now shows mute icon (filled/active, pink circular icon with slash)  
- **UI structure:** Toggled icon state (from outline to filled)  
- **Flow & logic:** State change is immediate and visually distinct

### Screen 180 — Interests (Period & Cycle Tab)
- **Purpose:** Filter view to single category  
- **Text:** Tab: "Period & Cycle" (active, pink) | Items: "Menstruation FAQs" (filled heart), "Period & Cycle Talk" (outline), "PMS Survival Guide", "Irregular Cycles", "Heavy Periods", "Reusable Period Items", "Perimenopausal & Menopause"  
- **UI structure:** Tab-filtered view | Mixed heart fill states  
- **Flow & logic:** Personalized feed shows followed topics with filled hearts

### Screen 181 — My Interests (Personalized)
- **Purpose:** Show only followed/favorite topics  
- **Text:** Tab: "My ❤️" (active, pink) | Period & Cycle section: "Menstruation FAQs" (filled heart) | Premium Content: "Archived: Ask an Expert" (filled heart)  
- **UI structure:** Minimal list of favorited topics  
- **Flow & logic:** "My" view surfaces personalizations; topic browsing + curation in one flow

### Screen 182 — Topic Feed (Period & Cycle Talk)
- **Purpose:** New topic entry from Popular feed  
- **Text:** Topic: "Period & Cycle Talk · Follow" | Hero: "What are the weirdest symptoms you've ever experienced during your cycle?" (with watercolor ice-cream illustration) | Engagement: "4.7K ❤️ | 16.1K 💬" | First comment: "Butt cramps, feels like something electric is up your anus and you just can't sit or move 😭😭😭" | "View all 16.1K comments"  
- **UI structure:** Full-bleed hero image | Engagement metrics | Comment preview with emoji reactions  
- **Flow & logic:** Topic discovery from feed; large comment numbers showcase active engagement

### Screen 183 — Topic Context Menu (Hide & Manage)
- **Purpose:** Per-post topic controls  
- **Text:** Three-dot menu → "Hide this topic", "Manage your interests", "Cancel"  
- **UI structure:** Modal menu (same as earlier screens but context-driven)  
- **Flow & logic:** Consistent hiding/preference management UX

### Screen 184 — Hide Confirmation + Undo
- **Purpose:** Confirm topic hide + enable reversal  
- **Text:** "You've hidden the discussion: What are the weirdest symptoms you've ever experienced during your cycle?" (grayed out title) | Explanation: "You will see fewer Insights like this." | Button: "Undo" (pill-shaped, gray)  
- **UI structure:** Confirmation card with undo button | Placeholder-style grayed-out topic title  
- **Flow & logic:** Non-destructive hide (feed adjustment); reversible with Undo CTA

---

## CHECKPOINT 3 SUMMARY

| Dimension | Finding |
|-----------|---------|
| **Topic taxonomy** | 30+ topics across 5+ categories (Period & Cycle, Harmony & Balance, Health, Parenting, Medical, Flo Community, Premium) |
| **Interest management UX** | Follow/mute toggles per topic + block confirmation modal + multi-tab filtering (My/All/Category-filtered) |
| **Hide & personalization** | Hide discussion topics with "You will see fewer Insights like this" message; reversible Undo button |
| **Interest discovery** | Both push-style (feed surfaces topics) + pull-style (Interests browse all topics); seamless toggle in Interests list |
| **Visual feedback** | Filled heart = followed; outline = not followed; muted icon = blocked; grayed text = hidden |
| **Block language** | "If you block X, we will stop showing discussions from this group. You can always change it later." — emphasizes reversibility |

---

## CHECKPOINT 4: Screen 278 (Dark Mode Variant)

### Screen 278 — Dark Mode Feed
- **Purpose:** Show dark theme variant of community feed  
- **Text:** Same as screen 149 | "Archived: Ask an Expert · Following" | Expert session card (Premium badge) | "1.9K ❤️ | 758 💬" | Comment: "I am having issues gaining weight and since don't hear as much about underweight issues I also don't hear as much about weight gain plans.. I recently was told to eat as much protein and fiber as poss... Continue reading"  
- **UI structure:** Dark background (near-black) | Cards with dark surfaces + light text | Pink/lavender accents persist  
- **Flow & logic:** Theme consistency — all community interactions supported in both light + dark modes

---

## SYNTHESIS: Flo Secret Chats as Benchmark for grandma.app Care Circle

### Community Structure
**Rooms/Topics**: ~30 topics across 5 main categories (Period & Cycle, Harmony & Balance, Health, Parenting, Medical, Flo Community, Premium). Topics are **explicitly scoped** (e.g., "Pre-period acne: How do you prevent it?") and **discovery is mixed** (trending feed + search + interests sidebar). This mirrors pre-pregnancy/pregnancy/kids pillar structure in grandma.app.

### Anonymity + Safety Model
- **Full anonymity**: No usernames, only avatars (random characters/icons)
- **Age-gating**: 18+ badges + content warning for sensitive topics (e.g., contraception)
- **Moderation attribution**: Moderators flagged with checkmarks + title ("Community Manager")
- **Transparent appeals**: Documented rules, appeals process, external trust links (Crisis Support, Privacy Policy)
- **User-initiated reporting**: Report comment / Report user / Block user pathways

### Engagement Mechanics
- **Hearts** (likes) + **comment counts** + **bookmarks** (save for later)
- **Poll voting** with live aggregation (e.g., "4–7 days: 43%")
- **Comment sorting**: Top / Newest / My / Expert
- **Topic following**: Follow/mute toggles per interest + "My ❤️" personalization
- **Threading**: Replies visible, tap to expand; no nesting depth limits shown

### Moderation Approach
- **Archived expert sessions** (read-only, no new posts, moderator attributed)
- **Blocking** with reversible confirmation ("You can always change it later")
- **Hiding** topics with "You will see fewer Insights like this" + Undo button
- **Report confirmation**: "Our team will check if this content goes against our Community guidelines"

### Biggest Opportunities for grandma.app
1. **Interest-driven feed personalization**: Let caregivers follow specific pillars (Sleep, Feeding, Milestones) — surface only relevant discussions
2. **Verified caregiver voices**: Analogous to "Expert" tab — flag health professionals, lactation consultants, or app-invited advisors
3. **Reversible blocking**: Users can hide/mute topics with Undo, reducing friction for preference management
4. **Threaded discussion**: Support deep conversations (replies to specific comments), not just flat lists
5. **Dark mode parity**: Ensure all care-circle/community surfaces work seamlessly in light + dark (not yet verified in grandma.app)
6. **Moderation transparency**: Clear rules, appeals process, and moderator attribution build trust in peer-to-peer spaces
7. **Age-gating model**: If care-circle includes teens or multi-generational caregiving, consider sensitive-topic gates (e.g., 18+ for sexual health, 16+ for mental health)
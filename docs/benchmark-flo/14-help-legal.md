# Flo: Help, About & Legal — 12-Screen Benchmark

## Screen #291 — Help Loading
- **Purpose:** Placeholder while help content loads.
- **Text inventory:** Header "Help", close button (X)
- **UI structure:** Loading spinner centered, header bar with title
- **Flow & logic:** Entry point to Help system; shows loading state

---

## Screen #292 — Help Hub / Categories
- **Purpose:** Main help navigation with topic categories and search.
- **Text inventory:** 
  - "How can Flo help you?" (headline)
  - Language picker "English (US)"
  - Search placeholder "What would you like to find?"
  - Category tiles: "Getting Started", "Account & Data", "Using Flo", "Subscriptions & Billing", "Troubleshooting", "Privacy &" (cut off), "General Questions", "Flo for Partners"
- **UI structure:** Pink-tinted hero section with search bar; 2x4 grid of category cards with icons (rocket, phone/lock, app screen, dollar signs, gear, shield, chat, two phones); footer links "Contact us", "About us", "Privacy Policy", "Terms of Use", "Cookie Policy"
- **Flow & logic:** Categorized discovery (7 main topics + General Questions + Partners). Searchable. Direct footer links to legal docs. Contact escalation as CTA.

---

## Screen #293 — Help Categories (Continued)
- **Purpose:** Continuation showing full category grid + footer legal/contact section.
- **Text inventory:** 
  - Category tiles continued (full grid visible)
  - "Didn't find the answer?" section
  - "Contact us" button (pink, pill-shaped)
  - Footer links: "About us", "Privacy Policy", "Terms of Use", "Cookie Policy"
  - Copyright: "© 2023 Flo Health, Inc."
  - Flo logo
- **UI structure:** Bottom section of help hub. Legal links grouped in footer; contact CTA above footer.
- **Flow & logic:** Support escalation: search → categories → contact if unresolved.

---

## Screen #294 — Help Categories (Footer View)
- **Purpose:** Emphasis on footer legal links and copyright.
- **Text inventory:** Same as #293 (footer focus)
- **UI structure:** Gray footer section with centered links, copyright, logo
- **Flow & logic:** Legal/trust architecture separate from FAQ hierarchy

---

## Screen #295 — About Flo (Mission & Values)
- **Purpose:** Brand story and transparency on medical credibility.
- **Text inventory:**
  - **Section 1 "Our mission & values":**
    - "Make women feel more empowered about their health and well-being."
    - "Read more >" link
    - Illustration: 3 diverse women, one holding a phone
  - **Section 2 "Our medical expertise":**
    - "All our content is developed with medical and female health experts."
    - "Read more >" link
    - Illustration: 3 healthcare workers (doctor, nurse, researcher)
  - **Section 3 "Privacy & security":**
    - "Learn about what data we collect and how you can manage it."
    - "Read more >" link
    - Illustration: magnifying glass + shield + document
- **UI structure:** 3 colored card sections (light pink → teal → peach) stacked vertically, each with icon, headline, subtext, "Read more >" CTA
- **Flow & logic:** About page branches into 3 deep dives (mission, medical authority, privacy transparency)

---

## Screen #296 — About Flo (Continued)
- **Purpose:** Show additional About section: Premium membership positioning.
- **Text inventory:**
  - "Our medical expertise" (teal card, full view)
  - "Privacy & security" (peach card, full view)
  - **"Premium membership"** section:
    - "Get unlimited access and support women like you."
    - "Read more >" link
    - Illustration: woman with arms crossed, flowers around her
- **UI structure:** Continuation of card stack; pink card at bottom for Premium upsell
- **Flow & logic:** About combines brand story + premium conversion

---

## Screen #297 — About: Mission & Values (Deep Dive)
- **Purpose:** Expand on Flo's mission and scale/impact.
- **Text inventory:**
  - **Headline:** "We're Flo, the world's most popular female health app."
  - **Scale claim:** "350 million women and people who have periods trust us to help them understand their bodies better.¹,²."
  - **Section "How does Flo work?"**
    - "At Flo, our purpose is to build a better future for female health by helping you harness the power of your body signals."
    - "We're the world's most popular female health app, helping 350m women and people who have periods understand their bodies better¹,²."
    - "As part of our purpose, we believe in sharing that knowledge with those in need, why is why we've also given free access to Flo's Premium subscription product to 11 million women and people with periods around the world³."
    - "[Bottom cut off]"
  - Superscript citations (¹,²,³)
- **UI structure:** Long-form text with footnote citations, back button, centered typography
- **Flow & logic:** Mission statement emphasizes scale (350M users), free-tier altruism (11M free access), expert credibility (citations)

---

## Screen #298 — Privacy & Security (FAQ Accordion)
- **Purpose:** Privacy help hub with expandable Q&A sections.
- **Text inventory:**
  - **Section "Data collection":**
    - "What data do you collect about me?"
    - "How do you use my personal data?"
    - "Do you use my data for any other purposes?"
    - "Is my data safe?"
    - "Where is my data stored?"
  - **Section "Sharing your data":**
    - "Who do you share my data with?"
    - "Do you sell my data?"
    - "I started to notice ads with ovulation tests/baby products/etc. after I logged a symptom/read an article in Flo. Do you have something to do with it?" (long-form question)
- **UI structure:** Colored header (peach) with icon; accordion cards with chevrons; 2 main sections (Data collection / Sharing your data)
- **Flow & logic:** Privacy FAQ organized by user concern (collection → use → safety → sharing). Addresses trust anxiety (data sale concerns, ad correlation).

---

## Screen #299 — Privacy & Security (FAQ Continued)
- **Purpose:** Deeper privacy FAQ covering data management and compliance.
- **Text inventory:**
  - **Section "Managing your data":**
    - "How can I manage my data?" (answered on screen #300)
    - "How can I withdraw my consent from sharing my data (in general or with third-parties)?"
    - "Who should I contact at Flo about my data?"
  - **Section "Additional Questions":**
    - "What is the FTC case?"
    - "If I'm having an abortion in the US, am I at risk whilst using Flo?" (sensitive legal/safety question)
- **UI structure:** Continuation of accordion; sensitive topics flagged via direct Q&A
- **Flow & logic:** Escalates from general privacy to compliance (FTC), safety concerns (abortion legality), data rights (withdrawal, contact)

---

## Screen #300 — Privacy & Security (Expanded Answer)
- **Purpose:** Detailed answer to "How can I manage my data?" with enumerated user controls.
- **Text inventory:**
  - **Headline:** "How can I manage my data?"
  - **Intro:** "You are in control of your data and can modify, erase, access and update your Personal Data, including:"
  - **Bulleted controls:**
    - Add/edit/delete your periods
    - Add/edit/delete symptoms and events on screen '+' (except events exported from third-party trackers)
    - Edit your email address if it's not verified
    - Change your password
    - Change your consent
    - Edit your lifestyle settings
    - Change your goal in the app
    - Change your cycle settings (cycle, period and luteal phase length)
    - Enable and disable sync with the Health App, Google Fit or Fitbit
    - Delete and edit past pregnancies
  - **Footer:** "Should any questions arise, please write to us at support@flo.health."
- **UI structure:** Full-screen text card; pink bullet points; support email link at bottom
- **Flow & logic:** Transparency via granular data control inventory. Support escalation email provided.

---

## Screen #301 — Privacy Policy (Table of Contents)
- **Purpose:** Legal policy entry point with navigable TOC.
- **Text inventory:**
  - **Headline:** "Privacy Policy"
  - **Table of contents:**
    - Personal data we collect from you
    - How we use your personal data
    - Your privacy rights
    - Third parties processing your personal data
    - Retention of your personal data
    - Security of your personal data
    - Children's privacy
    - Communication with you
    - Storage and international personal data transfers
    - United States
    - Contact us
  - **Footer:** 
    - "Effective as of October 31, 2023."
    - "See the previous versions of our Privacy Policy here. This policy explains how we handle your..." (cut off)
- **UI structure:** Gray box with blue links (clickable TOC); version control link; effective date
- **Flow & logic:** Deep legal docs organized by data topic (collection → use → rights → security → transfers → contact). Version history available.

---

## Screen #302 — Terms of Use (Table of Contents)
- **Purpose:** Legal terms entry point with navigable TOC.
- **Text inventory:**
  - **Header bar:** Menu icon (red), Flo logo (center), "Try Flo today" CTA button (pink)
  - **Headline:** "Terms of Use"
  - **Table of contents:**
    - Before you start using Flo
    - 01 Introduction
    - 02 Who are we?
    - 03 When do these Terms apply?
    - 04 Who can access Flo?
    - 05 App, Features and Content are not intended to provide medical advice, diagnosis, or treatment
    - 06 Registration and eligibility
    - 07 Your use of the App
    - 08 Export and economic sanctions control
    - 09 Limited Licence to the App
    - 10 Licence to User Content
    - 11 Use at your own risk
    - 12 Use by minors disclaimer
    - 13 Subscriptions and billing
    - 14 Secret Chats
    - 15 Passwords (cut off)
- **UI structure:** Gray TOC box with blue links; header bar with logo, menu, and premium CTA; 15+ section outline
- **Flow & logic:** Terms organized by user journey (intro → eligibility → usage rules → subscriptions → disclaimers). Medical liability disclaimer prominent (section 05). Premium upsell in header.

---

## Synthesis

### Help & FAQ Structure
Flo uses a **categorical hub** (8 topics + General + Partners) with searchability and deep-dive FAQ accordions. Privacy FAQ is elaborately detailed (10+ questions covering collection, use, rights, and safety concerns). Help escalates to a "Contact us" CTA and email support.

### Legal & Privacy Transparency
- **Privacy Policy:** Comprehensive TOC (11 sections) with version control and effective date; accessible from Help hub.
- **Terms of Use:** Numbered structure (15+ sections) with medical liability disclaimers explicit in section 05 and 12 (minors). "Try Flo" CTA embedded in Terms header (conversion signal).
- **About page:** Emphasizes scale (350M users), medical credibility (expert-developed), and free-access altruism (11M free). Three card sections (Mission, Medical, Privacy) branch into deep dives.

### Support Escalation
1. Self-serve: Search → Category → FAQ
2. Escalate: "Didn't find the answer?" → Contact us button
3. Email: support@flo.health

### Biggest Wins for Grandma.app
1. **FAQ accordion pattern** — Clean, collapsible Q&A beats walls of text. Organize by user concern (data, subscriptions, troubleshooting), not doc structure.
2. **Categorical hub with icons** — Visual discovery (8 topic cards) more engaging than plain text list.
3. **Sensitive questions flagged** — FTC case, abortion safety questions acknowledge legal/emotional concerns directly.
4. **Privacy control inventory** — Bullet list of 10+ user-controlled actions builds trust; support email at bottom for escalation.
5. **Legal transparency** — TOC with version history + effective date signals compliance rigor. Medical disclaimers in TOC (section 05) and via "Not medical advice" cards.

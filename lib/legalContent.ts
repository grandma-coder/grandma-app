/**
 * In-app legal content — Privacy Policy + Terms of Use (Phase 1 / trust).
 *
 * Bundled so the docs are readable IN the app (Flo-parity), not an alert that
 * says "available at grandma.app/…". Structured as sections with a title + body
 * so the reader can render a table-of-contents and anchor-scroll.
 *
 * This is plain-English, product-accurate summary content — the canonical legal
 * text still lives at grandma.app/privacy and grandma.app/terms (linked from the
 * reader). Keep in sync with the hosted versions on material changes; bump
 * `effectiveDate` when the substance changes.
 *
 * NOTE: intentionally English-only for now — legal copy is not machine-
 * translated. Localized legal review is a later wave; the reader shows a note
 * pointing non-English users to the hosted policy in their language.
 */

export type LegalDoc = 'privacy' | 'terms'

export interface LegalSection {
  id: string
  title: string
  body: string
}

export interface LegalDocument {
  doc: LegalDoc
  title: string
  effectiveDate: string
  hostedUrl: string
  intro: string
  sections: LegalSection[]
}

const PRIVACY: LegalDocument = {
  doc: 'privacy',
  title: 'Privacy Policy',
  effectiveDate: 'Effective July 16, 2026',
  hostedUrl: 'https://grandma.app/privacy',
  intro:
    'This policy explains what personal data grandma.app collects, how we use it, and the rights you have over it. We handle health, pregnancy, cycle, and children’s data — we treat it with the care that deserves.',
  sections: [
    {
      id: 'collect',
      title: 'Personal data we collect',
      body:
        'Account details (email, sign-in), the health and family information you log (cycle, pregnancy, children’s growth, feeding, sleep, medical records, mood, symptoms), photos and scans you add, your chats with Grandma, and anonymous app-usage data. We only collect what the features you use require.',
    },
    {
      id: 'use',
      title: 'How we use your data',
      body:
        'To power your tracking and insights, personalize your journey, let Grandma answer with context, sync across your devices, and share with the care circle you choose. We use aggregate, de-identified usage data to fix bugs and improve the app.',
    },
    {
      id: 'rights',
      title: 'Your privacy rights',
      body:
        'You can access, export, correct, and delete your data at any time in Data & Privacy. You can withdraw consent, toggle AI data use, opt out of analytics and marketing, and delete your account (which erases your data). See “Data We Hold” for a live inventory.',
    },
    {
      id: 'sharing',
      title: 'Sharing your data',
      body:
        'We never sell your personal data. We share it only with the care circle you explicitly invite, and with service providers (e.g. hosting, crash reporting) bound to protect it. We never use your private health or child data to train third-party AI.',
    },
    {
      id: 'security',
      title: 'Security & retention',
      body:
        'Your data is encrypted in transit and at rest. We keep it only while your account is active; when you delete your account, we remove your personal data from our systems (except where we must retain limited records by law).',
    },
    {
      id: 'children',
      title: 'Children’s data',
      body:
        'Data about a child is entered and controlled by the parent or caregiver who manages that child’s profile. It is never used for advertising and is shared only within the care circle you set up.',
    },
    {
      id: 'contact',
      title: 'Contact us',
      body:
        'Questions about your data or this policy? Write to support@grandma.app. Include your user ID (in Data & Privacy → Data We Hold) so we can find your account without asking for personal details.',
    },
  ],
}

const TERMS: LegalDocument = {
  doc: 'terms',
  title: 'Terms of Use',
  effectiveDate: 'Effective July 16, 2026',
  hostedUrl: 'https://grandma.app/terms',
  intro:
    'These terms govern your use of grandma.app. By creating an account you agree to them. Please read the medical disclaimer carefully.',
  sections: [
    {
      id: 'notmedical',
      title: 'Not medical advice',
      body:
        'grandma.app — including Grandma’s AI guidance, insights, and content — is for information and support only. It is NOT medical advice, diagnosis, or treatment, and is not a substitute for your doctor, midwife, or pediatrician. Always seek professional care for medical concerns, and call emergency services in an emergency.',
    },
    {
      id: 'eligibility',
      title: 'Who can use grandma.app',
      body:
        'You must be 18 or older (or the age of majority where you live) to create an account. You are responsible for the accuracy of the information you enter and for keeping your account secure.',
    },
    {
      id: 'usage',
      title: 'Your use of the app',
      body:
        'Use the app lawfully and respectfully. Do not misuse community features, impersonate others, post harmful content, or attempt to access other users’ data. We may suspend accounts that violate these terms.',
    },
    {
      id: 'content',
      title: 'Your content',
      body:
        'You keep ownership of what you create — logs, photos, posts. You grant us the limited licence needed to store it, show it to you and your care circle, and operate the features you use.',
    },
    {
      id: 'community',
      title: 'Community guidelines',
      body:
        'Community spaces are for support, not medical direction. Be kind, keep others’ information private, and report content that breaks the rules. See the in-app Community Guidelines for the full list.',
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions & billing',
      body:
        'Premium is billed through your app store on a monthly or annual basis and renews automatically until cancelled. Manage or cancel anytime in your app-store account settings.',
    },
    {
      id: 'liability',
      title: 'Use at your own risk',
      body:
        'The app is provided “as is.” To the extent permitted by law, we are not liable for decisions you make based on the app’s information. Your health decisions remain between you and your healthcare providers.',
    },
    {
      id: 'contact',
      title: 'Contact us',
      body: 'Questions about these terms? Write to support@grandma.app.',
    },
  ],
}

export function getLegalDocument(doc: LegalDoc): LegalDocument {
  return doc === 'terms' ? TERMS : PRIVACY
}

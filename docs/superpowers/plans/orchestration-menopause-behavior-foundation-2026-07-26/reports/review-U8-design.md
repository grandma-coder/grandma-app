# Design review — U8 MenopauseHome (design-critic, sonnet)
Commit: 1f09ec0 · Score 7/10 · Token hygiene "excellent"

Compliant (1-6): zero raw hex; palette imported not re-derived (useMenoPalette single source);
sticker shadow gated !diffuse; fonts token-sourced; Character blobs only (phase/celebrate/selfcare/
period + symptom-group blobs), ember-tinted, no Lucide semantic icons; ember mode color.

Findings:
- P1: missing HomeGreeting + HomeJourneySwitcher (every other home opens with brand mark + "Hi,{name}").
  -> FIXED in 2fae49f (prepended HomeGreeting name={displayName} microLabel trailing={HomeJourneySwitcher}).
- P1: quick-log chips don't pre-select the tapped symptom (opens generic picker; also code-review P2).
  -> FIXED in 2fae49f (added initialId? to MenopauseSymptomForm; QuickChip threads id -> opens on severity).
- P2: hero number uses font.display not displayBold (menoPalette lacks fontDisplayBold); eyebrow tracking
  0.8 vs MonoCaps 1.2; Character size 30 off standard set; hero alignment; tint reuse flattens the offer
  card hierarchy; no hero graphic motif (deferred E1); recentBlob socket border inconsistency. -> deferred (E1 polish).

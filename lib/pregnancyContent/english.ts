// English source for the bundled pregnancy week content. Built from the English data files
// (lib/weekContent.ts + lib/prepGuide.ts) so the translated locale files and the test always
// agree on the key set. Keys:
//   w<week>_dev<i> · w<week>_sym<i> · w<week>_prep<i>_t · w<week>_prep<i>_d
//   birth_<typeId>_title|desc · birth_bag_cat_<sectionId> · birth_bag_<itemId>   (birth-plan page)
//   appt_<id>_name|description|prepNote|whatToExpect|q<i> · appt_sourceNote
//   pg_<guideId>_why · pg_<guideId>_how<i> · pg_<guideId>_watch
import { weekContent } from '../weekContent'
import { allPrepGuides } from '../prepGuide'
import { birthTypes, hospitalBagChecklist } from '../birthData'
import { STANDARD_APPOINTMENTS, APPOINTMENTS_SOURCE_NOTE } from '../pregnancyAppointmentsData'

export function pregnancyContentEnglish(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [w, c] of Object.entries(weekContent)) {
    c.dev.forEach((s, i) => { out[`w${w}_dev${i}`] = s })
    c.sym.forEach((s, i) => { out[`w${w}_sym${i}`] = s })
    c.prep.forEach((p, i) => {
      out[`w${w}_prep${i}_t`] = p.t
      out[`w${w}_prep${i}_d`] = p.d
    })
  }
  for (const [id, g] of Object.entries(allPrepGuides())) {
    out[`pg_${id}_why`] = g.why
    g.how.forEach((s, i) => { out[`pg_${id}_how${i}`] = s })
    if (g.watch) out[`pg_${id}_watch`] = g.watch
  }
  for (const a of STANDARD_APPOINTMENTS) {
    out[`appt_${a.id}_name`] = a.name
    out[`appt_${a.id}_description`] = a.description
    out[`appt_${a.id}_prepNote`] = a.prepNote
    out[`appt_${a.id}_whatToExpect`] = a.whatToExpect
    a.questions.forEach((q, i) => { out[`appt_${a.id}_q${i}`] = q })
  }
  for (const b of birthTypes) {
    out[`birth_${b.id}_title`] = b.title
    out[`birth_${b.id}_desc`] = b.description
  }
  for (const sec of hospitalBagChecklist) {
    out[`birth_bag_cat_${sec.id}`] = sec.category
    for (const it of sec.items) out[`birth_bag_${it.id}`] = it.text
  }
  out.appt_sourceNote = APPOINTMENTS_SOURCE_NOTE
  return out
}

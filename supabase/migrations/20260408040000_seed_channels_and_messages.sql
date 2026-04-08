-- ============================================================
-- Seed 50+ channels + realistic sample messages in each
-- ============================================================

-- More channels across all parenting stages
INSERT INTO channels (name, description, category, channel_type, member_count) VALUES
  -- Fertility & TTC (adding to existing)
  ('Unexplained Infertility', 'When doctors say everything looks normal but it''s still not happening. You are not alone.', 'fertility', 'public', 47),
  ('Male Factor Infertility', 'Supporting couples dealing with male fertility challenges. Tests, treatments, and hope.', 'fertility', 'public', 23),
  ('Donor & Surrogacy', 'Egg donors, sperm donors, surrogacy journeys — all paths to parenthood are valid.', 'fertility', 'public', 18),
  ('Two Week Wait', 'The longest 14 days of your life. Symptom spotting, testing, and moral support.', 'fertility', 'public', 156),
  ('Rainbow Babies', 'Pregnancy after loss. Navigating joy and anxiety together with grace.', 'fertility', 'public', 89),

  -- Pregnancy stages
  ('Morning Sickness Survival', 'Remedies, commiseration, and countdown to the second trimester.', 'pregnancy', 'public', 234),
  ('Gestational Diabetes', 'Blood sugar management, diet plans, and emotional support for GD moms.', 'pregnancy', 'public', 67),
  ('Twins & Multiples', 'Double (or triple!) the joy, double the questions. Multi parents unite!', 'pregnancy', 'public', 45),
  ('VBAC Support', 'Planning a vaginal birth after cesarean? Research, stories, and encouragement.', 'pregnancy', 'public', 38),
  ('Home Birth & Water Birth', 'Natural birth planning, midwife experiences, and birth pool recommendations.', 'pregnancy', 'public', 52),
  ('Prenatal Anxiety', 'Worrying about everything? Let''s talk about managing anxiety during pregnancy.', 'pregnancy', 'public', 178),

  -- Newborn
  ('NICU Parents', 'When your baby needs extra care. Support, updates, and NICU graduation celebrations.', 'parenting', 'public', 94),
  ('Colic & Reflux', 'Purple crying, silent reflux, and sleepless nights. Survival tips from parents who get it.', 'parenting', 'public', 145),
  ('Cloth Diapering 101', 'Prefolds, pockets, AIO — navigating the world of reusable diapers.', 'parenting', 'public', 67),
  ('Baby Wearing', 'Wraps, carriers, and slings. Which one works for you? Tips and reviews.', 'parenting', 'public', 83),

  -- Feeding specific
  ('Pumping Exclusively', 'EP warriors unite! Schedules, output tracking, and pump brand reviews.', 'feeding', 'public', 112),
  ('Toddler Picky Eaters', 'Will they ever eat anything besides crackers? Strategies and solidarity.', 'feeding', 'public', 198),
  ('Food Allergy Families', 'Managing anaphylaxis, reading labels, and allergy-friendly recipes.', 'feeding', 'public', 76),

  -- Sleep
  ('Cosleeping Safely', 'Safe bed-sharing practices, transitioning out, and what works for your family.', 'parenting', 'public', 134),
  ('Night Weaning', 'Ready to drop those night feeds? Methods, timelines, and encouragement.', 'parenting', 'public', 89),
  ('Nap Transitions', '3 to 2, 2 to 1, 1 to none — surviving every nap drop.', 'parenting', 'public', 167),

  -- Milestones & Development
  ('Speech & Language', 'First words, speech delays, therapy recommendations, and language milestones.', 'milestones', 'public', 203),
  ('Sensory Processing', 'Understanding sensory needs, SPD, and helping your child thrive.', 'milestones', 'public', 78),
  ('ADHD & Neurodiversity', 'Parenting neurodiverse kids with understanding, strategies, and advocacy.', 'milestones', 'public', 156),
  ('School Readiness', 'Is your child ready for kindergarten? Academics, social skills, and confidence.', 'milestones', 'public', 134),
  ('Reading Together', 'Book recommendations by age, reading milestones, and creating lifelong readers.', 'milestones', 'public', 189),

  -- Health & Medical
  ('Pediatric Emergencies', 'When to go to the ER, first aid basics, and staying calm in scary moments.', 'wellness', 'public', 234),
  ('Childhood Illness', 'RSV, hand-foot-mouth, ear infections — diagnosing, treating, and surviving sick days.', 'wellness', 'public', 312),
  ('Mental Health for Moms', 'Therapy, medication, self-help — prioritizing your mental wellbeing.', 'wellness', 'public', 267),
  ('Pelvic Floor Recovery', 'Postpartum pelvic floor rehab, exercises, and when to see a specialist.', 'wellness', 'public', 145),
  ('Thyroid & Hormones', 'Postpartum thyroiditis, hormonal imbalances, and getting your body back on track.', 'wellness', 'public', 56),

  -- Relationships & Family
  ('Grandparent Boundaries', 'Setting healthy boundaries with well-meaning grandparents. Scripts and strategies.', 'community', 'public', 345),
  ('Blended Families', 'Step-parenting, co-parenting, and building a loving blended family.', 'community', 'public', 89),
  ('Military Families', 'Deployments, PCS moves, and parenting through service. Tricare tips included.', 'community', 'public', 67),
  ('LGBTQ+ Parents', 'All families are beautiful. Support, resources, and community for LGBTQ+ parents.', 'community', 'public', 123),
  ('Adoption & Foster', 'The adoption journey, foster care, and building forever families.', 'community', 'public', 98),

  -- Lifestyle
  ('Mom Fitness', 'Workouts with kids, postpartum fitness, running with strollers, and gym hacks.', 'wellness', 'public', 234),
  ('Meal Prep Sunday', 'Weekly meal prep ideas, batch cooking, and freezer-friendly recipes for busy parents.', 'community', 'public', 289),
  ('Travel with Kids', 'Flying with babies, road trip survival, and kid-friendly destination reviews.', 'community', 'public', 178),
  ('Work-Life Balance', 'Flexible schedules, career pivots, and the myth of "having it all."', 'community', 'public', 345),
  ('Side Hustles for Moms', 'Earning from home, small business ideas, and financial independence.', 'community', 'public', 156),
  ('Minimalist Parenting', 'Less stuff, more presence. Toy rotation, capsule wardrobes, and intentional living.', 'community', 'public', 112)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed realistic messages in popular channels
-- ============================================================

-- Helper: We'll use the existing channel IDs by name
-- Messages from fictional users (author_name set, author_id uses a placeholder)

-- Sleep Training messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('SleepMama', 'We just started Ferber method with our 6 month old. Night 1 was brutal — 45 minutes of crying. But night 2 was only 12 minutes! Anyone else see fast improvement?', now() - interval '6 hours'),
  ('TiredDad2026', 'My pediatrician said not to sleep train before 4 months. We waited until 5 months and did taking cara babies. Best decision ever. She sleeps 11 hours straight now.', now() - interval '5 hours'),
  ('NightOwlMom', 'Controversial opinion: we cosleep and everyone sleeps great. I know it''s not for everyone but it works for our family. Fed is best, safe is best, sleep is best.', now() - interval '4 hours'),
  ('FirstTimeMom', 'Is the 4 month sleep regression real? My baby was sleeping 6 hour stretches and now wakes up every 45 minutes. I''m dying.', now() - interval '3 hours'),
  ('SleepConsultant', 'The 4 month regression is actually a PERMAnent change in sleep cycles. Baby is now cycling through light and deep sleep like adults. The key is teaching self-settling.', now() - interval '2 hours'),
  ('ExhaustedParent', 'Just want to say — whatever method you choose, it gets better. My now-2-year-old sleeps 12 hours and I barely remember those dark newborn nights.', now() - interval '1 hour')
) AS msgs(name, content, ts)
WHERE c.name = 'Sleep Training';

-- Breastfeeding Support messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('LactationQueen', 'Anyone else get painful letdown? My milk comes in so fast it literally hurts. Baby chokes sometimes too. Tried laid-back nursing and it helped a lot!', now() - interval '8 hours'),
  ('PumpingWarrior', 'Output dropped suddenly at 3 months. Went from 5oz per session to barely 2oz. Power pumped for 3 days and it came back. Don''t give up!', now() - interval '7 hours'),
  ('NewMomSara', 'Tongue tie was the root of ALL our problems. Got it revised at 4 weeks and breastfeeding went from excruciating to comfortable almost overnight.', now() - interval '6 hours'),
  ('BFJourney', 'Anyone combo feeding? I breastfeed during the day and husband does formula at night. Best of both worlds honestly. Baby is thriving.', now() - interval '4 hours'),
  ('MidwifeJen', 'Reminder: milk supply is established by demand. The more baby nurses, the more you make. Those first 6 weeks are crucial for building supply.', now() - interval '2 hours')
) AS msgs(name, content, ts)
WHERE c.name = 'Breastfeeding Support';

-- Pregnancy Journey messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('Week12Club', 'Just had my NT scan and everything looks perfect! Baby was bouncing around like crazy. Finally feeling like I can breathe.', now() - interval '10 hours'),
  ('BumpWatch', 'When did everyone start showing? I''m 16 weeks with my first and still just look bloated. My sister showed at 12 weeks with her second.', now() - interval '8 hours'),
  ('CravingQueen', 'Currently eating pickles dipped in peanut butter at 2am. Pregnancy cravings are WILD. What''s your weirdest craving?', now() - interval '6 hours'),
  ('NervousFTM', 'Gender reveal party this weekend! We''re doing a balloon pop. I genuinely don''t have a preference, just want a healthy baby.', now() - interval '4 hours'),
  ('PregnantAndTired', 'Second trimester energy is a LIE. I''m 20 weeks and still exhausted. When does this mythical energy burst happen??', now() - interval '3 hours'),
  ('DueInJune', 'Just started feeling kicks! 18 weeks and it feels like little goldfish swimming. My husband can''t feel them yet from the outside though.', now() - interval '1 hour')
) AS msgs(name, content, ts)
WHERE c.name = 'Pregnancy Journey';

-- Toddler Milestones messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('ProudMama', 'My 14-month-old just took her first steps today!! She did 4 steps then face-planted into the couch. I cried. She laughed.', now() - interval '7 hours'),
  ('ToddlerDad', 'At what age did your toddler start putting 2 words together? My son is 20 months and says about 30 words but all single words.', now() - interval '5 hours'),
  ('SpeechPath', 'Typically we expect 2-word combinations by 24 months. 30 words at 20 months is great! Keep narrating everything you do together.', now() - interval '4 hours'),
  ('PlayfulParent', 'Best developmental toys for 18 months? We love our Lovevery play kit but looking for more ideas. She''s obsessed with stacking things.', now() - interval '3 hours'),
  ('WorriedMom', 'My 15-month-old isn''t walking yet. Pediatrician says not to worry until 18 months but I can''t help comparing. Anyone else a late walker?', now() - interval '2 hours'),
  ('ReassureMom', '@WorriedMom My daughter didn''t walk until 17 months. She was just cautious! Now at 3 she runs everywhere. Every kid has their own timeline.', now() - interval '1 hour')
) AS msgs(name, content, ts)
WHERE c.name = 'Toddler Milestones';

-- Newborn Essentials messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('MinimalistMom', 'Hot take: you do NOT need a wipe warmer, a bottle sterilizer, or a diaper genie. A simple trash can with a lid works fine. Save your money.', now() - interval '9 hours'),
  ('GearJunkie', 'The Snoo was worth every penny for us. Baby slept in it from week 2 and it literally saved our marriage. Yes it''s expensive. Yes I''d buy it again.', now() - interval '7 hours'),
  ('BudgetBaby', 'Facebook marketplace is your best friend for baby gear. Got a barely-used stroller for $50 that retails for $400. Check every day!', now() - interval '5 hours'),
  ('OrganizedMama', 'Registry must-haves that people don''t think about: a good water bottle for nursing, a headlamp for night feeds, and LOTS of burp cloths.', now() - interval '3 hours'),
  ('SecondTimeMom', 'Things I''m NOT buying for baby #2: a changing table (we use the floor), a baby bathtub (kitchen sink works great), and newborn shoes (WHY do they make these).', now() - interval '1 hour')
) AS msgs(name, content, ts)
WHERE c.name = 'Newborn Essentials';

-- Feeding & Nutrition messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('BLWmom', 'Started BLW at 6 months with avocado strips. Baby gagged a lot (normal!) but within a week was grabbing and eating banana like a champ.', now() - interval '8 hours'),
  ('PediatricRD', 'PSA: Rice cereal as a first food is outdated advice. High allergen foods (peanut, egg) should be introduced early. Talk to your pediatrician!', now() - interval '6 hours'),
  ('MealPrepMama', 'My go-to toddler lunch rotation: quesadilla + fruit, pasta + veggies, PB&J + yogurt, cheese + crackers + cucumber. Keeps it simple.', now() - interval '4 hours'),
  ('AllergyMom', 'Just discovered our 8-month-old has a dairy allergy. Any recommendations for dairy-free formulas? Currently trying Alimentum.', now() - interval '2 hours'),
  ('FeedingTherapist', '@AllergyMom Nutramigen and EleCare are also good options. Many kids outgrow dairy allergy by age 3-5. Hang in there!', now() - interval '1 hour')
) AS msgs(name, content, ts)
WHERE c.name = 'Feeding & Nutrition';

-- Postpartum Recovery messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('HealingMama', 'Nobody warned me about the night sweats!! 2 weeks postpartum and I wake up DRENCHED. Apparently it''s your body getting rid of extra fluids. Lovely.', now() - interval '6 hours'),
  ('PPDwarrior', 'Finally told my OB about my intrusive thoughts at my 6-week checkup. She was so understanding. Starting Zoloft and already feel hopeful.', now() - interval '5 hours'),
  ('PelvicFloorPT', 'Please see a pelvic floor therapist even if you feel fine! So many issues are "common" but not "normal." Insurance often covers it now.', now() - interval '3 hours'),
  ('RealTalk', 'The pressure to "bounce back" physically is insane. Your body grew a human. Give yourself grace. It took 9 months to get here.', now() - interval '2 hours'),
  ('GratefulMom', '4 months postpartum and finally feeling like myself again. It was HARD. But the fog lifts. If you''re in the thick of it — hold on.', now() - interval '30 minutes')
) AS msgs(name, content, ts)
WHERE c.name = 'Postpartum Recovery';

-- Parenting Wins messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('HappyDad', 'My 3-year-old said "I love you daddy" unprompted for the first time today. I am NOT crying, you''re crying.', now() - interval '5 hours'),
  ('SoloMomStrong', 'Did the grocery store trip solo with a toddler and a newborn. Nobody cried (including me). That''s a WIN.', now() - interval '4 hours'),
  ('ProudPapa', 'My daughter shared her toy with another kid at the playground without being asked. All those gentle parenting talks are paying off!', now() - interval '3 hours'),
  ('MomOf3', 'Got all three kids to bed by 7:30pm. Nobody needed water, nobody had to pee, nobody was scared. Is this real life?', now() - interval '2 hours'),
  ('NewDad', 'Changed my first blowout diaper in public WITHOUT a changing table. Used the trunk of my car. Improvise. Adapt. Overcome.', now() - interval '1 hour')
) AS msgs(name, content, ts)
WHERE c.name = 'Parenting Wins';

-- Grandparent Boundaries messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('BoundaryQueen', 'My MIL keeps kissing my newborn on the mouth despite us asking her to stop. How do you enforce boundaries without causing a family war?', now() - interval '6 hours'),
  ('DiplomaticDad', '@BoundaryQueen We had the same issue. We sent a group text to ALL family with a "baby rules" list so nobody felt singled out. Worked perfectly.', now() - interval '5 hours'),
  ('TherapistMom', 'Remember: "No" is a complete sentence. You don''t need to justify your parenting decisions to anyone, including grandparents.', now() - interval '3 hours'),
  ('GratefulDIL', 'Positive post: my MIL asked "what are your rules for the baby?" before our first visit. I almost fainted from shock. Good grandparents exist!', now() - interval '2 hours'),
  ('StrugglingMom', 'My parents give my kids candy and screen time every time they visit despite our rules. I''ve tried talking, texting, even a family meeting. Nothing works.', now() - interval '1 hour')
) AS msgs(name, content, ts)
WHERE c.name = 'Grandparent Boundaries';

-- Mental Health for Moms messages
INSERT INTO channel_posts (channel_id, author_id, author_name, content, created_at)
SELECT c.id, '6c2f2688-3667-4e21-ac02-04301b0dc19c'::uuid, msgs.name, msgs.content, msgs.ts
FROM channels c,
(VALUES
  ('AnxiousMama', 'Does anyone else catastrophize everything? I check on my sleeping baby like 10 times a night. My therapist says it''s PPA. Starting treatment next week.', now() - interval '7 hours'),
  ('MedsAndMom', 'Lexapro literally saved my life postpartum. No shame in medication. My only regret is not starting sooner.', now() - interval '5 hours'),
  ('TherapyFan', 'Found an amazing therapist who specializes in perinatal mental health through Postpartum Support International. Free resources there too.', now() - interval '4 hours'),
  ('VulnerableDad', 'Dads get PPD too. I was in a dark place for months and finally talked to my doctor. Getting help was the bravest thing I ever did.', now() - interval '2 hours'),
  ('RecoveredMom', 'Two years ago I was in the deepest depression of my life. Today I ran a 5K while my toddler cheered me on. It gets better. I promise.', now() - interval '30 minutes')
) AS msgs(name, content, ts)
WHERE c.name = 'Mental Health for Moms';

-- Seed 25+ real community channels covering all parenting stages

INSERT INTO channels (name, description, category, channel_type, member_count) VALUES
  -- Pre-pregnancy & Fertility
  ('IVF & IUI Support', 'Going through fertility treatments? Share experiences, ask questions, and find comfort in this journey together.', 'fertility', 'public', 0),
  ('PCOS Warriors', 'Managing PCOS while trying to conceive. Tips, treatments, success stories, and emotional support.', 'fertility', 'public', 0),
  ('Ovulation Tracking', 'BBT charts, OPKs, cervical mucus — all things ovulation tracking for TTC.', 'fertility', 'public', 0),

  -- Pregnancy
  ('1st Trimester Club', 'Nausea, fatigue, and that secret excitement — surviving the first 12 weeks together.', 'pregnancy', 'public', 0),
  ('2nd Trimester Vibes', 'The golden trimester! Gender reveals, baby kicks, anatomy scans, and that pregnancy glow.', 'pregnancy', 'public', 0),
  ('3rd Trimester & Beyond', 'The final stretch — hospital bags, nesting, Braxton Hicks, and waiting for baby.', 'pregnancy', 'public', 0),
  ('Pregnancy Nutrition', 'What to eat, what to avoid, cravings, aversions, and meal planning for two.', 'pregnancy', 'public', 0),
  ('High Risk Pregnancy', 'A safe space for moms with high-risk pregnancies. Support, monitoring tips, and shared experiences.', 'pregnancy', 'public', 0),
  ('C-Section Recovery', 'Preparing for or recovering from a C-section. Tips, timelines, and emotional support.', 'pregnancy', 'public', 0),

  -- Newborn & Baby
  ('Breastfeeding Support', 'Latching issues, supply concerns, pumping schedules, and breastfeeding wins.', 'feeding', 'public', 0),
  ('Formula Feeding', 'No shame, just support. Formula recommendations, mixing tips, and feeding schedules.', 'feeding', 'public', 0),
  ('Baby-Led Weaning', 'Starting solids the BLW way. First foods, gagging vs choking, and messy mealtime photos.', 'feeding', 'public', 0),
  ('Postpartum Recovery', 'Your body after baby — healing, hormones, mental health, and finding your new normal.', 'wellness', 'public', 0),
  ('Postpartum Depression', 'You are not alone. Share your feelings, get support, and find resources for PPD/PPA.', 'wellness', 'public', 0),

  -- Toddler & Beyond
  ('Potty Training', 'Methods, readiness signs, accidents, and celebration dances — the potty training journey.', 'milestones', 'public', 0),
  ('Toddler Tantrums', 'Meltdowns in aisle 3? You are not alone. Strategies, humor, and solidarity.', 'parenting', 'public', 0),
  ('Screen Time Debate', 'How much is too much? Educational apps, TV limits, and finding balance.', 'parenting', 'public', 0),
  ('Daycare & Preschool', 'Finding, starting, and navigating daycare and preschool. Reviews, tips, and separation anxiety.', 'parenting', 'public', 0),
  ('Working Moms', 'Balancing career and motherhood. Schedules, guilt, wins, and everything in between.', 'community', 'public', 0),
  ('Stay at Home Parents', 'The hardest job with no paycheck. Activities, schedules, loneliness, and joy.', 'community', 'public', 0),

  -- Lifestyle & Wellness
  ('Self Care for Moms', 'Because you cannot pour from an empty cup. Skincare, exercise, hobbies, and me-time.', 'wellness', 'public', 0),
  ('Relationship After Baby', 'Keeping the spark alive, communication, division of labor, and couples therapy.', 'community', 'public', 0),
  ('Single Parents', 'Strength, resilience, and community. You are doing an amazing job.', 'community', 'public', 0),
  ('Eco-Friendly Parenting', 'Cloth diapers, sustainable toys, reducing waste, and raising eco-conscious kids.', 'community', 'public', 0),
  ('Budget Parenting', 'Saving money on baby gear, meal prep, DIY solutions, and financial planning.', 'community', 'public', 0),

  -- Health & Medical
  ('Baby Sleep Science', 'Sleep regressions, wake windows, nap schedules — the science behind baby sleep.', 'parenting', 'public', 0),
  ('Allergies & Intolerances', 'Managing food allergies, introducing allergens, and navigating dietary restrictions.', 'feeding', 'public', 0),
  ('Vaccines & Check-ups', 'Pediatric visit schedules, vaccine questions, growth charts, and development checks.', 'milestones', 'public', 0)
ON CONFLICT DO NOTHING;

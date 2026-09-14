/**
 * Starter FAQ questions for KIZ-AI, focused on Kolej Ibu Zain procedures and
 * residential-college life (not app how-tos). Answers are intentionally blank —
 * staff fill them in, then the rows are imported/indexed.
 *
 * Used for: the downloadable CSV template, and the "Add starter questions"
 * button in `urus-faq` (inserts them as unpublished drafts).
 *
 * Note: these are procedural prompts, not answers. Do NOT bake in specifics
 * (fees, phone numbers, times) — those must come from the KIZ office.
 */

export interface FaqSeedItem {
  category: string
  question: string
}

export const FAQ_CATEGORIES = [
  "Registration & Check-in",
  "Room & Facilities",
  "Fees & Payments",
  "Rules & Discipline",
  "Visitors & Guests",
  "Cleanliness & Maintenance",
  "Safety & Emergencies",
  "Welfare & Support",
  "Food & Dining",
  "Activities & Community",
  "Transport & Parking",
  "General & Contact",
] as const

export const FAQ_SEED: FaqSeedItem[] = [
  // Registration & Check-in
  { category: "Registration & Check-in", question: "What is the check-in procedure when I first arrive at KIZ?" },
  { category: "Registration & Check-in", question: "What documents do I need to bring for check-in?" },
  { category: "Registration & Check-in", question: "Where is the KIZ counter and what are its opening hours?" },
  { category: "Registration & Check-in", question: "What should I do if I arrive after the counter is closed?" },
  { category: "Registration & Check-in", question: "How do I collect my room key?" },
  { category: "Registration & Check-in", question: "What is the check-out procedure at the end of the semester?" },
  { category: "Registration & Check-in", question: "What happens if I check out late?" },
  { category: "Registration & Check-in", question: "Can I move in before the official check-in date?" },

  // Room & Facilities
  { category: "Room & Facilities", question: "What types of rooms are available at KIZ?" },
  { category: "Room & Facilities", question: "How are rooms allocated to students?" },
  { category: "Room & Facilities", question: "Can I choose my own room or roommate?" },
  { category: "Room & Facilities", question: "What furniture and facilities are provided in each room?" },
  { category: "Room & Facilities", question: "Is there air-conditioning in the rooms?" },
  { category: "Room & Facilities", question: "Can I bring my own electrical appliances such as a kettle, iron or fridge?" },
  { category: "Room & Facilities", question: "Are there shared kitchens or pantries?" },
  { category: "Room & Facilities", question: "Where is the laundry room and how much does it cost?" },
  { category: "Room & Facilities", question: "Is there a surau or prayer room at KIZ?" },
  { category: "Room & Facilities", question: "Are there study rooms or discussion areas?" },

  // Fees & Payments
  { category: "Fees & Payments", question: "How much are the residential college fees?" },
  { category: "Fees & Payments", question: "When and how do I pay my college fees?" },
  { category: "Fees & Payments", question: "Is there a deposit, and is it refundable?" },
  { category: "Fees & Payments", question: "What happens if I pay late?" },
  { category: "Fees & Payments", question: "Can I get a fee receipt for my records?" },
  { category: "Fees & Payments", question: "Are there financial aids or exemptions available?" },
  { category: "Fees & Payments", question: "What is the penalty for damaging college property?" },

  // Rules & Discipline
  { category: "Rules & Discipline", question: "What is the curfew or gate closing time at KIZ?" },
  { category: "Rules & Discipline", question: "Is cooking allowed in the rooms?" },
  { category: "Rules & Discipline", question: "What are the rules on smoking and vaping?" },
  { category: "Rules & Discipline", question: "Are pets allowed in the college?" },
  { category: "Rules & Discipline", question: "What is the policy on alcohol and prohibited items?" },
  { category: "Rules & Discipline", question: "What happens if I break the college rules?" },
  { category: "Rules & Discipline", question: "Is there a dress code at KIZ?" },
  { category: "Rules & Discipline", question: "Can I keep a bicycle or motorcycle at KIZ?" },
  { category: "Rules & Discipline", question: "What are the quiet hours?" },

  // Visitors & Guests
  { category: "Visitors & Guests", question: "What are the visiting hours at KIZ?" },
  { category: "Visitors & Guests", question: "How do I register a visitor at the gate?" },
  { category: "Visitors & Guests", question: "Can visitors stay overnight?" },
  { category: "Visitors & Guests", question: "Can I book a guest house for my family?" },
  { category: "Visitors & Guests", question: "Are male visitors allowed in female blocks, and vice versa?" },
  { category: "Visitors & Guests", question: "What are the rules for delivery riders and food delivery?" },
  { category: "Visitors & Guests", question: "What happens if my visitor breaks a rule?" },

  // Cleanliness & Maintenance
  { category: "Cleanliness & Maintenance", question: "How do I report a maintenance issue in my room?" },
  { category: "Cleanliness & Maintenance", question: "Who cleans the common areas and toilets?" },
  { category: "Cleanliness & Maintenance", question: "When is the garbage collected?" },
  { category: "Cleanliness & Maintenance", question: "How do I report a pest problem?" },
  { category: "Cleanliness & Maintenance", question: "What should I do if there is a water or electricity disruption?" },
  { category: "Cleanliness & Maintenance", question: "How do I report a faulty air-conditioner or fan?" },
  { category: "Cleanliness & Maintenance", question: "Can I request a room repair after office hours?" },

  // Safety & Emergencies
  { category: "Safety & Emergencies", question: "What number do I call in an emergency at KIZ?" },
  { category: "Safety & Emergencies", question: "Where is the guard post or security office?" },
  { category: "Safety & Emergencies", question: "What is the fire evacuation procedure?" },
  { category: "Safety & Emergencies", question: "Where are the fire extinguishers and emergency exits?" },
  { category: "Safety & Emergencies", question: "How do I report a security incident?" },
  { category: "Safety & Emergencies", question: "What should I do if I lose my room key?" },
  { category: "Safety & Emergencies", question: "Is there CCTV in the college?" },
  { category: "Safety & Emergencies", question: "Who do I contact for a medical emergency?" },

  // Welfare & Support
  { category: "Welfare & Support", question: "Where is the sick bay or first aid room?" },
  { category: "Welfare & Support", question: "Is there a counsellor or welfare officer at KIZ?" },
  { category: "Welfare & Support", question: "Who do I talk to if I have personal problems?" },
  { category: "Welfare & Support", question: "Are there study support or mentorship programmes?" },
  { category: "Welfare & Support", question: "What support is available for international students?" },
  { category: "Welfare & Support", question: "How do I report bullying or harassment?" },
  { category: "Welfare & Support", question: "Is there a food bank or financial assistance?" },

  // Food & Dining
  { category: "Food & Dining", question: "Is there a cafeteria or cafe at KIZ?" },
  { category: "Food & Dining", question: "What are the cafeteria opening hours?" },
  { category: "Food & Dining", question: "Can I cook my own food?" },
  { category: "Food & Dining", question: "Is there a convenience store nearby?" },

  // Activities & Community
  { category: "Activities & Community", question: "What student activities are organised at KIZ?" },
  { category: "Activities & Community", question: "How do I join the KIZ student committee (JKK)?" },
  { category: "Activities & Community", question: "Are there sports facilities at KIZ?" },
  { category: "Activities & Community", question: "How do I book the futsal court or sports facilities?" },
  { category: "Activities & Community", question: "Where can I see announcements about KIZ events?" },

  // Transport & Parking
  { category: "Transport & Parking", question: "Is there parking for students at KIZ?" },
  { category: "Transport & Parking", question: "How do I get to KIZ from the UKM main campus?" },
  { category: "Transport & Parking", question: "Is there a shuttle bus service?" },
  { category: "Transport & Parking", question: "Where can I park my motorcycle?" },

  // General & Contact
  { category: "General & Contact", question: "What is the full address of Kolej Ibu Zain?" },
  { category: "General & Contact", question: "Who is the Principal (Pengetua) of KIZ?" },
  { category: "General & Contact", question: "Who do I contact for general enquiries?" },
  { category: "General & Contact", question: "What are the office hours of the KIZ administration?" },
  { category: "General & Contact", question: "Where is the KIZ administrative office?" },
  { category: "General & Contact", question: "How do I appeal a decision made by the college?" },
]

/** CSV header used by the downloadable template and the importer. */
export const FAQ_CSV_HEADERS = ["category", "question", "answer", "keywords", "language", "published"] as const

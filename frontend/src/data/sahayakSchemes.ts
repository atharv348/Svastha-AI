import { Scheme } from "@/components/sahayak/SchemeResults";
import { EligibilityProfile } from "@/components/sahayak/EligibilityForm";

const ALL_SCHEMES: Scheme[] = [
  {
    id: "1",
    name: "ADIP Scheme (Assistance to Disabled Persons for Purchase/Fitting of Aids & Appliances)",
    description: "Provides assistive devices and aids to persons with disabilities to enhance their physical, social, and psychological rehabilitation.",
    benefit: "Free assistive devices worth up to Rs 10,000. For costly devices like cochlear implants, up to Rs 6 lakh.",
    eligibility: "Indian citizen with 40%+ disability, monthly income <= Rs 20,000. Age: 5+ years.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "Income Certificate", "Passport Size Photo", "Medical Records"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 5,
    category: "Assistive Devices",
    source: "Ministry of Social Justice & Empowerment",
    sourceUrl: "https://disabilityaffairs.gov.in/content/page/adip-scheme.php",
    applicationSteps: [
      "Visit your nearest District Disability Rehabilitation Centre (DDRC)",
      "Submit application form with required documents",
      "Medical assessment by authorized medical professional",
      "Device fitting and training session",
    ],
    state: "All India",
  },
  {
    id: "2",
    name: "Pre-Matric Scholarship for Students with Disabilities",
    description: "Financial assistance to students with disabilities studying in classes IX and X to reduce dropout rates.",
    benefit: "Rs 700/month (day scholars) or Rs 1,000/month (hostellers) + Rs 2,000 annual books allowance.",
    eligibility: "Students with 40%+ disability in classes IX-X. Family income <= Rs 2.5 lakh/year.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "Income Certificate", "School/College Certificate", "Bank Account (Jan Dhan)"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 5,
    category: "Education & Scholarship",
    source: "Ministry of Social Justice & Empowerment",
    sourceUrl: "https://scholarships.gov.in/",
    applicationSteps: [
      "Register on National Scholarship Portal (scholarships.gov.in)",
      "Fill scholarship application form online",
      "Upload required documents",
      "Verify through institute and district nodal officer",
    ],
    state: "All India",
  },
  {
    id: "3",
    name: "Post-Matric Scholarship for Students with Disabilities",
    description: "Scholarship for disabled students pursuing post-matric education including graduate and post-graduate courses.",
    benefit: "Rs 1,200/month (day scholars) or Rs 3,000/month (hostellers) + course fee reimbursement.",
    eligibility: "Students with 40%+ disability in post-matric courses. Family income <= Rs 2.5 lakh/year.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "Income Certificate", "School/College Certificate", "Bank Account (Jan Dhan)", "Domicile Certificate"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 6,
    category: "Education & Scholarship",
    source: "Ministry of Social Justice & Empowerment",
    sourceUrl: "https://scholarships.gov.in/",
    applicationSteps: [
      "Register on National Scholarship Portal",
      "Complete the application with course details",
      "Upload disability certificate and income proof",
      "Institute verification and final approval",
    ],
    state: "All India",
  },
  {
    id: "4",
    name: "Disability Pension (Indira Gandhi National Disability Pension Scheme)",
    description: "Monthly pension to persons with severe disabilities living below the poverty line.",
    benefit: "Rs 300/month from Central Government + state top-up (varies, typically Rs 200-1000).",
    eligibility: "Indian citizen aged 18-79 with 80%+ disability. Must be BPL.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "Ration Card (BPL)", "Bank Account (Jan Dhan)"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 4,
    category: "Financial Assistance",
    source: "Ministry of Rural Development",
    sourceUrl: "https://nsap.nic.in/",
    applicationSteps: [
      "Apply at Gram Panchayat (rural) or Municipal office (urban)",
      "Submit BPL certificate and disability certificate",
      "Verification by block/district officials",
      "Pension credited to bank account monthly",
    ],
    state: "All India",
  },
  {
    id: "5",
    name: "UDID Card (Unique Disability ID)",
    description: "A universal ID for persons with disabilities for easier access to all government benefits and schemes.",
    benefit: "Single document for availing all disability benefits. Valid across India. Simplifies scheme applications.",
    eligibility: "Any Indian citizen with a certified disability.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "Passport Size Photo", "Medical Records"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 4,
    category: "Legal Rights",
    source: "Department of Empowerment of Persons with Disabilities",
    sourceUrl: "https://www.swavlambancard.gov.in/",
    applicationSteps: [
      "Visit swavlambancard.gov.in and register",
      "Fill application form online",
      "Upload required documents and photo",
      "Visit nearest assessment center for verification",
      "Receive UDID card within 30 days",
    ],
    state: "All India",
  },
  {
    id: "6",
    name: "Maharashtra State Disability Pension",
    description: "Monthly pension by Government of Maharashtra for persons with disabilities.",
    benefit: "Rs 1,000/month pension directly to bank account.",
    eligibility: "Maharashtra domicile with 40%+ disability. Age 18+. Income <= Rs 21,000/year.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "Domicile Certificate", "Income Certificate", "Bank Account (Jan Dhan)"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 5,
    category: "Financial Assistance",
    source: "Maharashtra Social Welfare Department",
    sourceUrl: "https://sjsa.maharashtra.gov.in/",
    applicationSteps: [
      "Apply at district social welfare office or Setu center",
      "Submit application with required documents",
      "Tehsildar verification",
      "Approval and monthly pension credited",
    ],
    state: "Maharashtra",
  },
  {
    id: "7",
    name: "Free Bus Pass for Persons with Disabilities",
    description: "Free travel in state transport buses for disabled persons and one escort.",
    benefit: "100% concession on state transport buses. Escort also travels free.",
    eligibility: "Persons with 40%+ disability certificate. Valid disability ID required.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "Passport Size Photo"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 3,
    category: "Transport & Travel",
    source: "State Transport Corporation",
    sourceUrl: "https://disabilityaffairs.gov.in/content/page/transport.php",
    applicationSteps: [
      "Visit nearest state transport depot",
      "Submit disability certificate and photo",
      "Receive free bus pass card",
    ],
    state: "All India",
  },
  {
    id: "8",
    name: "Sugamya Bharat Abhiyan (Accessible India Campaign)",
    description: "Making built environment, transport, and ICT accessible for persons with disabilities.",
    benefit: "Improved accessibility in government buildings, transport, and digital platforms.",
    eligibility: "All persons with disabilities benefit from improved infrastructure.",
    requiredDocuments: ["Disability Certificate"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 1,
    category: "Legal Rights",
    source: "Department of Empowerment of PwD",
    sourceUrl: "https://disabilityaffairs.gov.in/content/page/accessible-india-campaign.php",
    applicationSteps: [
      "Report inaccessible infrastructure via the Sugamya Bharat app",
      "File accessibility audit request for government buildings",
    ],
    state: "All India",
  },
  {
    id: "9",
    name: "National Trust Schemes (Niramaya Health Insurance)",
    description: "Affordable health insurance scheme for persons with autism, cerebral palsy, mental retardation, and multiple disabilities.",
    benefit: "Health insurance cover of Rs 1 lakh per year at nominal premium of Rs 250-500.",
    eligibility: "Persons with autism, cerebral palsy, intellectual disability, or multiple disabilities.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "Bank Account (Jan Dhan)", "Passport Size Photo"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 4,
    category: "Healthcare",
    source: "National Trust",
    sourceUrl: "https://thenationaltrust.gov.in/content/scheme/niramaya.php",
    applicationSteps: [
      "Apply through registered organization (RO) of the National Trust",
      "Submit disability certificate and Aadhaar",
      "Pay nominal premium (Rs 250 for BPL, Rs 500 for others)",
      "Receive Niramaya health insurance card",
    ],
    state: "All India",
  },
  {
    id: "10",
    name: "Skill Training for Persons with Disabilities",
    description: "Free skill development and vocational training under the National Action Plan for Skill Development of PwDs.",
    benefit: "Free vocational training + Rs 2,000/month stipend during training period.",
    eligibility: "Persons with 40%+ disability, age 15-45 years. Minimum 5th pass.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "School/College Certificate", "Bank Account (Jan Dhan)"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 4,
    category: "Employment & Skill",
    source: "Ministry of Skill Development",
    sourceUrl: "https://disabilityaffairs.gov.in/content/page/skill-development.php",
    applicationSteps: [
      "Visit nearest Vocational Rehabilitation Centre (VRC)",
      "Register and undergo aptitude assessment",
      "Select suitable trade/skill course",
      "Complete training and receive certificate",
    ],
    state: "All India",
  },
  {
    id: "11",
    name: "Sanjay Gandhi Niradhar Anudan Yojana",
    description: "Financial assistance for destitute persons including those with disabilities in Maharashtra.",
    benefit: "Rs 1,000/month for single person, Rs 1,500 for families.",
    eligibility: "Maharashtra resident with 40%+ disability, BPL category. No other pension received.",
    requiredDocuments: ["Disability Certificate", "Aadhaar Card", "Ration Card (BPL)", "Domicile Certificate", "Bank Account (Jan Dhan)", "Income Certificate"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 6,
    category: "Financial Assistance",
    source: "Maharashtra Social Welfare Department",
    sourceUrl: "https://sjsa.maharashtra.gov.in/",
    applicationSteps: [
      "Apply at Tahsil office or online via Aaple Sarkar portal",
      "Submit all required documents",
      "Talathi/Gram Sevak verification",
      "District collector approval",
      "Monthly pension credited to bank account",
    ],
    state: "Maharashtra",
  },
  {
    id: "12",
    name: "4% Reservation in Government Jobs",
    description: "Mandatory reservation of posts in government establishments for persons with benchmark disabilities under RPwD Act 2016.",
    benefit: "4% reserved vacancies in Groups A, B, C, and D government posts.",
    eligibility: "Indian citizen with 40%+ benchmark disability. Meet educational qualifications for the post.",
    requiredDocuments: ["UDID Card", "Disability Certificate", "Aadhaar Card", "School/College Certificate"],
    matchScore: 0,
    docsMatched: 0,
    docsTotal: 4,
    category: "Employment & Skill",
    source: "DoPT, Government of India",
    sourceUrl: "https://disabilityaffairs.gov.in/content/page/reservation.php",
    applicationSteps: [
      "Check government job notifications for PwD vacancies",
      "Apply with disability certificate and UDID",
      "Appear for selection process",
      "Medical board verification at time of appointment",
    ],
    state: "All India",
  },
];

export function matchSchemes(profile: EligibilityProfile): Scheme[] {
  return ALL_SCHEMES.map((scheme) => {
    const docsMatched = scheme.requiredDocuments.filter((doc) =>
      profile.documentsAvailable.includes(doc)
    ).length;
    const docsTotal = scheme.requiredDocuments.length;
    const matchScore = Math.round((docsMatched / docsTotal) * 100);

    return {
      ...scheme,
      docsMatched,
      docsTotal,
      matchScore,
    };
  })
    .filter(
      (s) =>
        s.state === "All India" ||
        s.state.toLowerCase() === profile.state.toLowerCase()
    )
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function searchSchemes(query: string, category: string): Scheme[] {
  const q = query.toLowerCase();
  return ALL_SCHEMES.filter((s) => {
    const matchesCategory = category === "All Categories" || s.category === category;
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.benefit.toLowerCase().includes(q) ||
      s.eligibility.toLowerCase().includes(q) ||
      s.state.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });
}

import type { Specialization, ConsultationType } from "@/lib/types/legal";

export const SPECIALIZATIONS: Specialization[] = [
  "Criminal Law",
  "Family Law",
  "Civil Law",
  "Property Law",
  "Corporate Law",
  "Contract Law",
  "Cybercrime Law",
  "Consumer Law",
  "Labour & Employment Law",
  "Banking Law",
  "Tax Law",
  "Intellectual Property",
  "Constitutional Law",
  "Immigration",
  "Estate Planning",
  "Other",
];

export const BAR_COUNCILS = [
  "Pakistan Bar Council",
  "Sindh Bar Council",
  "Punjab Bar Council",
  "Khyber Pakhtunkhwa Bar Council",
  "Balochistan Bar Council",
  "Islamabad Bar Council",
] as const;

export const PAKISTAN_CITIES: Record<string, string[]> = {
  Karachi: [
    "Clifton",
    "DHA",
    "Gulshan-e-Iqbal",
    "North Nazimabad",
    "PECHS",
    "Saddar",
    "Gulistan-e-Johar",
    "Malir",
    "Korangi",
    "Nazimabad",
    "Federal B Area",
    "Bahria Town",
  ],
  Lahore: [
    "Gulberg",
    "DHA",
    "Model Town",
    "Johar Town",
    "Cantt",
    "Faisal Town",
    "Garden Town",
    "Wapda Town",
    "Shadman",
    "Mall Road",
  ],
  Islamabad: [
    "Blue Area",
    "F-6",
    "F-7",
    "F-8",
    "F-10",
    "F-11",
    "G-6",
    "G-8",
    "G-10",
    "G-11",
    "DHA",
    "Bahria Town",
  ],
  Rawalpindi: [
    "Saddar",
    "Satellite Town",
    "Chaklala",
    "Westridge",
    "Bahria Town",
    "Gulraiz",
  ],
  Peshawar: ["University Town", "Hayatabad", "Cantt", "Saddar", "Dabgari"],
  Quetta: ["Cantt", "Jinnah Town", "Samungli", "Zarghoon Road"],
  Multan: ["Cantt", "Gulgasht Colony", "Bosan Road", "Shah Rukn-e-Alam"],
  Faisalabad: ["Civil Lines", "Madina Town", "D Ground", "Peoples Colony"],
};

export const CITIES = Object.keys(PAKISTAN_CITIES);

export const CONSULTATION_TYPES: { id: ConsultationType; label: string; icon: string }[] = [
  { id: "in_person", label: "In-Person Office", icon: "Building2" },
  { id: "video", label: "Video Call", icon: "Video" },
  { id: "phone", label: "Phone Consultation", icon: "Phone" },
];

export interface LegalDocTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  fields: {
    key: string;
    label: string;
    type: "text" | "textarea" | "date" | "number";
    placeholder?: string;
    required: boolean;
  }[];
  render: (data: Record<string, string>) => string;
}

export const LEGAL_DOCUMENT_TEMPLATES: LegalDocTemplate[] = [
  {
    id: "legal_notice",
    title: "Legal Notice for Recovery / Demand",
    description: "Formal statutory legal notice demanding payment or performance of contractual duty before initiating litigation.",
    category: "Notices",
    fields: [
      { key: "sender_name", label: "Your Full Name / Client Name", type: "text", required: true },
      { key: "sender_address", label: "Your Complete Address", type: "textarea", required: true },
      { key: "recipient_name", label: "Recipient / Defaulter Name", type: "text", required: true },
      { key: "recipient_address", label: "Recipient Complete Address", type: "textarea", required: true },
      { key: "matter_subject", label: "Subject Line", type: "text", placeholder: "Legal Notice for recovery of Rs. ...", required: true },
      { key: "matter_details", label: "Facts & Chronology of Dispute", type: "textarea", placeholder: "Details of agreement, default, and breach...", required: true },
      { key: "amount_or_action", label: "Demanded Action or Amount (PKR)", type: "text", required: true },
      { key: "deadline_days", label: "Response Period (Days)", type: "number", placeholder: "14", required: true },
    ],
    render: (d) => `LEGAL NOTICE
(Under Section 80 CPC / Relevant Enactments of Pakistan)

Date: ${new Date().toLocaleDateString("en-GB")}

To:
${d.recipient_name || "[Recipient Name]"}
${d.recipient_address || "[Recipient Address]"}

From:
${d.sender_name || "[Sender Name]"}
${d.sender_address || "[Sender Address]"}

SUBJECT: ${d.matter_subject || "LEGAL NOTICE"}

Sir/Madam,

Under instructions and on behalf of my client / sender, I hereby address you with this formal Legal Notice as follows:

1. That you entered into an agreement/transaction with the sender, particulars whereof are as follows:
${d.matter_details || "[Details of matter]"}

2. That despite lawful obligations and repeated verbal and written requests, you have deliberately failed to comply with the terms and have committed persistent default.

3. That your wrongful and illegal conduct has caused severe monetary loss, mental agony, and disruption.

DEMAND:
You are hereby called upon to ${d.amount_or_action || "fulfill your contractual obligations and make payment of the outstanding amount"} within ${d.deadline_days || "14"} days from the receipt of this legal notice.

TAKE NOTICE that in the event of your failure to comply within the stipulated statutory period of ${d.deadline_days || "14"} days, my client shall be constrained to initiate appropriate civil and criminal proceedings against you before the competent courts of law at your sole risk, cost, and legal consequences.

A copy of this notice is retained for record and future legal reference.

Yours faithfully,

___________________________
${d.sender_name || "[Sender Signature]"}`,
  },
  {
    id: "affidavit",
    title: "General Affidavit of Facts",
    description: "Sworn legal declaration on oath attested before an Oath Commissioner / Notary Public.",
    category: "Affidavits",
    fields: [
      { key: "deponent_name", label: "Deponent Full Name", type: "text", required: true },
      { key: "father_husband_name", label: "Father's / Husband's Name", type: "text", required: true },
      { key: "cnic", label: "CNIC Number", type: "text", placeholder: "42101-XXXXXXX-X", required: true },
      { key: "address", label: "Residential Address", type: "textarea", required: true },
      { key: "statements", label: "Sworn Statements / Facts (Numbered)", type: "textarea", placeholder: "1. That I am a bona fide citizen...\n2. That...", required: true },
    ],
    render: (d) => `AFFIDAVIT
(On Stamped Non-Judicial Paper)

I, ${d.deponent_name || "[Deponent Name]"}, son/daughter/wife of ${d.father_husband_name || "[Father/Husband Name]"}, holding CNIC No. ${d.cnic || "[CNIC]"}, Muslim, adult, resident of ${d.address || "[Address]"}, do hereby solemnly affirm and declare on oath as under:

1. That I am the deponent herein and am well conversant with the facts of this matter.

${d.statements || "2. That the statements made herein are true and correct to the best of my knowledge and belief."}

VERIFICATION:
Verified on oath at ${new Date().toLocaleDateString("en-GB")} that the contents of the above affidavit are true and correct to the best of my knowledge, information, and belief, and nothing material has been concealed or falsely stated.

DEPONENT:

___________________________
${d.deponent_name || "[Deponent Signature]"}
CNIC: ${d.cnic || ""}`,
  },
  {
    id: "undertaking",
    title: "Written Undertaking",
    description: "Binding personal undertaking for compliance with institutional, organizational, or private conditions.",
    category: "Undertakings",
    fields: [
      { key: "person_name", label: "Full Name", type: "text", required: true },
      { key: "cnic", label: "CNIC Number", type: "text", required: true },
      { key: "beneficiary", label: "In Favour Of (Organization / Person)", type: "text", required: true },
      { key: "covenants", label: "Terms of Undertaking", type: "textarea", placeholder: "I undertake and promise that I shall...", required: true },
    ],
    render: (d) => `UNDERTAKING

To:
${d.beneficiary || "[Organization / Beneficiary]"}

I, ${d.person_name || "[Full Name]"}, holding CNIC No. ${d.cnic || "[CNIC]"}, do hereby undertake and confirm as under:

${d.covenants || "I hereby undertake to abide by all applicable rules, regulations, and instructions, and accept full legal responsibility for any default."}

In witness whereof, I have signed this undertaking voluntarily and of my own free will without any coercion or duress.

Date: ${new Date().toLocaleDateString("en-GB")}

Signature: ___________________________
Name: ${d.person_name || ""}
CNIC: ${d.cnic || ""}`,
  },
  {
    id: "authorization_letter",
    title: "Letter of Authorization",
    description: "Authorize an agent or representative to submit documents, collect records, or represent you before authorities.",
    category: "Authorizations",
    fields: [
      { key: "authorizer_name", label: "Your Full Name (Authorizer)", type: "text", required: true },
      { key: "authorizer_cnic", label: "Your CNIC Number", type: "text", required: true },
      { key: "authorized_person", label: "Authorized Representative Name", type: "text", required: true },
      { key: "authorized_cnic", label: "Authorized Representative CNIC", type: "text", required: true },
      { key: "purpose", label: "Authorized Scope & Acts", type: "textarea", placeholder: "To collect degree / submit application / verify property documents at...", required: true },
    ],
    render: (d) => `LETTER OF AUTHORIZATION

Date: ${new Date().toLocaleDateString("en-GB")}

TO WHOM IT MAY CONCERN

I, ${d.authorizer_name || "[Authorizer Name]"}, holding CNIC No. ${d.authorizer_cnic || "[Authorizer CNIC]"}, do hereby authorize Mr./Ms. ${d.authorized_person || "[Authorized Person]"}, holding CNIC No. ${d.authorized_cnic || "[Authorized CNIC]"}, to act on my behalf for the following specific purposes:

${d.purpose || "[Authorized Scope & Duties]"}

All acts and submissions lawfully carried out by the said authorized representative within this scope shall be deemed to have been executed by me personally.

Authorizer Signature: ___________________________
Name: ${d.authorizer_name || ""}
CNIC: ${d.authorizer_cnic || ""}

Specimen Signature of Representative: ___________________________
Name: ${d.authorized_person || ""}
CNIC: ${d.authorized_cnic || ""}`,
  },
];

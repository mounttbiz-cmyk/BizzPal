import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Privacy Policy — BizzPal",
  description: "How bizzpal.ai handles information when you use its AI business-guidance service.",
};

const OPERATOR = "Mountt Sense Private Limited (CIN: U85499MH2023PTC401801)";
const OFFICE = "834, Lodha Signet, Dombivli East, Thane, Maharashtra – 421204, India";

const SECTIONS: LegalSection[] = [
  {
    title: "1. Information we may handle",
    blocks: [
      { type: "h3", text: "Information you provide" },
      {
        type: "ul",
        items: [
          "Account and contact details, such as your name, email address, organisation, login details, and preferences.",
          "Questions, prompts, business descriptions, files, notes, and other material you submit, as well as AI-generated responses and conversation history. These may contain personal or confidential information if you choose to include it.",
          "Business details and figures you enter or upload, such as your company name, industry, GSTIN, website, team members you invite, and spreadsheets or documents you import.",
          "Support messages, feedback, survey responses, and information you provide when you contact us.",
        ],
      },
      { type: "h3", text: "Information generated or collected through use" },
      {
        type: "ul",
        items: [
          "Usage and technical information such as pages or features used, approximate timestamps, device and browser information, language, diagnostic logs, and security events.",
          "Cookie and similar technology information, as described in Section 6.",
        ],
      },
      { type: "h3", text: "Payment-related information" },
      { type: "p", text: "If you purchase a plan or credits, our payment provider collects your payment credentials directly on its own checkout. Card, UPI and bank details never reach BizzPal. We receive and keep transaction information such as the plan or credit pack purchased, amount, currency, payment status, receipt details and transaction reference. If you provide billing details or tax identifiers such as GSTIN or PAN, we use them to issue invoices and administer applicable tax, accounting, or withholding obligations." },
      { type: "p", text: "If you choose to connect your own Razorpay or Stripe account so that BizzPal can show your real revenue, you give us an API key. We store it in encrypted form and use it only to read your payments for you." },
      { type: "h3", text: "Information from Google and Microsoft" },
      { type: "p", text: "If you sign in with Google or connect Google Drive or Microsoft OneDrive, we receive your name, email address and profile picture, and the files you choose to import. Section 13 explains how we use Google user data." },
    ],
  },
  {
    title: "2. Information you choose to put into AI prompts",
    blocks: [
      { type: "p", text: "BizzPal is designed to respond to business questions. A prompt can still contain personal information, confidential business information, or information about other people. Please provide only information that is necessary for the question and that you are legally permitted to share. Do not submit passwords, payment-card numbers, government identity numbers, or highly sensitive personal information unless a specific feature requires it and we have clearly explained why." },
    ],
  },
  {
    title: "3. How we use information",
    blocks: [
      { type: "p", text: "We use information, as applicable, to:" },
      {
        type: "ul",
        items: [
          "create and administer accounts, provide AI responses, maintain conversation history, and deliver plan features;",
          "process purchases, manage subscriptions or other plan payments, and provide receipts and account notices;",
          "send the emails you ask for or that the Service needs, such as password reset links, team invitations and the daily briefing if you turn it on;",
          "respond to questions, provide support, and communicate important service or security updates;",
          "maintain, secure, troubleshoot, and improve the Service using relevant service-usage and technical information, including detecting abuse, fraud, or technical problems. This does not authorise use of User Content to train foundation models contrary to Section 4;",
          "understand product usage, prepare aggregated reporting, and evaluate features, subject to applicable law; and",
          "comply with legal obligations, protect rights and safety, and establish or defend legal claims.",
        ],
      },
      { type: "p", text: "Where a privacy law requires a legal basis, we rely on the basis applicable to the particular purpose, which may include providing a service you request, your consent, our legitimate or otherwise permitted business purposes, and compliance with legal obligations. Where processing relies on consent, you may withdraw it as permitted by law; withdrawal does not invalidate processing already carried out lawfully." },
    ],
  },
  {
    title: "4. AI processing and model providers",
    blocks: [
      { type: "p", text: "To generate a response, prompts and relevant context may be processed by AI model or cloud-service providers acting for BizzPal. The providers we may use include Google (Gemini), Groq, OpenRouter, Mistral and Cohere; a prompt is sent to the provider that answers it. Mountt Sense Private Limited and providers acting for BizzPal will not use your prompts, uploaded documents, or other User Content to train, fine-tune, or improve generalized or public foundation models without your explicit prior consent. Processing to generate your requested response, operate and secure the Service, provide support, or detect abuse is still permitted. We will require configured providers to apply settings and contractual restrictions that enforce this no-training commitment." },
      { type: "p", text: "BizzPal may review limited conversation content for support, safety, abuse investigation, or service quality only as permitted by applicable law and the disclosures made to you." },
    ],
  },
  {
    title: "5. When we share information",
    blocks: [
      { type: "p", text: "We may share information with the following categories of recipients where needed for the purposes in this Policy:" },
      {
        type: "ul",
        items: [
          "service providers that host the Service or provide AI models, infrastructure, account authentication, email delivery, customer support, security, and payment processing;",
          "professional advisers, auditors, insurers, and similar recipients who are subject to appropriate duties;",
          "government authorities, courts, regulators, or other parties when disclosure is required by law or reasonably necessary to protect rights, safety, or the Service; and",
          "a successor or transaction counterparty in connection with a merger, financing, restructuring, or sale of all or part of the relevant business, subject to appropriate safeguards and applicable law.",
        ],
      },
      { type: "p", text: "We do not sell personal information for money. We do not share information for another party’s independent marketing unless you have been told and, where required, have agreed." },
      { type: "p", text: "If you invite a teammate, they can see the business information that your role settings allow. You decide what each role can open on the Team page." },
    ],
  },
  {
    title: "6. Cookies and analytics",
    blocks: [
      { type: "p", text: "BizzPal uses only essential cookies and browser storage. We use a sign-in cookie that keeps you signed in for up to 7 days and is not readable by scripts on the page, and we store your display preferences and set-up progress in your browser. We do not use advertising cookies and we do not use third-party analytics or tracking tools on the site. You can clear this storage in your browser at any time; doing so signs you out." },
    ],
  },
  {
    title: "7. Retention",
    blocks: [
      { type: "p", text: "We retain information for as long as reasonably necessary to provide the Service, maintain account and transaction records, address support issues, protect the Service, comply with legal obligations, and resolve disputes. When information is no longer needed, we delete it, anonymise it, or securely isolate it where deletion is not immediately feasible or where law requires retention." },
      {
        type: "ul",
        items: [
          "Account, business, conversation and uploaded-file data are kept while your account is open.",
          "If you delete your account in Settings, or ask us to, we delete this data from our live systems.",
          "We take a daily backup of our database and keep the 14 most recent copies, so deleted data can remain in a backup for up to about two weeks before it is overwritten.",
          "Payment and invoice records are kept for as long as tax and accounting law requires.",
          "Password reset links expire after one hour and can be used once.",
          "Server logs are kept only as long as needed for security and troubleshooting.",
        ],
      },
    ],
  },
  {
    title: "8. Security",
    blocks: [
      { type: "p", text: "We use administrative, technical, and organisational safeguards appropriate to the nature of the information and the risks involved. They include:" },
      {
        type: "ul",
        items: [
          "encryption of data in transit between your browser and our servers (HTTPS);",
          "passwords stored only as salted one-way hashes, with a lock-out after repeated wrong attempts;",
          "connection tokens and API keys for connected services stored in encrypted form;",
          "a signed, HTTP-only sign-in cookie, and checks on every request so that one customer cannot read or change another customer’s data;",
          "role-based access for teammates, enforced on our servers;",
          "a separate, protected administration area, and daily database backups.",
        ],
      },
      { type: "p", text: "Access should be limited to authorised people and providers who need it for the stated purposes. No website, AI system, or electronic storage method is completely secure." },
    ],
  },
  {
    title: "9. International processing",
    blocks: [
      { type: "p", text: "BizzPal is intended for users in India and other countries. Our application runs on Google Cloud infrastructure. Our AI model providers may process prompts in other countries, including the United States. Those countries may have data-protection rules different from those in your location. Where required, we use lawful transfer mechanisms and appropriate safeguards." },
    ],
  },
  {
    title: "10. Your choices and privacy rights",
    blocks: [
      { type: "p", text: "Depending on where you live and applicable law, you may have rights to request access to, correction of, or deletion of personal information; withdraw consent; object to or restrict certain processing; obtain a copy of information; or complain to a privacy regulator. The scope and availability of these rights vary by jurisdiction and may be subject to legal exceptions." },
      { type: "p", text: "To make a request, email care@bizzpal.ai from the address associated with your account and describe what you need. We may ask for information to verify your identity and will respond within the period required by applicable law. You may also contact the relevant data-protection authority where permitted." },
      { type: "p", text: "For India-specific privacy requests or grievances, contact the Designated Grievance & Data Protection Officer, Praveen Kumar, at care@bizzpal.ai or write to our registered office listed in this Policy. We aim to acknowledge complaints within 48 hours. Where Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, as amended, applies, we will acknowledge within 24 hours and resolve within seven days, or any shorter period applicable to a specified complaint. Other privacy complaints are targeted for resolution within 15 days and no later than 30 days, subject to any shorter or different statutory deadline. Rights requests will be handled within the applicable data-protection timelines, including the DPDP Act and Rules to the extent their relevant provisions are in force and apply." },
    ],
  },
  {
    title: "11. Children",
    blocks: [
      { type: "p", text: "The Service is intended for adults and business users. It is not designed for children under 18, and we do not knowingly invite children to create accounts. If you believe a child has provided personal information to us, contact care@bizzpal.ai so we can assess and take appropriate steps." },
    ],
  },
  {
    title: "12. Third-party websites and services",
    blocks: [
      { type: "p", text: "The Service may link to websites or tools operated by third parties. Their privacy practices are governed by their own notices. Review those notices before sharing information with them. BizzPal is not responsible for privacy practices of services it does not operate." },
      { type: "p", text: "DataPal can look up public YouTube channel information through YouTube API Services. That information is saved for a short time (up to a few days) so repeat lookups are quick, and is then deleted. By using the YouTube lookup you also agree to the YouTube Terms of Service (https://www.youtube.com/t/terms), and Google’s Privacy Policy (https://policies.google.com/privacy) applies to that data." },
    ],
  },
  {
    title: "13. Google user data",
    blocks: [
      { type: "p", text: "If you choose to sign in with Google or connect Google Drive, BizzPal asks Google for the following access:" },
      {
        type: "ul",
        items: [
          "Your name, email address and profile picture, to create your account and sign you in.",
          "Google Drive files you choose (the drive.file permission). BizzPal can open only the specific files you pick in Google’s file picker. It cannot see the rest of your Drive.",
        ],
      },
      { type: "p", text: "We use this data only to run these features for you: signing you in and importing the files you select into your own workspace. We do not sell it, use it for advertising, or share it with third parties. Humans at BizzPal do not read it unless you ask us for support." },
      { type: "p", text: "BizzPal’s use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements." },
      { type: "p", text: "You can disconnect Google Drive at any time from the Integrations page, or remove BizzPal’s access from your Google Account permissions page. You can delete your account and all stored data from Settings, or by emailing care@bizzpal.ai." },
    ],
  },
  {
    title: "14. Changes to this Policy",
    blocks: [
      { type: "p", text: "We may update this Policy to reflect changes in the Service, our processing, or applicable law. We will update the effective date and provide additional notice or obtain consent where required. The current version will be available on bizzpal.ai. If a change materially affects your rights, we will provide reasonable notice where required by law." },
    ],
  },
  {
    title: "15. Contact and privacy requests",
    blocks: [
      { type: "p", text: "For privacy questions, requests, or complaints, contact care@bizzpal.ai." },
      { type: "ul", items: [`Legal Operator: ${OPERATOR}`, `Registered Office: ${OFFICE}`, "Designated Grievance & Data Protection Officer: Praveen Kumar", "Privacy & Grievance Email: care@bizzpal.ai"] },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      current="privacy"
      badge="Data protection"
      title="Privacy Policy"
      subtitle="How bizzpal.ai handles information when you use its AI business-guidance service"
      facts={["Effective Date: 16 November 2026 | Last Updated: 18 November 2026", "Website: https://bizzpal.ai", `Operator: ${OPERATOR}`, "Privacy & Grievance Email: care@bizzpal.ai"]}
      intro={[
        `This Privacy Policy explains how ${OPERATOR}, the operator of bizzpal.ai, collects, uses, stores, and shares information in connection with bizzpal.ai and its AI-powered business guidance service (“BizzPal,” “we,” “us,” or “our”). Our registered office is ${OFFICE}.`,
        "This Policy applies to website visitors, account holders, people who contact us, and other individuals whose information is processed through the Service. It should be read with any short privacy notice, consent request, or plan-specific notice shown when information is collected.",
      ]}
      sections={SECTIONS}
    />
  );
}

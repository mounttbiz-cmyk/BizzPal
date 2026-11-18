import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Terms & Conditions — BizzPal",
  description: "Terms for using the bizzpal.ai AI business-guidance service.",
};

const OPERATOR = "Mountt Sense Private Limited (CIN: U85499MH2023PTC401801)";
const OFFICE = "834, Lodha Signet, Dombivli East, Thane, Maharashtra – 421204, India";

const SECTIONS: LegalSection[] = [
  {
    title: "1. What the Service does",
    blocks: [
      { type: "p", text: "BizzPal provides AI-assisted guidance intended to help people think through business questions. Topics may include business roles and responsibilities, staffing, operational processes, technology choices, planning, and general information about legal or regulatory requirements. The Service may generate explanations, examples, checklists, suggested questions, and other responses from information supplied by you and from sources available to the system." },
      { type: "p", text: "Features, availability, supported languages, usage limits, and outputs may vary by plan and may change over time. Any plan-specific limits, included usage, and feature descriptions shown during purchase form part of the applicable plan offer." },
    ],
  },
  {
    title: "2. Important limits on AI guidance",
    blocks: [
      { type: "p", text: "The Service provides general informational assistance only. It is not a law firm, accounting firm, tax adviser, financial adviser, human-resources adviser, cybersecurity consultancy, or other licensed professional service. An AI response is not legal, tax, accounting, financial, employment, investment, regulatory, or other professional advice, and using the Service does not create a professional-client relationship." },
      { type: "p", text: "AI-generated responses can be incomplete, inaccurate, outdated, biased, or unsuitable for your circumstances. The Service may misunderstand a question, omit a relevant rule, or present a plausible-sounding answer that is wrong. Laws and requirements differ by location and can change. Do not treat a response as a guarantee of compliance or as a substitute for checking authoritative sources or consulting a qualified professional." },
      { type: "p", text: "You are responsible for reviewing outputs, verifying material facts and legal requirements, and making your own business decisions. Before acting on legal, tax, employment, financial, safety, or regulatory questions, obtain advice from a qualified professional in the relevant jurisdiction. Do not rely on the Service for emergency or time-critical decisions." },
    ],
  },
  {
    title: "3. Accounts and eligibility",
    blocks: [
      { type: "p", text: "You must be at least 18 years old and legally able to enter into a contract to create an account or purchase a plan. You must provide accurate account information, keep it current, protect your login credentials, and promptly tell us if you suspect unauthorised access. You are responsible for activity carried out through your account, except to the extent caused by our failure to meet a non-excludable legal duty." },
      { type: "p", text: "If the Service is used by multiple people under an organisation account, the account owner is responsible for assigning access appropriately and ensuring that authorised users comply with these Terms." },
    ],
  },
  {
    title: "4. Your content and responsibilities",
    blocks: [
      { type: "p", text: "“User Content” means questions, prompts, text, files, business information, feedback, or other material that you submit to the Service. You retain rights you have in your User Content. You are responsible for having the rights and permissions needed to provide it and for ensuring that it is lawful, accurate enough for your intended use, and appropriate to process through an AI service." },
      { type: "p", text: "You grant BizzPal a limited, non-exclusive licence to host, store, reproduce, transmit, and process User Content only as reasonably necessary to provide, secure, support, and maintain the Service, comply with law, and carry out any additional use that you expressly authorise. The Service may send relevant User Content to third-party AI or infrastructure providers as described in the Privacy Policy." },
      { type: "h3", text: "4.1 No training of general-purpose foundation models" },
      { type: "p", text: "Mountt Sense Private Limited will not use your User Content, business prompts, or uploaded documents to train, fine-tune, or improve generalized or public foundation models without your explicit prior consent. We will require AI subprocessors configured for BizzPal to apply settings and contractual restrictions that prevent such training. This restriction does not prevent processing needed to generate your requested response, provide or support the Service, maintain security, or detect abuse. Any human review is described in the Privacy Policy." },
      { type: "p", text: "Do not submit confidential, sensitive, or personal information unless you have a lawful basis and it is reasonably necessary for the question. In particular, avoid submitting payment-card credentials, authentication secrets, government identifiers, health information, or personal information about other people unless the Service specifically requests it and you are authorised to share it." },
    ],
  },
  {
    title: "5. Acceptable use",
    blocks: [
      { type: "p", text: "You must use the Service lawfully and responsibly. You must not:" },
      {
        type: "ul",
        items: [
          "use the Service to violate law, infringe another person’s rights, deceive or defraud, harass, threaten, or facilitate harm;",
          "submit content that you are not authorised to share, or use outputs to make a consequential decision about another person without appropriate human review and legal safeguards;",
          "attempt to bypass plan limits, interfere with the Service, probe or defeat its security, reverse engineer it except where applicable law permits, or access another user’s account or data;",
          "use the Service or its outputs to develop or train a competing general-purpose AI service, or to misrepresent an AI output as verified professional advice;",
          "upload malware, spam, unlawful content, or material that infringes intellectual-property or privacy rights; or",
          "use contact details found through DataPal, including business and YouTube channel details, for spam, harassment, or marketing that breaks applicable anti-spam, consent, or data-protection law.",
        ],
      },
      { type: "p", text: "We may investigate suspected misuse and take proportionate action, including restricting access, removing content, or suspending an account, subject to applicable law and the procedures described in these Terms." },
    ],
  },
  {
    title: "6. Plans, payment, taxes, and refunds",
    blocks: [
      { type: "p", text: "Paid access is offered through the plans displayed on bizzpal.ai. Depending on the selected plan, payment may be one-time or recurring. The price, billing currency, billing interval, usage allowance, renewal status, applicable taxes, and payment method will be shown before you confirm a purchase. The checkout information for your selected plan controls if it differs from a general description on the website." },
      { type: "p", text: "For recurring plans, the checkout will state whether the plan renews automatically and the amount or basis for the next charge. If you choose an automatically renewing plan, you authorise the applicable payment provider to charge your selected payment method at each disclosed renewal until you cancel. You may cancel at any time using the cancellation method in your account or by emailing care@bizzpal.ai. Cancellation stops future renewals; access normally continues through the end of the current paid period. Cancellation does not by itself create a refund for the current period, except where the plan offer or applicable law provides otherwise." },
      { type: "p", text: "You are responsible for charges and taxes applicable to your purchase. We will identify taxes or fees at checkout where required. If a payment fails, we may retry it or limit paid features until payment is received, subject to applicable law." },
      { type: "p", text: "Unless the selected plan clearly states a different refund rule before purchase, payments are non-refundable after the paid Service period begins. Cancelling a recurring plan stops future renewals but does not create a pro-rated refund for the current period. Unused usage allowances or credits expire at the end of the applicable plan period unless the plan offer says otherwise. We will correct duplicate or incorrectly charged payments. These rules do not limit refunds or other remedies required by applicable law." },
      { type: "p", text: "Payments may be processed by third-party payment providers identified during checkout. The provider handles payment credentials under its own terms and privacy notice. BizzPal receives payment-related information reasonably needed to administer the order, such as transaction status, amount, currency, plan, and receipt details. BizzPal does not ask you to send payment-card credentials by email or in an AI prompt." },
      { type: "h3", text: "6.1 Indian tax treatment and withholding" },
      { type: "p", text: "Where applicable, BizzPal invoices may identify the relevant service under SAC 998313 (Information technology consulting and support services). The service code stated on the tax invoice and applicable law control. If an Indian customer is required to deduct tax at source, the customer must deduct and deposit it under the law in force and provide BizzPal a valid TDS certificate. For a payment that qualifies as fees for technical services under Section 393(1), Table S. No. 6(iii) of the Income-tax Act, 2025, the current rate is 2%, subject to applicable thresholds and all other statutory conditions; a different category or rate may apply to other payments. The TDS base and treatment of separately stated GST are determined by applicable law and current tax guidance. This summary is informational and is not tax advice." },
      { type: "h3", text: "6.2 Recurring payment mandates" },
      { type: "p", text: "Recurring card, UPI, or other electronic-mandate payments are processed through payment providers and issuing institutions and are subject to the mandate terms, network rules, and applicable RBI e-mandate directions. Where those directions apply, the issuer is responsible for required pre-transaction notifications, currently at least 24 hours before a debit, and the applicable opt-out or revocation facility. You authorise recurring charges only as disclosed at checkout. Cancelling your BizzPal plan stops future plan renewals; where the payment provider requires a separate mandate revocation, you must also revoke the mandate through that provider or issuer." },
    ],
  },
  {
    title: "7. Changes to plans and the Service",
    blocks: [
      { type: "p", text: "We may update, add, or discontinue features, plan limits, or parts of the Service. For a material change to a paid plan during an active term, we will give notice where reasonably practicable and comply with any notice, cancellation, or refund rights required by law. A feature that is in beta or labelled as experimental may change or be withdrawn without notice." },
    ],
  },
  {
    title: "8. Intellectual property",
    blocks: [
      { type: "p", text: "BizzPal and its licensors own the Service, including its software, design, branding, and underlying materials, excluding User Content and third-party materials. These Terms grant you a limited, revocable, non-transferable right to use the Service for your internal business or personal planning purposes, subject to your plan and these Terms. No ownership is transferred to you." },
      { type: "p", text: "As between you and BizzPal, you may use outputs generated for you, subject to third-party rights, the law, and these Terms. Similar or identical outputs may be generated for other users. You are responsible for checking that your use of an output is lawful and does not infringe another person’s rights." },
    ],
  },
  {
    title: "9. Third-party services",
    blocks: [
      { type: "p", text: "The Service may rely on or link to third-party AI models, payment services, hosting, analytics, or other tools. Third-party services are governed by their own terms and privacy notices. We are not responsible for third-party services outside our reasonable control. We will remain responsible for our own obligations under applicable law." },
      { type: "p", text: "Where the Service shows YouTube channel information through YouTube API Services, you are also bound by the YouTube Terms of Service (https://www.youtube.com/t/terms), and Google’s Privacy Policy (https://policies.google.com/privacy) applies to that data." },
    ],
  },
  {
    title: "10. Privacy and confidentiality",
    blocks: [
      { type: "p", text: "Our Privacy Policy explains how we collect and use personal data in connection with the Service. By using the Service, you acknowledge that the Privacy Policy applies to that processing. You must not use the Service to disclose another person’s information without a lawful basis or appropriate permission." },
      { type: "p", text: "We will use reasonable measures to protect information entrusted to us and will limit access to it to people and providers who need it for the purposes described in the Privacy Policy. This section does not create a separate confidentiality commitment for information that is public, independently developed, already lawfully known, or required to be disclosed by law." },
    ],
  },
  {
    title: "11. Availability, suspension, and termination",
    blocks: [
      { type: "p", text: "We aim to keep the Service available, but do not promise uninterrupted or error-free operation. Access may be interrupted for maintenance, security, capacity, supplier, or network reasons. Any service-level commitment applies only if we separately agree to it in writing." },
      { type: "p", text: "You may stop using the Service at any time and may close your account using the available account controls or by contacting care@bizzpal.ai. We may suspend or terminate access if you materially breach these Terms, create a security or legal risk, fail to pay amounts due, or where required by law. Where reasonable and legally permitted, we will give notice and an opportunity to address the issue." },
      { type: "p", text: "After termination, your right to access paid features ends. Data export and deletion are handled under the Privacy Policy and any applicable plan terms. Provisions that by their nature should continue after termination—including intellectual-property, disclaimers, liability, indemnity, and dispute provisions—will continue to apply." },
    ],
  },
  {
    title: "12. Disclaimers",
    blocks: [
      { type: "p", text: "To the maximum extent permitted by law, the Service is provided “as is” and “as available.” We do not warrant that AI outputs will be accurate, complete, current, suitable for a particular purpose, or accepted by a regulator, court, investor, employee, or other third party. We do not warrant that the Service will be uninterrupted, secure, or free of errors." },
      { type: "p", text: "These disclaimers do not exclude any warranty or consumer right that applicable law does not permit us to exclude or limit." },
    ],
  },
  {
    title: "13. Limits on liability",
    blocks: [
      { type: "p", text: "To the maximum extent permitted by law, neither party is liable to the other for indirect, incidental, special, punitive, or consequential loss, or for loss of profits, revenue, goodwill, business opportunity, or data, arising from the Service or these Terms." },
      { type: "p", text: "To the maximum extent permitted by law, BizzPal’s total liability for claims arising from the Service or these Terms will not exceed the fees you paid to BizzPal for the Service in the 12 months before the event giving rise to the claim. If you used only a free plan and paid no fees, liability is excluded or limited to the maximum extent permitted by applicable law. Nothing in this section excludes or limits liability or rights that cannot legally be excluded or limited." },
    ],
  },
  {
    title: "14. Your responsibility for claims",
    blocks: [
      { type: "p", text: "To the extent permitted by law, you will reimburse BizzPal for third-party claims, losses, and reasonable costs arising from your unlawful use of the Service, your material breach of these Terms, or your infringement of another person’s rights. This does not apply to the extent a claim was caused by BizzPal’s own breach, negligence, or unlawful conduct." },
    ],
  },
  {
    title: "15. Governing law, arbitration, and disputes",
    blocks: [
      { type: "p", text: "These Terms are governed by the laws of India, except where mandatory law in your place of residence requires otherwise. The parties will first try in good faith to resolve a dispute by written notice and discussion within 30 days. Any dispute that may lawfully be arbitrated and remains unresolved will be referred to one arbitrator under the Arbitration and Conciliation Act, 1996. The seat and venue of arbitration will be Thane, Maharashtra, India, and the proceedings will be in English. The parties will appoint the sole arbitrator by mutual agreement; if they do not agree within 30 days, appointment will be made under the Act. Subject to non-waivable consumer rights, courts of competent jurisdiction at Thane, Maharashtra, India will have exclusive jurisdiction over arbitration-related proceedings and matters not required to be arbitrated. Nothing in this clause prevents a consumer from approaching a competent consumer forum where the law allows." },
      { type: "p", text: "If you are a consumer outside India, mandatory consumer protections in your country may also apply. Nothing in these Terms removes rights that cannot legally be waived." },
    ],
  },
  {
    title: "16. Changes to these Terms",
    blocks: [
      { type: "p", text: "We may revise these Terms from time to time. The version date at the top will show when a revision takes effect. If a change materially affects your rights or a paid plan, we will provide reasonable notice where required by law. Continued use after the effective date means you accept the revised Terms, except where applicable law requires another form of consent." },
    ],
  },
  {
    title: "17. General",
    blocks: [
      { type: "p", text: "If any part of these Terms is held unenforceable, the remaining parts continue to apply. A failure to enforce a provision is not a waiver. You may not transfer your rights or obligations under these Terms without our written consent, except as permitted by law. We may transfer these Terms as part of a merger, reorganisation, or sale of the relevant business, subject to applicable law. These Terms, the applicable plan details, and the Privacy Policy form the agreement between you and BizzPal concerning the Service." },
    ],
  },
  {
    title: "18. Contact and grievance redressal",
    blocks: [
      { type: "p", text: "For support requests, billing questions, or legal/privacy complaints, contact us at care@bizzpal.ai. Please include your account email and a description of the issue, but do not email passwords, payment-card details, or other sensitive credentials." },
      { type: "ul", items: [`Legal Operator: ${OPERATOR}`, `Registered Office: ${OFFICE}`, "Designated Grievance & Data Protection Officer: Praveen Kumar", "Support & Grievance Email: care@bizzpal.ai"] },
      { type: "p", text: "Complaint handling: We aim to acknowledge complaints within 48 hours. Where Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, as amended, applies, we will acknowledge within 24 hours and resolve within seven days, or any shorter period applicable to a specified complaint. Other complaints are targeted for resolution within 15 days and no later than 30 days, subject to any shorter or different statutory deadline. Privacy requests will be handled within the applicable data-protection timelines, including the DPDP Act and Rules to the extent their relevant provisions are in force and apply." },
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      current="terms"
      badge="Terms of service"
      title="Terms & Conditions"
      subtitle="Terms for using the bizzpal.ai AI business-guidance service"
      facts={["Effective Date: 16 November 2026 | Last Updated: 16 November 2026", "Website: https://bizzpal.ai", `Operator: ${OPERATOR}`, "Support & Grievance Email: care@bizzpal.ai"]}
      intro={[
        `These Terms & Conditions (“Terms”) govern access to and use of bizzpal.ai, including its website, AI-powered business guidance, account features, paid plans, and related services (together, the “Service”). The Service is operated by ${OPERATOR}, whose registered office is at ${OFFICE} (“BizzPal,” “we,” “us,” or “our”).`,
        "By creating an account, purchasing a plan, or using the Service, you agree to these Terms. If you use the Service for a company or other organisation, you confirm that you are authorised to accept these Terms for that organisation, and “you” includes that organisation.",
      ]}
      sections={SECTIONS}
    />
  );
}

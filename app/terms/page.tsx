import { SiteLayout } from "@/components/site-layout"

export default function TermsPage() {
  return (
    <SiteLayout>
      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

          <div className="prose prose-blue max-w-none">
            <p className="text-gray-600 mb-6">Last Updated: May 27, 2025</p>

            <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to AutoDetailAI. These Terms of Service ("Terms") govern your use of the AutoDetailAI website,
              mobile application, and services (collectively, the "Service"). By accessing or using the Service, you
              agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the
              Service.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">2. Definitions</h2>
            <p>
              <strong>"Service"</strong> refers to the AutoDetailAI application, website, and AI-powered auto detailing
              assistant accessible via our website or mobile application.
            </p>
            <p>
              <strong>"User"</strong> refers to individuals who access or use our Service.
            </p>
            <p>
              <strong>"Content"</strong> refers to text, images, videos, audio, and other materials that may appear on
              our Service.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">3. Use of Service</h2>
            <p>
              AutoDetailAI provides an AI-powered assistant designed to help users with auto detailing recommendations,
              maintenance insights, and personalized detailing plans. The Service is intended for informational purposes
              only and should not replace professional automotive advice.
            </p>
            <p>
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not
              to:
            </p>
            <ul className="list-disc pl-6 my-4 space-y-2">
              <li>Use the Service in any way that violates any applicable laws or regulations</li>
              <li>Attempt to interfere with or disrupt the Service or servers or networks connected to the Service</li>
              <li>Attempt to reverse engineer any portion of the Service</li>
              <li>Collect or track personal information of other users</li>
              <li>Impersonate or attempt to impersonate AutoDetailAI, an AutoDetailAI employee, or another user</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">4. User Accounts</h2>
            <p>
              When you create an account with us, you must provide accurate, complete, and current information. Failure
              to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
            </p>
            <p>
              You are responsible for safeguarding the password that you use to access the Service and for any
              activities or actions under your password. You agree not to disclose your password to any third party.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">5. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are and will remain the exclusive
              property of AutoDetailAI and its licensors. The Service is protected by copyright, trademark, and other
              laws.
            </p>
            <p>
              Our trademarks and trade dress may not be used in connection with any product or service without the prior
              written consent of AutoDetailAI.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">6. User Content</h2>
            <p>
              By submitting content to the Service, including vehicle information, images, and queries, you grant
              AutoDetailAI a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish,
              translate, and distribute your content in any existing or future media.
            </p>
            <p>
              You represent and warrant that your content does not violate any rights of any third party, including
              copyright, trademark, privacy, or other personal or proprietary rights.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">7. Disclaimer</h2>
            <p>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. AutoDetailAI makes no warranties,
              expressed or implied, regarding the reliability, accuracy, or availability of the Service.
            </p>
            <p>
              The recommendations and insights provided by our AI assistant are for informational purposes only and
              should not replace professional automotive advice. Always consult with a qualified automotive professional
              before making significant changes to your vehicle maintenance routine.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">8. Limitation of Liability</h2>
            <p>
              In no event shall AutoDetailAI, its directors, employees, partners, agents, suppliers, or affiliates be
              liable for any indirect, incidental, special, consequential, or punitive damages, including without
              limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
            </p>
            <ul className="list-disc pl-6 my-4 space-y-2">
              <li>Your access to or use of or inability to access or use the Service</li>
              <li>Any conduct or content of any third party on the Service</li>
              <li>Any content obtained from the Service</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">9. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will
              provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change
              will be determined at our sole discretion.
            </p>
            <p>
              By continuing to access or use our Service after any revisions become effective, you agree to be bound by
              the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">10. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the United States, without
              regard to its conflict of law provisions.
            </p>
            <p>
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those
              rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining
              provisions of these Terms will remain in effect.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">11. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p className="mb-8">
              <strong>Email:</strong> support@autodetailai.com
              <br />
              <strong>Address:</strong> 123 AI Drive, Suite 456, San Francisco, CA 94105
            </p>
          </div>
        </div>
      </div>
    </SiteLayout>
  )
}

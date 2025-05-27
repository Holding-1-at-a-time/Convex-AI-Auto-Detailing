import { SiteLayout } from "@/components/site-layout"

export default function PrivacyPage() {
  return (
    <SiteLayout>
      <div className="container py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

          <div className="prose prose-blue max-w-none">
            <p className="text-gray-600 mb-6">Last Updated: May 27, 2025</p>

            <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p>
              At AutoDetailAI, we respect your privacy and are committed to protecting your personal data. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information when you use our website,
              mobile application, and services (collectively, the "Service").
            </p>
            <p>
              Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy,
              please do not access the Service.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium mt-6 mb-3">2.1 Personal Data</h3>
            <p>
              While using our Service, we may ask you to provide us with certain personally identifiable information
              that can be used to contact or identify you ("Personal Data"). This may include, but is not limited to:
            </p>
            <ul className="list-disc pl-6 my-4 space-y-2">
              <li>Email address</li>
              <li>First name and last name</li>
              <li>Phone number</li>
              <li>Address, State, Province, ZIP/Postal code, City</li>
              <li>Vehicle information (make, model, year, VIN)</li>
              <li>Images of your vehicle</li>
              <li>Usage data</li>
            </ul>

            <h3 className="text-lg font-medium mt-6 mb-3">2.2 Usage Data</h3>
            <p>
              We may also collect information on how the Service is accessed and used ("Usage Data"). This Usage Data
              may include information such as your computer's Internet Protocol address (e.g., IP address), browser
              type, browser version, the pages of our Service that you visit, the time and date of your visit, the time
              spent on those pages, unique device identifiers, and other diagnostic data.
            </p>

            <h3 className="text-lg font-medium mt-6 mb-3">2.3 Tracking & Cookies Data</h3>
            <p>
              We use cookies and similar tracking technologies to track activity on our Service and hold certain
              information. Cookies are files with a small amount of data which may include an anonymous unique
              identifier.
            </p>
            <p>
              You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However,
              if you do not accept cookies, you may not be able to use some portions of our Service.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p>AutoDetailAI uses the collected data for various purposes:</p>
            <ul className="list-disc pl-6 my-4 space-y-2">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information so that we can improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
              <li>To provide you with personalized auto detailing recommendations and insights</li>
              <li>To train and improve our AI models</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Retention</h2>
            <p>
              AutoDetailAI will retain your Personal Data only for as long as is necessary for the purposes set out in
              this Privacy Policy. We will retain and use your Personal Data to the extent necessary to comply with our
              legal obligations, resolve disputes, and enforce our legal agreements and policies.
            </p>
            <p>
              We will also retain Usage Data for internal analysis purposes. Usage Data is generally retained for a
              shorter period of time, except when this data is used to strengthen the security or to improve the
              functionality of our Service, or we are legally obligated to retain this data for longer time periods.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">5. Data Transfer</h2>
            <p>
              Your information, including Personal Data, may be transferred to — and maintained on — computers located
              outside of your state, province, country, or other governmental jurisdiction where the data protection
              laws may differ from those of your jurisdiction.
            </p>
            <p>
              If you are located outside the United States and choose to provide information to us, please note that we
              transfer the data, including Personal Data, to the United States and process it there.
            </p>
            <p>
              Your consent to this Privacy Policy followed by your submission of such information represents your
              agreement to that transfer.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">6. Disclosure of Data</h2>

            <h3 className="text-lg font-medium mt-6 mb-3">6.1 Legal Requirements</h3>
            <p>
              AutoDetailAI may disclose your Personal Data in the good faith belief that such action is necessary to:
            </p>
            <ul className="list-disc pl-6 my-4 space-y-2">
              <li>Comply with a legal obligation</li>
              <li>Protect and defend the rights or property of AutoDetailAI</li>
              <li>Prevent or investigate possible wrongdoing in connection with the Service</li>
              <li>Protect the personal safety of users of the Service or the public</li>
              <li>Protect against legal liability</li>
            </ul>

            <h3 className="text-lg font-medium mt-6 mb-3">6.2 Service Providers</h3>
            <p>
              We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), to
              provide the Service on our behalf, to perform Service-related services, or to assist us in analyzing how
              our Service is used.
            </p>
            <p>
              These third parties have access to your Personal Data only to perform these tasks on our behalf and are
              obligated not to disclose or use it for any other purpose.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">7. Security of Data</h2>
            <p>
              The security of your data is important to us, but remember that no method of transmission over the
              Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable
              means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">8. Your Data Protection Rights</h2>
            <p>
              Depending on your location, you may have certain data protection rights. AutoDetailAI aims to take
              reasonable steps to allow you to correct, amend, delete, or limit the use of your Personal Data.
            </p>
            <p>
              If you wish to be informed about what Personal Data we hold about you and if you want it to be removed
              from our systems, please contact us.
            </p>
            <p>In certain circumstances, you have the following data protection rights:</p>
            <ul className="list-disc pl-6 my-4 space-y-2">
              <li>The right to access, update, or delete the information we have on you</li>
              <li>
                The right of rectification — the right to have your information corrected if it is inaccurate or
                incomplete
              </li>
              <li>The right to object — the right to object to our processing of your Personal Data</li>
              <li>
                The right of restriction — the right to request that we restrict the processing of your personal
                information
              </li>
              <li>
                The right to data portability — the right to be provided with a copy of your Personal Data in a
                structured, machine-readable format
              </li>
              <li>
                The right to withdraw consent — the right to withdraw your consent at any time where AutoDetailAI relied
                on your consent to process your personal information
              </li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">9. Children's Privacy</h2>
            <p>
              Our Service does not address anyone under the age of 18 ("Children"). We do not knowingly collect
              personally identifiable information from anyone under the age of 18. If you are a parent or guardian and
              you are aware that your Child has provided us with Personal Data, please contact us. If we become aware
              that we have collected Personal Data from children without verification of parental consent, we take steps
              to remove that information from our servers.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy.
            </p>
            <p>
              You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy
              are effective when they are posted on this page.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">11. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <p className="mb-8">
              <strong>Email:</strong> privacy@autodetailai.com
              <br />
              <strong>Address:</strong> 123 AI Drive, Suite 456, San Francisco, CA 94105
            </p>
          </div>
        </div>
      </div>
    </SiteLayout>
  )
}

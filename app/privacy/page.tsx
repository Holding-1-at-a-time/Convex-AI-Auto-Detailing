import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow py-12">
        <div className="container">
          <div className="space-y-6">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Privacy Policy</h1>
            <p className="max-w-[85%] leading-normal text-gray-700">
              Your privacy is important to us. It is AutoDetailAI's policy to respect your privacy regarding any
              information we may collect from you across our website,{" "}
              <Link href="/" className="underline underline-offset-4">
                autodetail.ai
              </Link>
              , and other sites we own and operate.
            </p>
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
              Information We Collect
            </h2>
            <p className="leading-normal text-gray-700">
              We collect information from you when you register on our site, place an order, subscribe to our
              newsletter, respond to a survey or fill out a form.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <b>Personal identification information</b>: This includes your name, email address, phone number, etc.
              </li>
              <li>
                <b>Non-personal identification information</b>: This includes the browser name, the type of computer and
                technical information about users means of connection to our Site, such as the operating system and the
                Internet service providers utilized and other similar information.
              </li>
            </ul>
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
              How We Use Your Information
            </h2>
            <p className="leading-normal text-gray-700">
              We may use the information we collect from you in the following ways:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                To personalize your experience and to allow us to deliver the type of content and product offerings in
                which you are most interested.
              </li>
              <li>To improve our website in order to better serve you.</li>
              <li>To allow us to better service you in responding to your customer service requests.</li>
              <li>To administer a contest, promotion, survey or other site feature.</li>
              <li>To send periodic emails regarding your order or other products and services.</li>
            </ul>
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
              How We Protect Your Information
            </h2>
            <p className="leading-normal text-gray-700">
              We adopt appropriate data collection, storage and processing practices and security measures to protect
              against unauthorized access, alteration, disclosure or destruction of your personal information, username,
              password, transaction information and data stored on our Site.
            </p>
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
              Sharing Your Personal Information
            </h2>
            <p className="leading-normal text-gray-700">
              We do not sell, trade, or rent users personal identification information to others. We may share generic
              aggregated demographic information not linked to any personal identification information regarding
              visitors and users with our business partners, trusted affiliates and advertisers for the purposes
              outlined above.
            </p>
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
              Changes to this Privacy Policy
            </h2>
            <p className="leading-normal text-gray-700">
              AutoDetailAI has the discretion to update this privacy policy at any time. When we do, we will revise the
              updated date at the bottom of this page. We encourage users to frequently check this page for any changes
              to stay informed about how we are helping to protect the personal information we collect. You acknowledge
              and agree that it is your responsibility to review this privacy policy periodically and become aware of
              modifications.
            </p>
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
              Your Acceptance of These Terms
            </h2>
            <p className="leading-normal text-gray-700">
              By using this Site, you signify your acceptance of this policy. If you do not agree to this policy, please
              do not use our Site. Your continued use of the Site following the posting of changes to this policy will
              be deemed your acceptance of those changes.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

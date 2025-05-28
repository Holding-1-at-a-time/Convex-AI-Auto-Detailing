import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="container grid items-center justify-center gap-6 pt-20 pb-12">
          <div className="mx-auto max-w-[980px] w-full">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Terms of Service</h1>
            <div className="mt-4 prose max-w-[980px]">
              <p>
                Welcome to AutoDetailAI! These terms of service ("Terms") govern your use of our website and services.
                By accessing or using our website, you agree to be bound by these Terms.
              </p>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By using AutoDetailAI, you agree to these Terms, our Privacy Policy, and any additional terms applicable
                to certain services. If you do not agree, do not use our services.
              </p>
              <h2>2. Description of Service</h2>
              <p>
                AutoDetailAI provides an AI-powered platform for auto detailing businesses to manage their operations,
                including scheduling, customer management, and analytics.
              </p>
              <h2>3. User Accounts</h2>
              <p>
                You may need to create an account to access certain features. You are responsible for maintaining the
                confidentiality of your account and password.
              </p>
              <h2>4. Acceptable Use</h2>
              <p>
                You agree to use AutoDetailAI in compliance with all applicable laws and regulations. You will not
                engage in any activity that interferes with or disrupts our services.
              </p>
              <h2>5. Intellectual Property</h2>
              <p>
                The content and materials on AutoDetailAI are protected by copyright and other intellectual property
                laws. You may not use our content without our permission.
              </p>
              <h2>6. Disclaimer of Warranties</h2>
              <p>
                AutoDetailAI is provided "as is" without any warranties. We do not guarantee that our services will be
                uninterrupted or error-free.
              </p>
              <h2>7. Limitation of Liability</h2>
              <p>
                We are not liable for any damages arising from your use of AutoDetailAI. Our liability is limited to the
                extent permitted by law.
              </p>
              <h2>8. Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. We will notify you of any changes by posting the new Terms
                on our website.
              </p>
              <h2>9. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of [Your State], without regard to its conflict of law
                principles.
              </p>
              <h2>10. Contact Us</h2>
              <p>If you have any questions about these Terms, please contact us at [Your Contact Information].</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

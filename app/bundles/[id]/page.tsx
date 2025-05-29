import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getBundleById } from "@/lib/data/bundles"
import { getBusinessProfileById } from "@/lib/data/business-profile"
import BundleDetails from "@/app/components/bundle-details"
import { Alert, AlertCircle, AlertDescription, AlertTitle } from "@/components/ui/alert"
import BundleBookingForm from "../components/bundle-booking-form"

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params: { id } }: Props): Promise<Metadata> {
  const bundle = await getBundleById(id)

  if (!bundle) {
    return {
      title: "Bundle Not Found",
    }
  }

  return {
    title: bundle.name,
    description: bundle.description,
  }
}

export default async function BundleDetailPage({ params: { id } }: Props) {
  const bundleDetails = await getBundleById(id)
  if (!bundleDetails) {
    return notFound()
  }

  const businessProfile = await getBusinessProfileById(bundleDetails.businessId)

  if (!businessProfile) {
    return notFound()
  }

  return (
    <main className="container relative">
      <BundleDetails bundle={bundleDetails} business={businessProfile} />

      {bundleDetails && businessProfile && bundleDetails.isActive && (
        <section aria-labelledby="booking-form-title" className="mt-8">
          <h2 id="booking-form-title" className="sr-only">
            Book this Bundle
          </h2>
          <BundleBookingForm
            bundleId={bundleDetails._id}
            businessId={businessProfile._id}
            onBookingComplete={(appointmentId) => {
              // Optionally, redirect or show further confirmation
              console.log("Bundle booking complete, appointment ID:", appointmentId)
              // router.push(`/customer/dashboard/appointments/${appointmentId}`); // Example redirect
            }}
          />
        </section>
      )}

      {!bundleDetails?.isActive && bundleDetails && (
        <Alert variant="warning" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Bundle Not Available</AlertTitle>
          <AlertDescription>This bundle is currently not active or available for booking.</AlertDescription>
        </Alert>
      )}
    </main>
  )
}

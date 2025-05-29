"use client"

import { useParams } from "next/navigation"
import ServiceForm from "../service-form"

export default function EditServicePage() {
  const params = useParams()
  const serviceId = params.id as string

  return <ServiceForm serviceId={serviceId} isEdit={true} />
}

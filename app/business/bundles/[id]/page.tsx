"use client"

import { useParams } from "next/navigation"
import BundleForm from "../bundle-form"

export default function EditBundlePage() {
  const params = useParams()
  const bundleId = params.id as string

  return <BundleForm bundleId={bundleId} isEdit />
}

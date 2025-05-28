"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

/**
 * Handles global errors by capturing them with Sentry and displaying a generic error message.
 *
 * @param {Error & { digest?: string }} error - The error object that occurred.
 * @returns {JSX.Element} A generic error message.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <NextError statusCode={0} />
  );
}

"use client"

import { Skeleton } from "@/components/ui/skeleton"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollAnimation } from "@/components/scroll-animation"

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "How does the AI assistant improve my auto detailing business?",
    answer:
      "Our AI assistant automates scheduling, provides personalized service recommendations, manages customer data, and offers predictive analytics. This saves you time on administrative tasks, reduces scheduling conflicts, and helps you deliver more personalized service to your customers.",
  },
  {
    question: "Is there a learning curve to using the platform?",
    answer:
      "The platform is designed to be intuitive and user-friendly. Most users are up and running within a day. We also provide comprehensive onboarding support, video tutorials, and a knowledge base to help you get the most out of the system.",
  },
  {
    question: "Can I integrate this with my existing business tools?",
    answer:
      "Yes! AutoDetailAI integrates with popular business tools including payment processors, CRM systems, accounting software, and marketing platforms. Our API also allows for custom integrations if you have specific needs.",
  },
  {
    question: "How secure is my business and customer data?",
    answer:
      "We take security seriously. All data is encrypted both in transit and at rest. We use industry-standard security practices, regular security audits, and comply with data protection regulations. Your data is backed up regularly and you maintain ownership of all your information.",
  },
  {
    question: "Can I customize the AI to match my specific services?",
    answer:
      "The AI is fully customizable to your specific service offerings, pricing, availability, and business rules. You can train it with your own knowledge base and it will continuously learn from your business operations to provide better recommendations over time.",
  },
]

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Simulate loading
  useState(() => {
    setTimeout(() => setIsLoading(false), 1000)
  })

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-primary/20 overflow-hidden">
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {faqs.map((faq, index) => (
        <ScrollAnimation key={index} animation="fade-in-up" delay={index * 0.1}>
          <div className="rounded-lg border border-primary/20 overflow-hidden bg-card/50 hover:bg-card/80 transition-colors duration-300">
            <button
              className="flex justify-between items-center w-full p-4 text-left"
              onClick={() => toggleFAQ(index)}
              aria-expanded={openIndex === index}
            >
              <span className="font-medium text-white">{faq.question}</span>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-primary transition-transform duration-300",
                  openIndex === index ? "transform rotate-180" : "",
                )}
              />
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <div className="p-4 pt-0 text-secondary-100">{faq.answer}</div>
            </div>
          </div>
        </ScrollAnimation>
      ))}
    </div>
  )
}

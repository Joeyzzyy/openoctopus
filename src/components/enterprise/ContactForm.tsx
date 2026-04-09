"use client";

import { useState } from "react";
import { Clock3, Shield, Zap } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";

const COUNTRY_OPTIONS = [
  "United States",
  "China",
  "United Kingdom",
  "Germany",
  "Japan",
  "India",
  "France",
  "South Korea",
  "Singapore",
  "Other",
];

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section
      id="contact-us"
      className="scroll-mt-20 bg-white px-6 pb-16 pt-16 md:px-12 md:pb-24 md:pt-20 lg:px-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <FadeIn className="flex flex-col gap-4 lg:w-96 lg:shrink-0 lg:pt-2">
            <h2 className="text-2xl font-bold leading-none tracking-tight text-[#111111] md:text-4xl lg:text-5xl">
              Get in touch
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-black/50">
                <Clock3 className="size-4 shrink-0" strokeWidth={1.5} />
                <span className="text-sm">Typical response within 24 hours</span>
              </div>
              <div className="flex items-center gap-3 text-black/50">
                <Shield className="size-4 shrink-0" strokeWidth={1.5} />
                <span className="text-sm">SOC 2 Type 2 certified</span>
              </div>
              <div className="flex items-center gap-3 text-black/50">
                <Zap className="size-4 shrink-0" strokeWidth={1.5} />
                <span className="text-sm">Priority onboarding for enterprise</span>
              </div>
            </div>
          </FadeIn>

          <div className="max-w-xl min-w-0 flex-1">
            {submitted ? (
              <FadeIn>
                <div className="rounded-xs border border-black/10 bg-[#f5f5f3] p-6">
                  <p className="font-mono text-sm text-[#111111]">
                    Thanks. We&apos;ll get back to you within 24 hours.
                  </p>
                </div>
              </FadeIn>
            ) : (
              <FadeIn delay={0.1}>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="font-mono text-xs font-medium text-[#111111]">
                        Your country <span className="text-black/40">*</span>
                      </label>
                      <select
                        required
                        name="country"
                        defaultValue=""
                        className="h-10 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-[#111111] outline-none transition-colors focus:border-black/20"
                      >
                        <option value="" disabled>
                          Select option
                        </option>
                        {COUNTRY_OPTIONS.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="font-mono text-xs font-medium text-[#111111]">
                        Company name <span className="text-black/40">*</span>
                      </label>
                      <input
                        required
                        name="company"
                        maxLength={100}
                        placeholder="Input your company name"
                        className="h-10 w-full rounded-sm border border-black/10 bg-transparent px-3 py-1 text-sm text-[#111111] outline-none transition-colors placeholder:text-black/35 focus:border-black/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="font-mono text-xs font-medium text-[#111111]">
                        First name <span className="text-black/40">*</span>
                      </label>
                      <input
                        required
                        name="firstName"
                        maxLength={100}
                        placeholder="Input your first name"
                        className="h-10 w-full rounded-sm border border-black/10 bg-transparent px-3 py-1 text-sm text-[#111111] outline-none transition-colors placeholder:text-black/35 focus:border-black/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="font-mono text-xs font-medium text-[#111111]">
                        Last name <span className="text-black/40">*</span>
                      </label>
                      <input
                        required
                        name="lastName"
                        maxLength={100}
                        placeholder="Input your last name"
                        className="h-10 w-full rounded-sm border border-black/10 bg-transparent px-3 py-1 text-sm text-[#111111] outline-none transition-colors placeholder:text-black/35 focus:border-black/20"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="font-mono text-xs font-medium text-[#111111]">
                        Email <span className="text-black/40">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        name="email"
                        maxLength={100}
                        placeholder="Input your email"
                        className="h-10 w-full rounded-sm border border-black/10 bg-transparent px-3 py-1 text-sm text-[#111111] outline-none transition-colors placeholder:text-black/35 focus:border-black/20"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="font-mono text-xs font-medium text-[#111111]">
                        Inquiry reason
                      </label>
                      <textarea
                        name="reason"
                        maxLength={500}
                        placeholder="Tell us why you want to contact"
                        className="min-h-[120px] w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#111111] outline-none transition-colors placeholder:text-black/35 focus:border-black/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center rounded-xs bg-[#111111] px-4 py-2 font-mono text-sm font-bold text-white transition-colors duration-150 hover:bg-[#111111]/80"
                  >
                    Submit
                  </button>
                </form>
              </FadeIn>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

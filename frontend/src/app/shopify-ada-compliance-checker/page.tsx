import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { FaqList } from "@/components/FaqList";
import { ScanForm } from "@/components/ScanForm";
import { AUTOMATED_LIMITS, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shopify ADA Compliance Checker: free WCAG 2.2 accessibility scan",
  description: "Check your Shopify store for accessibility issues commonly cited in ADA lawsuits. Free WCAG 2.2 AA scan of your home, collection, product and cart pages, with plain-English fixes.",
  alternates: { canonical: "/shopify-ada-compliance-checker" },
};

const FIXES = [
  ["Alt text on product images", "In Shopify admin, open the product, click the image in the media section and add alt text that describes it. For theme images, look for an alt text field in the section settings."],
  ["Color contrast", "In the theme editor, check text and button colors in Theme settings > Colors. Normal text needs at least 4.5:1 contrast against its background."],
  ["Icon buttons and links", "Cart, search, menu and social icons need an accessible name. This usually means adding aria-label to the button or link in the theme's Liquid files."],
  ["Form labels", "Newsletter, search and variant fields need a label connected to the field, not just placeholder text."],
  ["Keyboard and focus", "Try your store with only the Tab key: menus, drawers and popups should open, close and keep focus visible."],
];

export default function CheckerPage() {
  return (
    <>
      <section className="border-b border-line bg-surface" aria-labelledby="checker-heading">
        <div className="container-page py-14 sm:py-20">
          <p className="eyebrow">Free tool</p>
          <h1 id="checker-heading" className="mt-3 max-w-[24ch] text-4xl font-bold leading-[1.1] sm:text-5xl">
            Shopify ADA compliance checker
          </h1>
          <p className="mt-5 max-w-prose text-lg">
            Scan your Shopify store for the WCAG 2.2 AA accessibility issues most often cited in ADA lawsuits. You&apos;ll get an estimated risk indicator and a plain-English fix for every issue we find.
          </p>
          <ScanForm source="seo_checker" className="mt-8 max-w-2xl" />
          <p className="mt-4 text-sm">
            {AUTOMATED_LIMITS}
          </p>
        </div>
      </section>

      <div className="container-page max-w-4xl py-14 sm:py-20">
        <section aria-labelledby="ada-heading">
          <h2 id="ada-heading" className="text-2xl font-bold">
            What does ADA compliance mean for a Shopify store?
          </h2>
          <p className="mt-3 text-[17px]">
            US courts and plaintiffs commonly use the Web Content Accessibility Guidelines (WCAG) as the benchmark for whether an online store is accessible to people with disabilities. In Europe, the European Accessibility Act also points to
            accessibility standards aligned with WCAG. A store that meets WCAG 2.2 Level AA is in a much stronger position, but no tool can certify that a site is compliant.
          </p>
        </section>

        <section aria-labelledby="checks-heading" className="mt-12">
          <h2 id="checks-heading" className="text-2xl font-bold">
            What {SITE_NAME} checks
          </h2>
          <p className="mt-3 text-[17px]">
            We load your home page, a collection, a product and the cart, then run the automated WCAG 2.0, 2.1 and 2.2 A and AA checks from the open-source axe-core engine. Every issue includes the page, the element, a snippet of the code, why it
            matters and how to fix it.
          </p>
        </section>

        <section aria-labelledby="fixes-heading" className="mt-12">
          <h2 id="fixes-heading" className="text-2xl font-bold">
            How to fix the most common issues in Shopify
          </h2>
          <dl className="mt-5 space-y-5">
            {FIXES.map(([title, text]) => (
              <div key={title}>
                <dt className="text-lg font-semibold">{title}</dt>
                <dd className="mt-1 text-[17px]">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="checker-faq" className="mt-12">
          <h2 id="checker-faq" className="text-2xl font-bold">
            Questions
          </h2>
          <div className="mt-5">
            <FaqList
              items={[
                {
                  q: "Is an automated checker enough?",
                  a: <p>No. {AUTOMATED_LIMITS} Use the scan to find and fix the clear problems first, then test with a keyboard and a screen reader.</p>,
                },
                {
                  q: "Does a low risk score mean I can't be sued?",
                  a: <p>No. The score is an estimated risk indicator based on automated findings. It helps you prioritize fixes and helps reduce risk; it is not a legal assessment.</p>,
                },
                {
                  q: "Is the checker free?",
                  a: (
                    <p>
                      Yes. The scan and the top issues are free, and the full report is free when you add your email. Automatic fixes are part of the upcoming <Link href="/#pricing">Founding plan</Link>.
                    </p>
                  ),
                },
              ]}
            />
          </div>
        </section>

        <Disclaimer className="mt-12" />
      </div>
    </>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Sales | CallTone",
  description: "Get in touch with the CallTone team. Discuss your needs and find the perfect voice agent plan.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

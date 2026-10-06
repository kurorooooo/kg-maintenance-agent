import { Workbench } from "@/components/Workbench";

export default function Page() {
  const locale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "ja" ? "ja" : "en";
  return <Workbench defaultLocale={locale} />;
}

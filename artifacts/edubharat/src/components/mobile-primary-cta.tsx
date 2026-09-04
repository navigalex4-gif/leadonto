import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  href?: string;
  onClick?: () => void;
  compact?: boolean;
};

export function MobilePrimaryCTA({ label, href, onClick, compact = false }: Props) {
  const button = <Button onClick={onClick} size={compact ? "sm" : "lg"} className={compact
    ? "h-8 w-full max-w-[210px] whitespace-nowrap border border-sky-200 bg-gradient-to-r from-sky-100 via-indigo-100 to-violet-100 px-3 text-sm font-extrabold text-[#17204d] shadow-sm shadow-indigo-100 hover:from-sky-200 hover:via-indigo-200 hover:to-violet-200"
    : "h-11 w-full border border-sky-200 bg-gradient-to-r from-sky-100 via-indigo-100 to-violet-100 px-5 text-sm font-extrabold text-[#17204d] shadow-lg shadow-indigo-100/80 hover:from-sky-200 hover:via-indigo-200 hover:to-violet-200"}>
    {label}<ArrowRight className={`${compact ? "ml-1.5 h-4 w-4" : "ml-2 h-4 w-4"}`} />
  </Button>;
  return (
    <div className={`${compact ? "mb-2" : "mb-4"} flex justify-center md:hidden`}>
      {href ? <Link href={href} className="block w-full">{button}</Link> : button}
    </div>
  );
}
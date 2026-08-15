import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function MobilePrimaryCTA({ label, href, onClick }: Props) {
  const button = <Button onClick={onClick} size="lg" className="h-11 w-full bg-orange-500 px-5 text-sm font-extrabold text-white shadow-lg shadow-orange-200 hover:bg-orange-600">
    {label}<ArrowRight className="ml-2 h-4 w-4" />
  </Button>;
  return (
    <div className="mb-4 md:hidden">
      {href ? <Link href={href} className="block w-full">{button}</Link> : button}
    </div>
  );
}
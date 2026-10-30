import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRate, type Lawyer } from "@/lib/data/lawyers";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

export function LawyerCard({ lawyer }: { lawyer: Lawyer }) {
  return (
    <Card className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy/5">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="bg-navy">
            <AvatarFallback className="bg-navy font-heading text-sm font-semibold text-white">
              {initials(lawyer.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="font-heading text-base">
              {lawyer.name}
            </CardTitle>
            <CardDescription className="mt-0.5 max-w-xs text-xs leading-snug">
              {lawyer.title}
            </CardDescription>
          </div>
        </div>
        {lawyer.verified && (
          <Badge variant="secondary" className="gap-1 bg-teal-soft text-teal">
            <BadgeCheck className="!size-3" />
            Verified
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {lawyer.practiceAreas.map((area) => (
            <Badge key={area} variant="outline" className="text-navy">
              {area}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {lawyer.city}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Star className="size-3.5 fill-gold text-gold" />
            {lawyer.rating.toFixed(1)}
            <span className="font-normal text-muted-foreground">
              ({lawyer.reviewCount})
            </span>
          </span>
          <span>{lawyer.experienceYears} yrs exp.</span>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50">
        <div className="flex w-full items-center justify-between gap-4">
          <p className="text-sm">
            <span className="font-heading font-bold text-navy">
              {formatRate(lawyer.hourlyRate)}
            </span>
            <span className="text-muted-foreground"> /hr</span>
          </p>
          <Link
            href={`/lawyers/${lawyer.id}`}
            className="text-sm font-medium text-teal transition-colors hover:text-navy"
          >
            View profile →
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
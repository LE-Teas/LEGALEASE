import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Clock, Landmark, Scale, ShieldCheck } from "lucide-react";
import { getLegalResourceBySlug, getLegalResources } from "@/lib/services/resources";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const resource = await getLegalResourceBySlug(slug);
  if (!resource) return { title: "Resource Not Found" };
  return {
    title: `${resource.title} | LegalEase Resources`,
    description: resource.summary,
  };
}

export default async function CitizenResourceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const resource = await getLegalResourceBySlug(slug);

  if (!resource) {
    notFound();
  }

  const allResources = await getLegalResources();
  const related = allResources.filter((r) => r.slug !== slug).slice(0, 3);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-navy">
          <Link href="/citizen/resources">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Legal Resources
          </Link>
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="border-b border-border/70 pb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-teal/30 bg-teal-soft/30 text-teal text-xs">
              {resource.category}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {resource.reading_time}
            </span>
            <span className="text-xs text-muted-foreground">• {resource.jurisdiction}</span>
          </div>

          <CardTitle className="font-heading text-2xl sm:text-3xl font-bold text-navy">
            {resource.title}
          </CardTitle>

          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {resource.summary}
          </p>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 prose prose-slate max-w-none text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {resource.content}
          </ReactMarkdown>
        </CardContent>
      </Card>

      {/* Related Resources */}
      {related.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="font-heading text-base font-bold text-navy">Related Legal Topics</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((item) => (
              <Link key={item.id} href={`/citizen/resources/${item.slug}`}>
                <Card className="h-full p-4 border-border hover:border-navy/40 transition-colors">
                  <Badge variant="outline" className="text-[10px] mb-2">
                    {item.category}
                  </Badge>
                  <p className="font-heading text-xs font-bold text-navy line-clamp-2">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                    {item.summary}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

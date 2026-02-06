import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ServerComponentPreview } from '@/themes/default/components/preview/server-component-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { getCategoryById, getComponentsByCategory } from '@/lib/blocks-registry';

interface BlocksCategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export default async function BlocksCategoryPage({ params }: BlocksCategoryPageProps) {
  const { category: categoryId } = await params;
  const category = getCategoryById(categoryId);
  const components = getComponentsByCategory(categoryId);

  if (!category) {
    notFound();
  }

  if (components.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/blocks" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回组件库
            </Link>
          </Button>
        </div>

        <div className="py-12 text-center">
          <h1 className="mb-4 font-bold text-2xl">{category.name}</h1>
          <p className="text-muted-foreground">该分类下暂无组件，敬请期待。</p>
        </div>
      </div>
    );
  }

  const IconComponent = category.icon;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/blocks" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回组件库
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-3xl">{category.name}</h1>
            <p className="text-muted-foreground">{category.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{components.length} 个组件</Badge>
        </div>
      </div>

      <div className="space-y-12">
        {components.map((component) => (
          <div key={component.id} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-xl">{component.name}</h2>
                <p className="mt-1 text-muted-foreground">{component.description}</p>
              </div>
              {component.preview && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={component.preview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    在线预览
                  </Link>
                </Button>
              )}
            </div>

            <ServerComponentPreview
              componentId={component.id}
              code={component.code}
              name={component.name}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

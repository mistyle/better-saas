import {
  CreditCard,
  HelpCircle,
  Layout,
  Megaphone,
  MessageCircle,
  Star,
  Users,
  Zap,
} from 'lucide-react';

import type { CategoryInfo, ComponentInfo } from '@/types/blocks';

import { Faq } from '@/themes/default/blocks/faq';
import { Features } from '@/themes/default/blocks/features';
import { Footer } from '@/themes/default/blocks/footer';
// 导入所有组件
import { Hero } from '@/themes/default/blocks/hero';
import { Pricing } from '@/themes/default/blocks/pricing';
import { TechStack } from '@/themes/default/blocks/tech-stack';

// 组件分类定义
export const categories: CategoryInfo[] = [
  {
    id: 'hero',
    name: 'Hero Sections',
    description: '首页主要展示区域组件',
    icon: Layout,
    count: 1,
  },
  {
    id: '/',
    name: 'Feature Sections',
    description: '产品特性展示组件',
    icon: Zap,
    count: 2,
  },
  {
    id: 'pricing',
    name: 'Pricing Sections',
    description: '价格表展示组件',
    icon: CreditCard,
    count: 1,
  },
  {
    id: 'faq',
    name: 'FAQ Sections',
    description: '常见问题组件',
    icon: HelpCircle,
    count: 1,
  },
  {
    id: 'footer',
    name: 'Footer Sections',
    description: '页脚组件',
    icon: Users,
    count: 1,
  },
];

// 组件注册表（不包含实际组件引用）
export const components: Omit<ComponentInfo, 'component'>[] = [
  {
    id: 'modern-hero',
    name: 'Modern Hero',
    description: '现代化的首页主要展示区域，包含标题、描述、按钮和用户评价',
    category: 'hero',
    code: `import { Star } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface Hero7Props {
  heading?: string;
  description?: string;
  button?: {
    text: string;
    url: string;
  };
  reviews?: {
    count: number;
    avatars: {
      src: string;
      alt: string;
    }[];
  };
}

const Hero7 = ({
  heading = 'The Ultimate Scalable Next.js SaaS Boilerplate',
  description = 'Start your SaaS journey...',
  button = {
    text: 'Get Started',
    url: '/docs',
  },
  reviews = {
    count: 200,
    avatars: [
      // ... avatars data
    ],
  },
}: Hero7Props) => {
  return (
    <section className="pt-24">
      <div className="container text-center">
        <div className="mx-auto flex max-w-screen-lg flex-col gap-6">
          <h1 className="font-extrabold text-3xl lg:text-6xl">{heading}</h1>
          <p className="text-balance text-muted-foreground lg:text-lg">{description}</p>
        </div>
        <Button asChild size="lg" className="mt-10">
          <a href={button.url}>{button.text}</a>
        </Button>
        {/* ... rest of component */}
      </div>
    </section>
  );
};

export { Hero7 };`,
  },
  {
    id: 'tech-stack',
    name: 'Tech Stack',
    description: '技术栈展示组件，展示项目使用的技术',
    category: '/',
    code: '// Tech Stack component code here',
  },
  {
    id: '/',
    name: '/ Grid',
    description: '特性网格展示组件',
    category: '/',
    code: '// / component code here',
  },
  {
    id: 'pricing2',
    name: 'Pricing Table',
    description: '价格表组件，展示不同的定价方案',
    category: 'pricing',
    code: '// Pricing component code here',
  },
  {
    id: 'faq3',
    name: 'FAQ Accordion',
    description: '折叠式常见问题组件',
    category: 'faq',
    code: '// FAQ component code here',
  },
  {
    id: 'footer-7',
    name: 'Footer with Links',
    description: '包含链接的页脚组件',
    category: 'footer',
    code: '// Footer component code here',
  },
];

// 辅助函数
export function getComponentsByCategory(categoryId: string): Omit<ComponentInfo, 'component'>[] {
  return components.filter((component) => component.category === categoryId);
}

export function getComponentById(id: string): Omit<ComponentInfo, 'component'> | undefined {
  return components.find((component) => component.id === id);
}

export function getCategoryById(id: string): CategoryInfo | undefined {
  return categories.find((category) => category.id === id);
}

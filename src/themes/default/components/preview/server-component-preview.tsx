import { Faq } from '@/themes/default/blocks/faq';
import { Features } from '@/themes/default/blocks/features';
import { Footer } from '@/themes/default/blocks/footer';
import { Hero } from '@/themes/default/blocks/hero';
import { Pricing } from '@/themes/default/blocks/pricing';
import { TechStack } from '@/themes/default/blocks/tech-stack';
import { ComponentPreviewWrapper } from './component-preview-wrapper';

interface ServerComponentPreviewProps {
  componentId: string;
  name: string;
  code: string;
}

export function ServerComponentPreview({ componentId, name, code }: ServerComponentPreviewProps) {
  const renderComponent = () => {
    switch (componentId) {
      case 'modern-hero':
        return <Hero />;
      case 'tech-stack':
        return <TechStack />;
      case 'features':
        return <Features />;
      case 'pricing2':
        return <Pricing />;
      case 'faq3':
        return <Faq />;
      case 'footer-7':
        return <Footer />;
      default:
        return <div className="p-8 text-center text-muted-foreground">组件未找到</div>;
    }
  };

  return (
    <ComponentPreviewWrapper name={name} code={code}>
      {renderComponent()}
    </ComponentPreviewWrapper>
  );
}

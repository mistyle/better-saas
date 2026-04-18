import { Faq } from '../blocks/faq';
import { Hero } from '../blocks/hero';
import { Pricing } from '../blocks/pricing';
import { TechStack } from '../blocks/tech-stack';

export function HomePage() {
  return (
    <>
      <Hero />
      <TechStack />
      <Pricing />
      <Faq />
    </>
  );
}

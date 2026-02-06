import { Hero } from '../blocks/hero';
import { TechStack } from '../blocks/tech-stack';
import { Pricing } from '../blocks/pricing';
import { Faq } from '../blocks/faq';

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

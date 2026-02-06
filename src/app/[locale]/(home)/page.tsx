import { getThemePage } from '@/core/theme';

export default async function HomePage() {
  const { HomePage: ThemedHomePage } = await getThemePage('home');
  return <ThemedHomePage />;
}

import { getThemePage } from '@/themes';

export default async function HomePage() {
  const { HomePage: ThemedHomePage } = await getThemePage('home');
  return <ThemedHomePage />;
}

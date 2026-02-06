import { getThemePage } from '@/themes/loader';

export default async function HomePage() {
  const { HomePage: ThemedHomePage } = await getThemePage('home');
  return <ThemedHomePage />;
}

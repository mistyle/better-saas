import { getThemePage } from '@/themes';

export default async function Security() {
  const { SecurityContent } = await getThemePage('security');
  return <SecurityContent />;
}

import { getThemePage } from '@/themes/loader';

export default async function Security() {
  const { SecurityContent } = await getThemePage('security');
  return <SecurityContent />;
}

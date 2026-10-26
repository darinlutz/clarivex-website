import RacingTabs from '@/components/RacingTabs';
import { requireOwnerPage } from '@/lib/ownerAccess';

export default async function RacingPage() {
  // The Racing page is for the site owner only
  await requireOwnerPage();

  return <RacingTabs />;
}

import TripPlannerTabs from '@/components/TripPlannerTabs';
import { requireOwnerPage } from '@/lib/ownerAccess';

export default async function TripPlanner() {
  // The Trip Planner page is for the site owner only
  await requireOwnerPage();

  return <TripPlannerTabs />;
}

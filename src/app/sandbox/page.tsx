import SandboxTabs from '@/components/SandboxTabs';
import { requireAdminPage } from '@/lib/adminAccess';
import { isAiLockedDown } from '@/lib/aiLockdown';

export default async function Sandbox() {
  // The Sandbox page is for Admins only: visitors who aren't signed in go to
  // Log In, and everyone else gets a 404
  await requireAdminPage();

  return <SandboxTabs aiLocked={await isAiLockedDown()} />;
}

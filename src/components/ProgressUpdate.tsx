import {
  beltName,
  describeNextStep,
  PASSING_SCORE,
  type RecordedActivity,
} from '@/lib/languageLevels';

// What saving a finished Training/test meant for the user's belt progress
export type ProgressOutcome = RecordedActivity | 'signedOut' | 'saving' | { error: string };

export default function ProgressUpdate({ outcome }: { outcome: ProgressOutcome | null }) {
  if (!outcome) return null;

  let text: string;
  let tone = 'bg-slate-100 border-slate-300 text-slate-700';

  if (outcome === 'saving') {
    text = 'Saving your progress...';
  } else if (outcome === 'signedOut') {
    text = 'Sign in to save your progress and earn belts.';
  } else if ('error' in outcome) {
    text = outcome.error;
    tone = 'bg-red-100 border-red-300 text-red-800';
  } else {
    const { progress, wasNextStep, advanced, newBelt } = outcome;
    const next = describeNextStep(progress);
    tone = 'bg-powder-500/10 border-powder-500/40 text-dark-blue';
    if (newBelt) {
      text = `You earned the ${beltName(newBelt)} in ${progress.language}! Next step: ${next}.`;
    } else if (advanced) {
      text = `Progress saved. Next step in ${progress.language}: ${next}.`;
    } else if (wasNextStep) {
      text = `You need ${PASSING_SCORE}% to move on. Take the ${next} again.`;
    } else {
      text = `Practice only - this didn't count toward your belt. Your next step in ${progress.language} is ${next}.`;
    }
  }

  return <div className={`p-4 rounded-lg border text-sm font-medium text-center ${tone}`}>{text}</div>;
}

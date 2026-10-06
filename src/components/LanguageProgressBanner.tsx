import BeltIcon from '@/components/BeltIcon';
import { beltName, describeNextStep, type LanguageProgress } from '@/lib/languageLevels';

// The user's belt and next step in the language they're learning, shown at
// the top of the Language page. `progress` is null when signed out.
// onNextStepClick makes the next step a link that opens its tab.
export default function LanguageProgressBanner({
  progress,
  onNextStepClick,
}: {
  progress: LanguageProgress | null;
  onNextStepClick?: () => void;
}) {
  if (!progress) {
    return <p className="text-sm text-slate-500">Sign in to save your progress and earn belts.</p>;
  }

  return (
    <div className="inline-flex items-center gap-3 flex-wrap justify-center px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm text-dark-blue">
      <span className="font-semibold">
        {progress.language}: {beltName(progress.beltColor)}
      </span>
      <BeltIcon color={progress.beltColor} className="w-9 h-6" />
      <span className="text-slate-400">|</span>
      <span>
        Next step:{' '}
        {onNextStepClick && progress.nextStep !== 'complete' ? (
          <button
            type="button"
            onClick={onNextStepClick}
            className="font-semibold text-powder-600 hover:underline"
          >
            {describeNextStep(progress)}
          </button>
        ) : (
          <span className="font-semibold text-powder-600">{describeNextStep(progress)}</span>
        )}
      </span>
    </div>
  );
}

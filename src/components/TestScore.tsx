import { PASSING_SCORE } from '@/lib/languageTestClient';

// The pass/fail result box shown when a Language test is finished
export default function TestScore({ score }: { score: number }) {
  const passed = score >= PASSING_SCORE;
  return (
    <div
      className={`p-4 rounded-lg border font-semibold text-center ${
        passed ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800'
      }`}
    >
      <span>Score: {score}%</span>
      <span className="ml-6">Result: {passed ? 'Pass' : 'Try again.'}</span>
    </div>
  );
}

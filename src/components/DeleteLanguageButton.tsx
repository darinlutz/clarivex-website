'use client';

// Removes a Level 0 language from the user's profile (Account page)
export default function DeleteLanguageButton({ language }: { language: string }) {
  return (
    <form
      action="/api/language/progress/remove"
      method="POST"
      onSubmit={(event) => {
        if (!confirm(`Remove ${language} from your profile?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="language" value={language} />
      <button
        type="submit"
        className="px-3 py-1 text-xs font-semibold text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
      >
        Delete
      </button>
    </form>
  );
}

import JiraIssues from '@/components/JiraIssues';

export default function Jira() {
  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-8 px-2 sm:px-3 lg:px-4 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Jira
          </h1>
          <p className="text-lg text-slate-600">Your assigned issues from gordon-darby.atlassian.net.</p>
        </div>
      </section>

      {/* Jira Content */}
      <section className="py-8 px-3 sm:px-5 lg:px-8 bg-white flex flex-col items-center">
        <div className="w-full max-w-6xl">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-dark-blue mb-4">Assigned to Me</h2>
            <JiraIssues />
          </div>
        </div>
      </section>
    </div>
  );
}

import FinancialAnalysisForm from '@/components/FinancialAnalysisForm';

export default function FinancialAnalysis() {
  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Financial Analysis
          </h1>
          <p className="text-lg text-slate-600">
            Describe what you want to analyze and run the query to see the results.
          </p>
        </div>
      </section>

      {/* Financial Analysis Content */}
      <section className="py-16 px-6 sm:px-10 lg:px-16 bg-white flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-dark-blue mb-2">Run a Query</h2>
            <p className="text-slate-600 mb-8">
              Enter instructions describing the financial analysis you want, then press Submit.
            </p>
            <FinancialAnalysisForm />
          </div>
        </div>
      </section>
    </div>
  );
}

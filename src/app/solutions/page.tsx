import Link from 'next/link';

interface Solution {
  id: string;
  title: string;
  description: string;
  icon: string;
  benefits: string[];
}

const solutions: Solution[] = [
  {
    id: 'data-analytics',
    title: 'Data Analytics',
    description: 'Transform raw data into actionable insights that drive business decisions and reveal hidden opportunities.',
    icon: '📊',
    benefits: [
      'Real-time data dashboards and reporting',
      'Predictive analytics for trend forecasting',
      'Data visualization for better decision-making',
      'Identify cost-saving opportunities',
      'Track KPIs and performance metrics',
    ],
  },
  {
    id: 'code-migration',
    title: 'Software Code Migration',
    description: 'Seamlessly migrate your codebase from one programming language to another with minimal disruption.',
    icon: '🔄',
    benefits: [
      'Modernize legacy systems efficiently',
      'Leverage newer, more efficient languages',
      'Improve code maintainability and performance',
      'Reduce technical debt over time',
      'Comprehensive testing and validation',
    ],
  },
  {
    id: 'web-accessibility',
    title: 'Web Accessibility & Best Practices',
    description: 'Update your web applications to meet WCAG standards and industry best practices for maximum reach.',
    icon: '♿',
    benefits: [
      'WCAG 2.1 compliance (AA/AAA levels)',
      'Improved SEO and search rankings',
      'Broader audience reach and inclusivity',
      'Reduced legal and liability risks',
      'Enhanced user experience for all',
    ],
  },
  {
    id: 'system-integration',
    title: 'Connecting Disparate Systems',
    description: 'Integrate your existing systems and platforms to create a unified, seamless business infrastructure.',
    icon: '🔗',
    benefits: [
      'API and middleware integration solutions',
      'Real-time data synchronization',
      'Eliminate manual data entry and errors',
      'Improved operational efficiency',
      'Single source of truth for all data',
    ],
  },
  {
    id: 'ai-automation',
    title: 'AI-Powered Process Automation',
    description: 'Leverage AI tools and agents to eliminate manual, error-prone processes and boost productivity.',
    icon: '🤖',
    benefits: [
      'Intelligent workflow automation',
      'AI agents for document processing',
      'Reduced human error significantly',
      'Cost savings through process optimization',
      'Scalable automation that grows with you',
    ],
  },
];

export default function Solutions() {
  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-dark to-secondary-dark border-b border-powder-500">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-powder-300 via-powder-400 to-powder-500 bg-clip-text text-transparent">
            Our Solutions
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto">
            Comprehensive services designed to address your unique business challenges and drive real results.
          </p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary-dark">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {solutions.map((solution) => (
              <div
                key={solution.id}
                className="bg-secondary-dark rounded-xl border border-powder-500/30 hover:border-powder-400/60 p-8 transition-all duration-300 transform hover:-translate-y-2 group"
              >
                {/* Icon and Title */}
                <div className="mb-6">
                  <div className="text-5xl mb-4 inline-block p-4 bg-tertiary-dark rounded-lg group-hover:bg-powder-400/20 transition-colors">
                    {solution.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-powder-300 group-hover:text-powder-400 transition-colors">
                    {solution.title}
                  </h2>
                </div>

                {/* Description */}
                <p className="text-slate-300 mb-6 text-base leading-relaxed">
                  {solution.description}
                </p>

                {/* Benefits */}
                <div className="space-y-3 mb-8">
                  <p className="text-powder-400 font-semibold text-sm uppercase tracking-wide">
                    Key Activities
                  </p>
                  <ul className="space-y-2">
                    {solution.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-powder-400 font-bold flex-shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="text-slate-300">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <Link
                  href="/contact"
                  className="inline-block px-6 py-2 bg-gradient-to-r from-powder-400/20 to-powder-500/20 text-powder-300 font-semibold rounded-lg border border-powder-400/50 hover:bg-powder-400/30 hover:text-powder-200 transition-all group-hover:shadow-lg group-hover:shadow-powder-400/20"
                >
                  Learn More
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary-dark border-t border-powder-500">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-powder-400 mb-12">
            Our Process
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Discovery', desc: 'Understand your challenges and goals' },
              { step: '2', title: 'Strategy', desc: 'Design the optimal solution approach' },
              { step: '3', title: 'Implementation', desc: 'Execute with precision and care' },
              { step: '4', title: 'Support', desc: 'Ongoing maintenance and optimization' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-powder-400 to-powder-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-powder-400/30">
                  <span className="text-2xl font-bold text-primary-dark">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-powder-300 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-powder-500/10 to-powder-400/10 border-t border-powder-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-powder-300">
            Which solution is right for you?
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Let's explore how these solutions can address your specific business needs.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 bg-gradient-to-r from-powder-400 to-powder-500 text-primary-dark font-bold rounded-lg hover:shadow-lg hover:shadow-powder-400/50 transition-all transform hover:scale-105"
          >
            Schedule a Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}

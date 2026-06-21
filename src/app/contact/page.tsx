import ContactForm from '@/components/ContactForm';
import Link from 'next/link';

export default function Contact() {
  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-8 px-2 sm:px-3 lg:px-4 bg-gradient-to-b from-slate-100 to-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-powder-600 via-powder-500 to-powder-600 bg-clip-text text-transparent">
            Get in Touch
          </h1>
          <p className="text-lg text-slate-600">
            Ready to discuss your project? We'd love to hear about your challenges and how we can help.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-8 px-3 sm:px-5 lg:px-8 bg-white flex flex-col items-center">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <h2 className="text-2xl font-bold text-dark-blue mb-2">Contact Information</h2>
              <p className="text-slate-600 mb-8">
                Fill out the form below and we will get back to you as soon as possible.
              </p>
              <ContactForm />
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              {/* Response Time */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-powder-500 to-powder-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                  </div>
                  <div className="px-1">
                    <h3 className="text-lg font-bold text-dark-blue mb-2">Response Time</h3>
                    <p className="text-slate-600">
                      Most inquiries are answered within 24 business hours. For urgent matters, please mention it in your message.
                    </p>
                  </div>
                </div>
              </div>

              {/* What to Expect */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4\">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-powder-500 to-powder-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div className="px-1">
                    <h3 className="text-lg font-bold text-dark-blue mb-2">What Happens Next?</h3>
                    <ul className="text-slate-600 space-y-2 text-sm">
                      <li>✓ We review your information</li>
                      <li>✓ We schedule a brief call</li>
                      <li>✓ We discuss your needs in detail</li>
                      <li>✓ We propose a tailored solution</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

<br />
      {/* FAQ Section */}
      <section className="py-8 px-2 sm:px-3 lg:px-4 bg-slate-50 border-t border-slate-200 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-dark-blue mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {[
              {
                q: 'How long does a typical project take?',
                a: 'Project timelines vary based on scope and complexity. During our initial consultation, we will provide a detailed timeline and milestones.',
              },
              {
                q: 'Do you work with businesses of all sizes?',
                a: 'Yes! We work with startups, small businesses, and enterprises. Our solutions are scalable and customized to fit your needs.',
              },
              {
                q: 'What is your pricing model?',
                a: 'We offer flexible pricing based on project scope, complexity, and duration. We provide transparent quotes after understanding your requirements.',
              },
              {
                q: 'Can you provide references or case studies?',
                a: 'Absolutely! We are happy to share relevant examples and connect you with past clients who can speak to our work.',
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-slate-200 p-3">
                <h3 className="text-lg font-bold text-dark-blue mb-2 px-1 pt-0.5">{item.q}</h3>
                <p className="text-slate-600 px-1 pb-0.5">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

<br />

      {/* CTA Section */}
      <section className="py-8 px-2 sm:px-3 lg:px-4 bg-slate-100 border-t border-slate-200 flex flex-col items-center">
        <div className="w-full max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-3 text-dark-blue">
            Don't see your question answered?
          </h2>
          <p className="text-lg text-slate-600 mb-4">
            Reach out directly and we'll be happy to help.
          </p>
          <Link
            href="/contact"
            className="inline-block px-4 py-2 bg-gradient-to-r from-powder-500 to-powder-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-powder-500/50 transition-all transform hover:scale-105"
          >
            Send a Message
          </Link>
        </div>
      </section>
    </div>
  );
}

import ContactForm from '@/components/ContactForm';
import Link from 'next/link';

export default function Contact() {
  return (
    <div className="w-full">
      {/* Header Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-dark to-secondary-dark border-b border-powder-500">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-powder-300 via-powder-400 to-powder-500 bg-clip-text text-transparent">
            Get in Touch
          </h1>
          <p className="text-lg text-slate-300">
            Ready to discuss your project? We'd love to hear about your challenges and how we can help.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary-dark">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-secondary-dark rounded-xl border border-powder-500/30 p-8">
              <h2 className="text-2xl font-bold text-powder-400 mb-2">Contact Information</h2>
              <p className="text-slate-400 mb-8">
                Fill out the form below and we will get back to you as soon as possible.
              </p>
              <ContactForm />
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              {/* Email */}
              <div className="bg-secondary-dark rounded-xl border border-powder-500/30 p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-powder-400 to-powder-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary-dark" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-powder-300 mb-2">Email</h3>
                    <p className="text-slate-400">
                      <a href="mailto:darinlutz@yahoo.com" className="text-powder-400 hover:text-powder-300 transition-colors">
                        darinlutz@yahoo.com
                      </a>
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      We typically respond within 24 hours
                    </p>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-secondary-dark rounded-xl border border-powder-500/30 p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-powder-400 to-powder-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary-dark" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-powder-300 mb-2">Response Time</h3>
                    <p className="text-slate-400">
                      Most inquiries are answered within 24 business hours. For urgent matters, please mention it in your message.
                    </p>
                  </div>
                </div>
              </div>

              {/* What to Expect */}
              <div className="bg-secondary-dark rounded-xl border border-powder-500/30 p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-powder-400 to-powder-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary-dark" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-powder-300 mb-2">What Happens Next?</h3>
                    <ul className="text-slate-400 space-y-2 text-sm">
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

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary-dark border-t border-powder-500">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-powder-400 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
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
              <div key={idx} className="bg-tertiary-dark rounded-lg border border-powder-500/30 p-6">
                <h3 className="text-lg font-bold text-powder-300 mb-3">{item.q}</h3>
                <p className="text-slate-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-powder-500/10 to-powder-400/10 border-t border-powder-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-powder-300">
            Don't see your question answered?
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Reach out directly and we'll be happy to help.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 bg-gradient-to-r from-powder-400 to-powder-500 text-primary-dark font-bold rounded-lg hover:shadow-lg hover:shadow-powder-400/50 transition-all transform hover:scale-105"
          >
            Send a Message
          </Link>
        </div>
      </section>
    </div>
  );
}

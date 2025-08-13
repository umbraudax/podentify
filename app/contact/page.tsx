export default function ContactPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
      <p className="text-text-secondary mb-6">
        We'd love to hear from you. Reach us at <a href="mailto:hello@podentify.com" className="text-brand-primary">hello@podentify.com</a>.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Support</h2>
      <p className="text-text-secondary mb-4">For account or billing issues, email support with your account email and a brief description.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Feedback</h2>
      <p className="text-text-secondary mb-4">Have ideas or feature requests? Send them our way—we read every message.</p>
    </main>
  );
}


export default function InfoPage({ eyebrow, title, text, cards, navigate }) {
  return (
    <main className="info-page">
      <div className="page-back-toolbar" style={{ maxWidth: "1100px", margin: "20px auto 0", padding: "0 24px" }}>
        <button
          type="button"
          className="page-back-button"
          onClick={() => navigate ? navigate("home") : window.history.back()}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Home</span>
        </button>
      </div>

      <section className="page-hero">
        <span className="page-badge">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </section>

      <section className="page-grid">
        {cards.map(([cardTitle, cardText]) => (
          <article className="page-card" key={cardTitle}>
            <span className="page-icon">✦</span>
            <h3>{cardTitle}</h3>
            <p>{cardText}</p>
          </article>
        ))}
      </section>

      <section className="contact-panel">
        <div>
          <h2>Ready to play?</h2>
          <p>Create an account, find a venue and reserve your next game today.</p>
        </div>
        <a className="primary" href="mailto:support@turf.example">
          Contact support
        </a>
      </section>
    </main>
  );
}

import SiteFooter from "@/components/SiteFooter";

const SAFE_ADDRESS = "0x171bfe569bce65d52f65e44dfc3a639725587368";

const uses = [
  {
    number: "01",
    title: "Community Treasury",
    text: "Manage community-held BDAG through a shared treasury where transactions require approval from multiple authorised owners.",
  },
  {
    number: "02",
    title: "Infrastructure",
    text: "Coordinate payments for community infrastructure, hosting, servers, cloud services and other operational costs.",
  },
  {
    number: "03",
    title: "Community Projects",
    text: "Provide transparent multisig control for funds allocated to development, tools, events and community-led initiatives.",
  },
];

export default function HomePage() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        html, body {
          margin: 0;
          background: #f6f6f2;
          color: #555;
          font-family: Arial, Helvetica, sans-serif;
        }

        a { color: inherit; }

        .home {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 87% 13%, rgba(243,19,50,.11), transparent 24%),
            radial-gradient(circle at 8% 72%, rgba(155,76,255,.08), transparent 24%),
            #f6f6f2;
        }

        .grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .58;
          background-image:
            linear-gradient(rgba(125,125,125,.11) 1px, transparent 1px),
            linear-gradient(90deg, rgba(125,125,125,.11) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black, transparent 92%);
        }

        .wrap {
          position: relative;
          width: min(1180px, calc(100% - 36px));
          margin: 0 auto;
        }

        .header {
          min-height: 112px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          border-bottom: 1px solid #d7d7d3;
        }

        .logo {
          width: min(340px, 52vw);
          height: auto;
          display: block;
        }

        .network {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 15px;
          border: 1px solid #d2d2ce;
          border-radius: 999px;
          background: rgba(255,255,255,.82);
          color: #747474;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f31332;
          box-shadow: 0 0 12px rgba(243,19,50,.4);
        }

        .hero {
          min-height: 590px;
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          align-items: center;
          gap: 65px;
          padding: 70px 0;
        }

        .eyebrow {
          color: #f31332;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .22em;
          text-transform: uppercase;
        }

        h1 {
          max-width: 760px;
          margin: 13px 0 24px;
          color: #555;
          font-size: clamp(48px, 7vw, 86px);
          line-height: .92;
          letter-spacing: -.06em;
        }

        h1 span { color: #f31332; }

        .lead {
          max-width: 660px;
          margin: 0;
          color: #777;
          font-size: 16px;
          line-height: 1.75;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 31px;
        }

        .primary, .secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 49px;
          padding: 0 22px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .primary {
          background: #f31332;
          color: #fff;
          box-shadow: 0 13px 28px rgba(243,19,50,.2);
        }

        .secondary {
          border: 1px solid #d1d1cd;
          background: rgba(255,255,255,.82);
          color: #666;
        }

        .safe-visual {
          position: relative;
          aspect-ratio: 1;
          display: grid;
          place-items: center;
        }

        .orbit {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 1px solid #d8d8d4;
          border-radius: 50%;
        }

        .orbit.two {
          width: 74%;
          height: 74%;
          border-style: dashed;
        }

        .orbit.three {
          width: 48%;
          height: 48%;
        }

        .node {
          position: absolute;
          width: 16px;
          height: 16px;
          border: 4px solid #f6f6f2;
          border-radius: 50%;
          background: #f31332;
          box-shadow: 0 0 0 1px #f31332;
        }

        .n1 { top: 7%; left: 47%; }
        .n2 { right: 4%; top: 49%; }
        .n3 { bottom: 8%; left: 47%; }
        .n4 { left: 4%; top: 49%; }

        .safe-core {
          z-index: 2;
          width: 155px;
          height: 155px;
          display: grid;
          place-items: center;
          border-radius: 35px;
          background: #fff;
          border: 1px solid #d8d8d4;
          box-shadow: 0 25px 65px rgba(60,60,60,.12);
          text-align: center;
        }

        .safe-core strong {
          display: block;
          color: #f31332;
          font-size: 38px;
        }

        .safe-core span {
          display: block;
          margin-top: 5px;
          color: #777;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .community-strip {
          padding: 35px;
          border: 1px solid rgba(155,76,255,.18);
          border-radius: 20px;
          background:
            linear-gradient(120deg, rgba(155,76,255,.08), rgba(243,19,50,.04)),
            rgba(255,255,255,.82);
          text-align: center;
        }

        .community-strip h2 {
          margin: 7px 0 8px;
          color: #555;
          font-size: clamp(24px, 4vw, 38px);
          letter-spacing: -.035em;
        }

        .community-strip p {
          margin: 0;
          color: #f31332;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .18em;
        }

        .section {
          padding: 85px 0;
        }

        .section-head {
          max-width: 700px;
          margin-bottom: 35px;
        }

        .section-head h2 {
          margin: 8px 0 12px;
          color: #555;
          font-size: clamp(31px, 5vw, 48px);
          letter-spacing: -.045em;
        }

        .section-head p {
          color: #858585;
          line-height: 1.7;
        }

        .uses {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 17px;
        }

        .use-card {
          min-height: 250px;
          padding: 28px;
          border: 1px solid #d8d8d4;
          border-radius: 18px;
          background: rgba(255,255,255,.9);
          box-shadow: 0 18px 50px rgba(70,70,70,.06);
        }

        .use-number {
          color: #f31332;
          font-family: monospace;
          font-size: 12px;
          font-weight: 900;
        }

        .use-card h3 {
          margin: 55px 0 10px;
          color: #555;
          font-size: 20px;
        }

        .use-card p {
          margin: 0;
          color: #858585;
          font-size: 13px;
          line-height: 1.7;
        }

        .how {
          display: grid;
          grid-template-columns: .8fr 1.2fr;
          gap: 60px;
          align-items: center;
          padding-bottom: 90px;
        }

        .how-card {
          padding: 35px;
          border: 1px solid #d8d8d4;
          border-radius: 20px;
          background: rgba(255,255,255,.9);
        }

        .step {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 17px;
          padding: 18px 0;
          border-bottom: 1px solid #e2e2de;
        }

        .step:last-child { border-bottom: 0; }

        .step-number {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(243,19,50,.07);
          color: #f31332;
          font-size: 11px;
          font-weight: 900;
        }

        .step strong {
          display: block;
          color: #555;
          font-size: 14px;
        }

        .step span {
          display: block;
          margin-top: 5px;
          color: #8d8d88;
          font-size: 12px;
          line-height: 1.6;
        }

        .site-footer {
          position: relative;
          border-top: 1px solid #d7d7d3;
          background: rgba(255,255,255,.58);
        }

        .site-footer-inner {
          width: min(1180px, calc(100% - 36px));
          margin: 0 auto;
          padding: 35px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .site-footer-brand {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .site-footer-logo {
          width: 220px;
          height: auto;
        }

        .site-footer-community {
          padding-left: 25px;
          border-left: 1px solid #d6d6d2;
        }

        .site-footer-community-logo {
          display: block;
          width: 105px;
          max-height: 72px;
          object-fit: contain;
        }

        .site-footer-community strong,
        .site-footer-community span {
          display: block;
        }

        .site-footer-community strong {
          color: #555;
          font-size: 13px;
        }

        .site-footer-community span {
          margin-top: 5px;
          color: #9b4cff;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .site-footer-links {
          display: grid;
          gap: 9px;
          text-align: right;
          color: #858585;
          font-size: 10px;
          font-weight: 700;
        }

        .site-footer-links a {
          color: #f31332;
          text-decoration: none;
        }

        .site-footer-bottom {
          padding: 15px 18px;
          display: flex;
          justify-content: center;
          gap: 30px;
          border-top: 1px solid #e0e0dc;
          color: #969691;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .13em;
        }

        @media (max-width: 850px) {
          .hero { grid-template-columns: 1fr; }
          .safe-visual { max-width: 420px; margin: 0 auto; width: 100%; }
          .uses { grid-template-columns: 1fr; }
          .how { grid-template-columns: 1fr; }
          .site-footer-inner { align-items: flex-start; flex-direction: column; }
          .site-footer-links { text-align: left; }
        }

        @media (max-width: 600px) {
          .header { align-items: flex-start; flex-direction: column; padding: 24px 0; }
          .logo { width: min(330px, 90vw); }
          .hero { padding-top: 55px; }
          .site-footer-brand { align-items: flex-start; flex-direction: column; }
          .site-footer-community { padding: 0; border: 0; }
          .site-footer-bottom { flex-direction: column; align-items: center; gap: 7px; }
        }
      `}</style>

      <main className="home">
        <div className="grid" />

        <div className="wrap">
          <header className="header">
            <img
              src="/bdag-so-sorted-logo.png"
              alt="BDAG SO SORTED"
              className="logo"
            />

            <div className="network">
              <span className="dot" />
              BLOCKDAG MAINNET · CHAIN 1404
            </div>
          </header>

          <section className="hero">
            <div>
              <div className="eyebrow">Community Built Infrastructure</div>

              <h1>
                BDAG <span>Multisig.</span>
              </h1>

              <p className="lead">
                A multisig treasury requires approval from multiple authorised
                owners before funds can be moved. BDAG Multisig provides the
                community with an interface for proposing, reviewing, signing
                and executing shared treasury transactions on BlockDAG.
              </p>

              <div className="actions">
                <a
                  href="/create"
                  className="primary"
                >
                  Create New Multisig
                </a>

                <a
                  href={`/safe/${SAFE_ADDRESS}`}
                  className="secondary"
                >
                  BDAG Community Treasury
                </a>

                <a
                  href="https://bdag.community/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary"
                >
                  Visit BDAG Community ↗
                </a>
              </div>
            </div>

            <div className="safe-visual" aria-hidden="true">
              <div className="orbit" />
              <div className="orbit two" />
              <div className="orbit three" />
              <div className="node n1" />
              <div className="node n2" />
              <div className="node n3" />
              <div className="node n4" />

              <div className="safe-core">
                <div>
                  <strong>2/2</strong>
                  <span>MULTISIG SAFE</span>
                </div>
              </div>
            </div>
          </section>

          <section className="community-strip">
            <div className="eyebrow">Built Together</div>
            <h2>
              Created by the BDAG Community, for the BDAG Community.
            </h2>
            <p>WE BUILD. WE DELIVER.</p>
          </section>

          <section className="section">
            <div className="section-head">
              <div className="eyebrow">Community Treasury</div>
              <h2>What can BDAG Multisig be used for?</h2>
              <p>
                Multisig wallets are useful wherever funds should be managed
                collectively instead of being controlled by a single wallet.
              </p>
            </div>

            <div className="uses">
              {uses.map((item) => (
                <article className="use-card" key={item.number}>
                  <div className="use-number">{item.number}</div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="how">
            <div className="section-head">
              <div className="eyebrow">How It Works</div>
              <h2>Multiple approvals. One treasury.</h2>
              <p>
                The wallet is controlled by its configured Safe owners.
                Transactions cannot be executed until the Safe's required
                approval threshold has been reached.
              </p>
            </div>

            <div className="how-card">
              <div className="step">
                <div className="step-number">01</div>
                <div>
                  <strong>Connect an owner wallet</strong>
                  <span>
                    Access to the management dashboard is checked against the
                    Safe owners on BlockDAG.
                  </span>
                </div>
              </div>

              <div className="step">
                <div className="step-number">02</div>
                <div>
                  <strong>Create and review a proposal</strong>
                  <span>
                    Treasury transactions are prepared for the Safe before
                    owner signatures are collected.
                  </span>
                </div>
              </div>

              <div className="step">
                <div className="step-number">03</div>
                <div>
                  <strong>Collect the required approvals</strong>
                  <span>
                    Each authorised owner independently signs the Safe
                    transaction.
                  </span>
                </div>
              </div>

              <div className="step">
                <div className="step-number">04</div>
                <div>
                  <strong>Execute on BlockDAG</strong>
                  <span>
                    Once the configured threshold is reached, the transaction
                    can be submitted to the Safe for execution.
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <SiteFooter />
      </main>
    </>
  );
}

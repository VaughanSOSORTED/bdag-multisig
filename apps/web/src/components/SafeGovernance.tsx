"use client";

export default function SafeGovernance() {
  return (
    <div className="safe-governance">
      <div className="gov-intro">
        <div className="kicker">Community signalling</div>
        <h2>Governance</h2>
        <p className="lede">
          Token-weighted governance is planned for this Safe, but it is{" "}
          <strong>not implemented in the dashboard yet</strong>.
        </p>
      </div>

      <div className="gov-banner">Not available yet</div>

      <section className="gov-card">
        <h3>What it is for</h3>
        <p>
          A governance token lets the wider community express preference on
          proposals (for example direction or priorities) with voting power
          based on token holdings. That signalling lives in a separate
          on-chain vote contract (`BdagVote`).
        </p>
      </section>

      <section className="gov-card">
        <h3>What it does <em>not</em> do</h3>
        <p>
          A successful governance vote does <strong>not</strong> move BDAG out
          of this Safe by itself. Treasury custody stays with the multisig:
          owners still must propose, collect signatures, and execute any spend
          under the Safe threshold.
        </p>
      </section>

      <section className="gov-card">
        <h3>Why it is separate</h3>
        <p>
          Keeping vote signalling and Safe execution as two layers means
          community sentiment can be recorded without giving the vote contract
          the power to spend treasury funds.
        </p>
      </section>

      <p className="gov-footnote">
        When this ships, this tab will show token holdings, open proposals, and
        how to participate. Until then, use Fund, Propose, History, and Settings
        for treasury operations.
      </p>

      <style jsx>{`
        .safe-governance {
          display: grid;
          gap: 14px;
          max-width: 720px;
        }

        .kicker {
          color: #f31332;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        h2 {
          margin: 6px 0 8px;
          color: #555;
          font-size: 22px;
        }

        .lede {
          margin: 0;
          color: #777;
          font-size: 13px;
          line-height: 1.65;
        }

        .lede strong {
          color: #555;
        }

        .gov-banner {
          display: inline-flex;
          width: fit-content;
          padding: 8px 12px;
          border: 1px solid #efd2b8;
          border-radius: 999px;
          background: #fff7ef;
          color: #8a3b12;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .gov-card {
          padding: 16px 18px;
          border: 1px solid #e0e0dc;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.82);
        }

        .gov-card h3 {
          margin: 0 0 8px;
          color: #555;
          font-size: 14px;
        }

        .gov-card p {
          margin: 0;
          color: #858585;
          font-size: 12px;
          line-height: 1.65;
        }

        .gov-footnote {
          margin: 4px 0 0;
          color: #999;
          font-size: 11px;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

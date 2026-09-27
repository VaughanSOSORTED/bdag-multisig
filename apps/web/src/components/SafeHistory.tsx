"use client";

export type HistoryRow = {
  id: string;
  title: string;
  meta: string;
  amount: string;
  partyLabel: string;
  party: string;
  detailLabel: string;
  detail: string;
  status: string;
  statusClass: string;
  when: string;
};

export default function SafeHistory({
  rows,
  activityError,
}: {
  rows: HistoryRow[];
  activityError?: string;
}) {
  return (
    <section className="history-tab">
      <div className="history-intro">
        <div className="kicker">Transaction history</div>
        <h2>Activity</h2>
        <p>
          On-chain Safe deposits and executions, plus proposal records from the
          multisig service.
        </p>
      </div>

      {activityError && (
        <div className="history-warning">{activityError}</div>
      )}

      {rows.length === 0 ? (
        <div className="history-empty">
          <strong>No transactions yet</strong>
          <p>
            Incoming BDAG deposits and executed Safe transfers will appear
            here.
          </p>
        </div>
      ) : (
        <div className="history-list">
          {rows.map((row) => (
            <article className="history-card" key={row.id}>
              <div className="history-card-top">
                <div>
                  <div className="history-title">{row.title}</div>
                  <div className="history-meta">
                    {row.meta.length > 20
                      ? `${row.meta.slice(0, 10)}…${row.meta.slice(-8)}`
                      : row.meta}
                  </div>
                </div>
                <span className={`history-status ${row.statusClass}`}>
                  {row.status}
                </span>
              </div>

              <div className="history-grid">
                <div>
                  <span className="history-label">Amount</span>
                  <div className="history-value">{row.amount}</div>
                </div>
                <div>
                  <span className="history-label">{row.partyLabel}</span>
                  <div className="history-value">{row.party}</div>
                </div>
                <div>
                  <span className="history-label">{row.detailLabel}</span>
                  <div className="history-value">{row.detail}</div>
                </div>
                <div>
                  <span className="history-label">Source</span>
                  <div className="history-value">
                    {row.id.startsWith("api-") ? "Service" : "Chain"}
                  </div>
                </div>
                <div>
                  <span className="history-label">When</span>
                  <div className="history-value">{row.when}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <style jsx>{`
        .history-tab {
          display: grid;
          gap: 16px;
        }

        .history-intro h2 {
          margin: 6px 0 8px;
          color: #555;
          font-size: 22px;
        }

        .history-intro p {
          margin: 0;
          color: #858585;
          font-size: 12px;
          line-height: 1.6;
        }

        .kicker {
          color: #999;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .history-warning {
          padding: 12px;
          border: 1px solid #efd2b8;
          border-radius: 10px;
          background: #fff7ef;
          color: #5c3b1d;
          font-size: 12px;
          line-height: 1.5;
        }

        .history-empty {
          padding: 28px 18px;
          border: 1px solid #e0e0dc;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.8);
          text-align: center;
        }

        .history-empty strong {
          display: block;
          color: #555;
          font-size: 14px;
        }

        .history-empty p {
          margin: 8px 0 0;
          color: #888;
          font-size: 12px;
          line-height: 1.5;
        }

        .history-list {
          display: grid;
          gap: 12px;
        }

        .history-card {
          padding: 16px;
          border: 1px solid #e0e0dc;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.88);
        }

        .history-card-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .history-title {
          color: #555;
          font-size: 13px;
          font-weight: 800;
        }

        .history-meta {
          margin-top: 5px;
          color: #999;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          word-break: break-all;
        }

        .history-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .history-label {
          display: block;
          margin-bottom: 4px;
          color: #999;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .history-value {
          color: #666;
          font-size: 12px;
          font-weight: 700;
          word-break: break-word;
        }

        .history-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .history-status.executed {
          background: rgba(35, 150, 80, 0.1);
          color: #238f52;
        }

        .history-status.pending {
          background: rgba(243, 19, 50, 0.08);
          color: #f31332;
        }

        .history-status.stale {
          background: rgba(110, 110, 110, 0.1);
          color: #777;
        }

        .history-status.received {
          background: rgba(35, 120, 180, 0.1);
          color: #1f6f9f;
        }

        .history-status.setup {
          background: rgba(110, 110, 110, 0.1);
          color: #666;
        }

        @media (max-width: 720px) {
          .history-grid {
            grid-template-columns: 1fr 1fr;
          }

          .history-card-top {
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  );
}

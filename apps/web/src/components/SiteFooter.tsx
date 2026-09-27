function GitHubIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 .7C5.7.7.6 5.8.6 12.1c0 5 3.3 9.2 7.8 10.7.6.1.8-.3.8-.6v-2.3c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6a11.5 11.5 0 0 0 7.8-10.7C23.4 5.8 18.3.7 12 .7Z" />
    </svg>
  );
}

export default function SiteFooter() {
  const githubLinkStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img
            src="/bdag-so-sorted-logo.png"
            alt="BDAG SO SORTED"
            className="site-footer-logo"
          />

          <div className="site-footer-community">
            <img
              src="/bdag-community-logo.png"
              alt="BDAG Community"
              className="site-footer-community-logo"
            />
          </div>
        </div>

        <div className="site-footer-links">
          <a
            href="https://bdag.community/"
            target="_blank"
            rel="noopener noreferrer"
          >
            BDAG.COMMUNITY ↗
          </a>

          <span>DEVELOPERS</span>

          <a
            href="https://github.com/VaughanSOSORTED"
            target="_blank"
            rel="noopener noreferrer"
            style={githubLinkStyle}
            aria-label="VC - VaughanSOSORTED on GitHub"
          >
            <GitHubIcon />
            VC — VaughanSOSORTED ↗
          </a>

          <a
            href="https://github.com/blockdag-community"
            target="_blank"
            rel="noopener noreferrer"
            style={githubLinkStyle}
            aria-label="ML - blockdag-community on GitHub"
          >
            <GitHubIcon />
            ML — blockdag-community ↗
          </a>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>BDAG COMMUNITY MULTISIG</span>
        <span>WE BUILD. WE DELIVER.</span>
      </div>
    </footer>
  );
}

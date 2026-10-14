import QuickCaptureForm from "@/components/QuickCaptureForm";

export default function Home() {
  return (
    <main className="journal-shell">
      <header className="journal-header">
        <div className="brand-mark" aria-hidden="true">
          MJ
        </div>

        <div>
          <p className="journal-eyebrow">Private maintainer workspace</p>
          <h1>Maintainer&apos;s Journal</h1>
          <p className="journal-tagline">
            Keep the context. Know the next move.
          </p>
        </div>
      </header>

      <section className="journal-workspace" aria-labelledby="workspace-title">
        <div className="workspace-introduction">
          <h2 id="workspace-title">Journal workspace</h2>
          <p>
            Capture GitHub work, preserve its history, and keep the next action
            visible.
          </p>
        </div>

        <QuickCaptureForm />
      </section>
    </main>
  );
}

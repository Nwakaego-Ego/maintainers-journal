import QuickCaptureForm from "@/components/QuickCaptureForm";

export default function Home() {
  return (
    <main>
      <header>
        <h1>Maintainer&apos;s Journal</h1>
        <p>This is a private workspace for selected GitHub work</p>
      </header>
      <section>
        <h2>Quick capture</h2>
        <p>Add a GitHub issue or pull request that you want to revisit.</p>
        <QuickCaptureForm />
      </section>
    </main>
  );
}

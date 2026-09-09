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
        <form>
          <label htmlFor="github-url">GitHub Url</label>
          <input id="github-url" type="url" />
          <button>Submit</button>
        </form>
      </section>
    </main>
  );
}

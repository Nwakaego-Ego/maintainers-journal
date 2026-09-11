"use client";

import type { FormEvent } from "react";

export default function QuickCaptureForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const githubUrl = formData.get("githubUrl");
    console.log(githubUrl);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="github-url">GitHub URL</label>
      <input id="github-url" type="url" name="githubUrl" />
      <button type="submit">Submit</button>
    </form>
  );
}

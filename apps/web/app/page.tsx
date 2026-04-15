import { CompanyCategory } from "@minerales/types";

export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Minerales Chilenos</h1>
      <p>Monorepo bootstrap completed. Public UI migration starts here.</p>
      <p>First mapped category: {CompanyCategory.LABORATORY}</p>
    </main>
  );
}

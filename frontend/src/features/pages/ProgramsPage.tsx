import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import "./InfoPages.css";

export function ProgramsPage() {
  return (
    <div className="site-shell">
      <Header />
      <main className="content-page empty-content-page" aria-label="Programe" />
      <Footer />
    </div>
  );
}

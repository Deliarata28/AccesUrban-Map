import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import "./InfoPages.css";

export function ContactsPage() {
  return (
    <div className="site-shell">
      <Header />
      <main className="content-page empty-content-page" aria-label="Contacte" />
      <Footer />
    </div>
  );
}

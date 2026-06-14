export default function TermsPage() {
  return (
    <div className="page-container space-y-6">
      <div className="sticky-header -mx-4 px-4 py-3">
        <h1 className="text-xl font-black">Regulamin</h1>
      </div>

      <div className="prose max-w-none text-sm text-muted-foreground">
        <p>
          Niniejszy regulamin opisuje zasady korzystania z aplikacji Dreptak. Korzystając z aplikacji, akceptujesz zasady i zobowiązujesz się do przestrzegania ich postanowień.
        </p>

        <h3>1. Rejestracja i konto</h3>
        <p>Masz prawo utworzyć konto i korzystać z funkcji aplikacji. Dbaj o poufność danych logowania.</p>

        <h3>2. Wyzwania i treści</h3>
        <p>Tworząc wyzwania akceptujesz odpowiedzialność za treści oraz zachowanie innych uczestników. Zabronione są treści obraźliwe, nielegalne lub naruszające prawa osób trzecich.</p>

        <h3>3. Dane i prywatność</h3>
        <p>Dane użytkowników są wykorzystywane wyłącznie do celów funkcjonowania wyzwań i statystyk. Szczegóły polityki prywatności dostępne są w aplikacji.</p>

        <h3>4. Usuwanie wyzwania</h3>
        <p>Autor wyzwania może je usunąć. Usunięcie jest nieodwracalne i powoduje utratę powiązanych danych.</p>

        <h3>5. Kontakt</h3>
        <p>W razie pytań skontaktuj się z administracją aplikacji.</p>
      </div>
    </div>
  )
}

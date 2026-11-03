export const metadata = { title: "Buyer approval done: Refund Referee" };

/** Where `npm run proof` sends the sandbox buyer. The command in the terminal does the rest. */
export default function ProofApproved() {
  return (
    <main className="page">
      <div className="card">
        <h1>Buyer approval sent to PayPal</h1>
        <p>Go back to the terminal running <code>npm run proof</code>. It reads the order from PayPal and carries on from there.</p>
      </div>
    </main>
  );
}

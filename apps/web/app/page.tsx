export default function Home() {
  return (
    <main style={{maxWidth: 900, margin: "80px auto", padding: 24, fontFamily: "system-ui"}}>
      <h1>Caller Intelligence</h1>
      <p>Caller ID, spam reputation, reverse lookup and verified business identity.</p>
      <input placeholder="Search phone number" style={{padding: 14, width: "100%", marginTop: 24}} />
    </main>
  );
}

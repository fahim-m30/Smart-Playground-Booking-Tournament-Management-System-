export default function Footer({ navigate }) {
  return <footer><button className="brand" onClick={() => navigate("home")}><span>⚽</span> TURF</button><p>Smart Playground Booking & Tournament Management System</p><div><button onClick={() => navigate("venues")}>Playgrounds</button><button onClick={() => navigate("tournaments")}>Tournaments</button><a href="/legacy/index.html">All classic pages</a></div></footer>;
}

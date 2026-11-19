import { bridge } from "./bridge";
import { House, UserRound } from "lucide-react";

export type HomePerson = { id: number; name: string; photo: string | null };

export function HomePresence({ rows }: { rows: HomePerson[] }) {
  if (!rows.length) return null;

  return (
    <section className="glass home-presence" aria-label="Pessoas em casa">
      <span className="home-presence-label"><House aria-hidden="true" />Em casa</span>
      <div className="home-presence-people">
        {rows.map(person => (
          <button type="button" className="home-presence-person" key={person.id} title={person.name} aria-label={`Histórico de presença · ${person.name}`} onClick={()=>bridge?.openPresenceHistory?.(person.id)}>
            {person.photo
              ? <img src={person.photo} alt={person.name} draggable={false} />
              : <UserRound role="img" aria-label={person.name} />}
          </button>
        ))}
      </div>
    </section>
  );
}

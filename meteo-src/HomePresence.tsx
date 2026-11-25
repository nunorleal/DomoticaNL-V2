import { bridge } from "./bridge";
import { House, UsersRound, UserRound } from "lucide-react";

export type HomePerson = { id: number; name: string; photo: string | null };

export function HomePresence({ rows }: { rows: HomePerson[] }) {
  if (!rows.length && !bridge?.openPresenceHistory) return null;

  return (
    <section className="glass home-presence" aria-label="Pessoas e presenças em casa">
      {rows.length ? <span className="home-presence-label"><House aria-hidden="true" />Em casa</span> : <button type="button" className="home-presence-label home-presence-access" aria-label="Pessoas · histórico de presenças" aria-haspopup="dialog" onClick={()=>bridge?.openPresenceHistory?.(0)}><UsersRound aria-hidden="true" />Pessoas</button>}
      {rows.length > 0 && <div className="home-presence-people">
        {rows.map(person => (
          <button type="button" className="home-presence-person" key={person.id} title={person.name} aria-label={`Histórico de presença · ${person.name}`} onClick={()=>bridge?.openPresenceHistory?.(person.id)}>
            {person.photo
              ? <img src={person.photo} alt={person.name} draggable={false} />
              : <UserRound role="img" aria-label={person.name} />}
          </button>
        ))}
      </div>}
    </section>
  );
}

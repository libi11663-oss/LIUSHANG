// In-memory mock for D1 database in AI Studio environment
interface ApplicationRecord {
  id: string;
  name: string;
  email: string;
  city: string;
  purpose: string;
  story: string;
  consent_version: string;
  created_at: number;
}

const applicationsStore: ApplicationRecord[] = [];

export function applicationDb() {
  return {
    prepare(sql: string) {
      let boundArgs: unknown[] = [];
      const stmt = {
        bind(...args: unknown[]) {
          boundArgs = args;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (sql.includes('SELECT id FROM applications WHERE email = ? AND created_at > ?')) {
            const [email, minCreatedAt] = boundArgs;
            const found = applicationsStore.find(
              app => app.email.toLowerCase() === String(email).toLowerCase() && app.created_at > Number(minCreatedAt)
            );
            return (found ? { id: found.id } : null) as T;
          }
          return null;
        },
        async run() {
          if (sql.includes('INSERT INTO applications')) {
            const [id, name, email, city, purpose, story, consent_version, created_at] = boundArgs;
            applicationsStore.push({
              id: String(id),
              name: String(name),
              email: String(email),
              city: String(city),
              purpose: String(purpose),
              story: String(story),
              consent_version: String(consent_version),
              created_at: Number(created_at),
            });
            return { success: true };
          }
          return { success: true };
        },
        async all() {
          return { results: [...applicationsStore] };
        }
      };
      return stmt;
    }
  };
}

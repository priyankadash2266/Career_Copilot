const KEY = "cc.voterId";

/**
 * Anonymous, per-browser id used for "one person, one vote" on the jobs board.
 * Not an account and not personal data: just a random UUID kept in localStorage.
 */
export function getVoterId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anonymous-session";
  }
}

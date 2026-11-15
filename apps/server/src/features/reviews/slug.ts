export function splitSlug(slug: string): [string, string] {
  const [owner, name] = slug.split("/");
  if (!owner || !name) throw new Error(`Repo ${slug} is missing owner/name`);
  return [owner, name];
}

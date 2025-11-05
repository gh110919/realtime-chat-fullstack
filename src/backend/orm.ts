export const orm = (await import("knex")).knex({
  client: "sqlite3",
  connection: {
    filename: "database.sqlite",
  },
  useNullAsDefault: true,
});

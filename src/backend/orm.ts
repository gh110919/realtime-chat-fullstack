import { config } from "dotenv";
import knex from "knex";

const { PG } = config({
  path: ".local/.env",
}).parsed!;

export const connection = knex({
  client: "pg",
  connection: PG,
  useNullAsDefault: true,
});

class ORM {
  create = (table: string, data: object) => {
    return connection(table).insert(data);
  };
  read = (table: string) => {
    return connection(table);
  };
  update = (table: string, where: object, update: object) => {
    return connection(table).where(where).update(update);
  };
  delete = (table: string, where: object) => {
    return connection(table).where(where).delete();
  };
  filtering = (table: string, where: object) => {
    return connection(table).where(where);
  };
  pagination = (table: string, page: number, perPage: number) => {
    return connection(table)
      .limit(perPage)
      .offset((page - 1) * perPage);
  };
  sorting = (table: string, column: string, order: "asc" | "desc") => {
    return connection(table).orderBy(column, order);
  };
  count = async (table: string) => {
    return (await connection(table)).length;
  };
}

type TORM = InstanceType<typeof ORM>;
type TConection = typeof connection;
type TProxyORM = TORM & TConection;

export const orm = new Proxy(new ORM(), {
  get(target: TORM, prop: string) {
    if (prop in target) {
      return target[prop as keyof ORM];
    }
    if (prop in connection) {
      return connection[prop as keyof TConection];
    }
    return undefined;
  },
}) as TProxyORM;

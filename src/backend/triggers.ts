import { Request, Response } from "express";
import { orm } from "./orm";

export const triggers = async (_: Request, res: Response) => {
  try {
    await orm.raw(`
      CREATE TRIGGER data_after_insert
      AFTER INSERT ON data
      BEGIN
        INSERT INTO data_log (id, "action", message, created_at) 
        VALUES (NEW.id, 'INSERT', NEW.message, CURRENT_TIMESTAMP);
      END;
    `);

    await orm.raw(`
      CREATE TRIGGER data_after_update
      AFTER UPDATE ON data
      BEGIN
        INSERT INTO data_log (id, "action", message, created_at) 
        VALUES (NEW.id, 'UPDATE', NEW.message, CURRENT_TIMESTAMP);
      END;
    `);

    await orm.raw(`
      CREATE TRIGGER data_after_delete
      AFTER DELETE ON data
      BEGIN
        INSERT INTO data_log (id, "action", message, created_at) 
        VALUES (OLD.id, 'DELETE', OLD.message, CURRENT_TIMESTAMP);
      END;
    `);

    res.status(200).send("Все триггеры успешно созданы!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Произошла ошибка при создании триггеров:");
  }
};

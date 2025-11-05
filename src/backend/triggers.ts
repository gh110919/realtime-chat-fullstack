import { Request, Response } from "express";
import { orm } from "./orm";

export const triggers = async (_: Request, res: Response) => {
  try {
    await orm.raw(`
      CREATE TRIGGER message_after_insert
      AFTER INSERT ON message
      BEGIN
        INSERT INTO trigger (_id, "action", content, _created_at) 
        VALUES (NEW._id, 'INSERT', NEW.content, CURRENT_TIMESTAMP);
      END;
    `);

    await orm.raw(`
      CREATE TRIGGER message_after_update
      AFTER UPDATE ON message
      BEGIN
        INSERT INTO trigger (_id, "action", content, _created_at) 
        VALUES (NEW._id, 'UPDATE', NEW.content, CURRENT_TIMESTAMP);
      END;
    `);

    await orm.raw(`
      CREATE TRIGGER message_after_delete
      AFTER DELETE ON message
      BEGIN
        INSERT INTO trigger (_id, "action", content, _created_at) 
        VALUES (OLD._id, 'DELETE', OLD.content, CURRENT_TIMESTAMP);
      END;
    `);

    res.status(200).send("Все триггеры успешно созданы!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Произошла ошибка при создании триггеров:");
  }
};

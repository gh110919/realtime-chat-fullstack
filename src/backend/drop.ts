import { Request, Response } from "express";
import { writeFileSync } from "fs";
import { orm } from "./orm"; 

export const drop = async (req: Request, res: Response) => {
  try {
    req.body.delete.forEach(async (e: { table: string }) => {
      await orm.schema.dropTableIfExists(e.table);
      console.log(`Таблица "${e.table}" успешно удалена!`);
    });

    // writeFileSync(
    //   "src/backend/endpoints.json",
    //   JSON.stringify([]),
    //   "utf-8",
    // );

    writeFileSync(
      "src/backend/migrate.json",
      JSON.stringify([]),
      "utf-8",
    );

    // writeFileSync(
    //   "src/backend/migrate.d.ts",
    //   JSON.stringify(null),
    //   "utf-8",
    // );

    res.status(200).json({
      success: true,
      message: `Все таблицы успешно удалены!`,
    });
  } catch (error) {
    console.log("error", error);

    res.status(500).json({
      success: false,
      message: `Исключение при удалении таблиц: ${error}`,
    });
  }
};
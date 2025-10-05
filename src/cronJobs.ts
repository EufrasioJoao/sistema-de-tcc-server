import cron from "node-cron";
import { backupDatabase } from "./scripts/backup";



cron.schedule("0 1 * * *", backupDatabase);

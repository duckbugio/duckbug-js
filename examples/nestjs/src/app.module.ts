import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { DuckBugModule } from "./duckbug/duckbug.module";

@Module({
  imports: [DuckBugModule],
  controllers: [AppController],
})
export class AppModule {}

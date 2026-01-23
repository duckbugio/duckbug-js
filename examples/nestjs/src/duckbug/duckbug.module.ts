import { Global, Module } from "@nestjs/common";
import { DuckBugService } from "./duckbug.service";

@Global()
@Module({
  providers: [DuckBugService],
  exports: [DuckBugService],
})
export class DuckBugModule {}

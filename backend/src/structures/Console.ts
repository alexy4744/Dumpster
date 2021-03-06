/* Drop in replacement for console, might add logging */

import { Console } from "console";
import chalk from "chalk";

export default class extends Console {
  public constructor() {
    super(process.stdout, process.stderr);
  }

  private get prettyTimeStamp(): string {
    const date: Date = new Date(Date.now());

    return `[${date.toLocaleTimeString()} ${date.toLocaleDateString()}]`;
  }

  public log(...args: any): void {
    super.log(chalk.blue(this.prettyTimeStamp), ...args);
  }

  public warn(...args: any): void {
    super.warn(chalk.yellow(this.prettyTimeStamp, ...args));
  }

  public error(error: Error | string): void {
    super.error(chalk.red(`${this.prettyTimeStamp} ${error}`));
  }
}
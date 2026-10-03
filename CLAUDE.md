@AGENTS.md

Comments should never references docs or specs and shouldn’t not be so verbose, rarely ever more than one or two lines

After each issue completion stage the files an give me a one line commit message, if there a user Story its resolving, be sure to mention the story id, pause between issue to let me check progress. At the end of each summarize the changes and fixes you made.

use claude plugin /ponytail:ponytail-review  to reviw and check all staged files (even for small changes), and make any refinements you deem helpful that will improve the code without causing any regression, breaking the feature, or oversimplifying logic

NEVER COMMIT, PUSH OR PUBLISH ANY CODE YOURSELF

always make tsx test scripts to test changes after every phase or fix, never stage the test scripts. once moving onto the new issue, delete old test script unless explicitly told.

dont ever write to the db unless explicitly told to do so. you may propose schema changes (edit prisma/schema.prisma and add a prisma/sql file), but never apply them or run any migrations until i approve. 

if we're ever working of a refrence doc, be sure to update the progress everytime we complete a task.

when giving explainations you very simple clear and concise message, unless explicitely asked for a dev explaination, in whihc you go in deeper detail.
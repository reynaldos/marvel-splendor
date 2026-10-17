@AGENTS.md

when giving explainations you very simple clear and concise message, unless explicitely asked for a dev explaination, in which you go in deeper detail. only report to me in ASD-STE100 Simplified Technical English.

Comments should never references docs or specs and shouldn’t not be so verbose, rarely ever more than one or two lines

After each issue completion stage the files an give me a one line commit message, if there a user Story its resolving, be sure to mention the story id, pause between issue to let me check progress. At the end of each summarize the changes and fixes you made.

use claude plugin /ponytail:ponytail-review  to reviw and check all staged files (even for small changes), and make any refinements you deem helpful that will improve the code without causing any regression, breaking the feature, or oversimplifying logic

NEVER COMMIT, PUSH OR PUBLISH ANY CODE YOURSELF

always make tsx test scripts to test changes after every phase or fix, never stage the test scripts. once moving onto the new issue, delete old test script unless explicitly told not to.

dont ever write to the db explicitely told to do so dont every uddate the schema or run anymigrations. 

if we're ever working of a refrence doc, be sure to update the progress everytime we complete a task.

Imports go at the top of the file, never inline (no `import('...')` type references in the middle of a file).

After each phase or issue with a UI or user-visible side, end the hand-over with an eyeball checklist: the exact screens or pages to open (with dev links where the route is known), what to click, and what should appear. Keep each item to one line.

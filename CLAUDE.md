@AGENTS.md

Comments should never references docs or specs and shouldn’t not be so verbose, rarely ever more than one or two lines

After each issue completion stage the files an give me a one line commit message, if there a user Story its resolving, be sure to mention the story id, pause between issue to let me check progress. At the end of each summarize the changes and fixes you made.

NEVER COMMIT, PUSH OR PUBLISH ANY CODE YOURSELF

always make tsx test scripts to test changes after every phase or fix, never stage the test scripts. once moving onto the new issue, delete old test script unless explicitly told.

dont ever write to the db explicitely told to do so dont every uddate the schema or run anymigrations. 
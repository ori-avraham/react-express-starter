<!--
  Test documentation template. Copy this file to docs/tests.md in your project.

  You need at least 5 documented tests, including failure cases.
  A good set covers:
    - The full demo scenario (happy path)
    - Every business rule: once followed, once broken
    - Permissions: a user trying something their role may not do
    - Validation: a form submitted with invalid data

  Tip: the requests in backend/docs/*.http are a quick way to run API tests.
  Take a screenshot of the result as evidence.
-->

# Tests

**Tested on:** <date> · **Tested by:** <name> · **Database state:** fresh `npm run seed`

## Summary

| #  | Test                                         | Type           | Result |
| -- | -------------------------------------------- | -------------- | ------ |
| 1  | <Member creates a note>                      | Happy path     | ✅ Pass |
| 2  | <Note title shorter than 3 characters>       | Validation     | ✅ Pass |
| 3  | <Member tries to archive a note>             | Permission     | ✅ Pass |
| 4  | <Editing an archived note>                   | Business rule  | ✅ Pass |
| 5  | <Same title twice>                           | Business rule  | ✅ Pass |

## Details

### Test 1: <Member creates a note>

| | |
| --- | --- |
| **Purpose**   | <Which requirement or rule this checks> |
| **User**      | <member@demo.com> |
| **Steps**     | 1. <Sign in> 2. <Go to Notes → New note> 3. <Fill "Title" with "Call the technician", submit> |
| **Expected**  | <The note appears in the list with status "Open"; a success message is shown> |
| **Actual**    | <What happened> |
| **Result**    | ✅ Pass / ❌ Fail |
| **Evidence**  | ![](screenshots/test-1.png) |

### Test 2: <Note title shorter than 3 characters>

| | |
| --- | --- |
| **Purpose**   | <Validation on both client and server> |
| **User**      | <member@demo.com> |
| **Steps**     | 1. <...> |
| **Expected**  | <Form shows "Title must be at least 3 characters."; API returns 400> |
| **Actual**    | <...> |
| **Result**    | <...> |
| **Evidence**  | <...> |

### Test 3: <Member tries to archive a note>

| | |
| --- | --- |
| **Purpose**   | <Only managers can archive; checked on the server> |
| **User**      | <member@demo.com> |
| **Steps**     | 1. <Send `PATCH /api/notes/:id/archive` from notes.http as a member> |
| **Expected**  | <403 "Only manager users can do this."> |
| **Actual**    | <...> |
| **Result**    | <...> |
| **Evidence**  | <...> |

<!-- Copy a block for each additional test. -->

## Bugs found and fixed

| # | Bug | How it was found | Fix |
| - | --- | ---------------- | --- |
| 1 | <...> | <Test 4> | <...> |

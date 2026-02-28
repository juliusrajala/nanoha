import { executeLoop } from "./core";

export async function runAgent() {
  const plan =
    "Fix the typos in playground.md. Read the file first, then fix one typo per subtask " +
    "using the editFile tool, then mark that subtask as completed before moving to the next.";

  const subtasks = [
    'Fix the title: "Playgruond" should be "Playground"',
    'Fix line: "Ths is a tset of the nanoha agnet harness." should be "This is a test of the nanoha agent harness."',
    'Fix line: "It shuold be able to fixx typos in this file." should be "It should be able to fix typos in this file."',
    'Fix line: "The quik brown fox jumsp over the layz dog." should be "The quick brown fox jumps over the lazy dog."',
  ];

  return executeLoop({
    subtasks,
    plan,
    tools: [],
  });
}

import { Crust } from "@crustjs/core";
import { createAgentSession } from "./src/main";
import { renderRoot } from "./src/tui/root";
import { cliStreamHandler, requestCliApproval } from "src/cli/streamHandler";

const main = new Crust("nanoha")
  .meta({ description: "Nanoha Agent Harness" })
  .args([
    {
      name: "prompt",
      description: "The prompt to run the Nanoha agent with",
      type: "string",
      require: false,
    },
    {
      name: "verbose",
      description: "Print full tool inputs and outputs",
      type: "boolean",
      require: false,
    },
    {
      name: "yolo",
      description: "Skip command approval prompts for runCommand",
      type: "boolean",
      require: false,
    },
    {
      name: "plan",
      description:
        "Only allow read tools, preventing any file modifications or command executions. Useful for testing and evaluation.",
      type: "boolean",
      require: false,
    },
  ])
  .run(async ({ args }) => {
    const yolo = Boolean(args.yolo);
    const onlyPlan = Boolean(args.plan);

    // If nanoha is started without a prompt, we start the TUI
    if (!args.prompt) {
      const session = await createAgentSession({
        yolo,
        onlyPlan,
        verbose: false,
      });
      await renderRoot(session);
      return;
    }

    // Run headless instead
    const prompt = args.prompt.toString();
    const verbose = Boolean(args.verbose);
    const session = await createAgentSession({ yolo, onlyPlan, verbose });

    if (!yolo) {
      session.setCommandApprovalHandler(requestCliApproval);
    }

    await session.run({
      prompt,
      handler: cliStreamHandler({
        yolo,
        onlyPlan,
        verbose,
      }),
    });
  });

await main.execute();

export type CommandApprovalRequest = {
  approvalId: string;
  toolName: string;
  input: unknown;
};

export type CommandApprovalHandler = (request: CommandApprovalRequest) => Promise<boolean>;

export interface RunOptions {
  onlyPlan: boolean;
  yolo: boolean;
  verbose: boolean;
  commandApprovalHandler?: CommandApprovalHandler;
}

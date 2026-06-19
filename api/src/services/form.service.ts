import type {
  FormSubmissionDTO,
  FormSubmitInput,
  Paginated,
  PaginationQuery,
} from "@webforge/shared";
import { FormSubmission, type FormSubmissionDoc } from "../models/FormSubmission.js";
import { Site } from "../models/Site.js";
import { Workspace } from "../models/Workspace.js";
import { notFound } from "../utils/http-error.js";
import { requireWorkspace } from "./access.service.js";
import { sendEmail } from "./email.service.js";

function safeFormName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 60) || "contact";
}

export function toSubmissionDTO(s: FormSubmissionDoc): FormSubmissionDTO {
  return {
    id: s._id.toString(),
    workspace: s.workspace.toString(),
    site: s.site ? s.site.toString() : null,
    formName: s.formName,
    name: s.name,
    email: s.email,
    message: s.message,
    fields: s.fields ?? {},
    createdAt: s.createdAt.toISOString(),
  };
}

/** Public form capture for a site (contact / lead forms). */
export async function submitForm(
  siteId: string,
  formName: string,
  input: FormSubmitInput,
): Promise<{ ok: true; id: string }> {
  const site = await Site.findById(siteId);
  if (!site) throw notFound("Site not found");

  const submission = await FormSubmission.create({
    workspace: site.workspace,
    site: site._id,
    formName: safeFormName(formName),
    name: input.name ?? null,
    email: input.email ?? null,
    message: input.message ?? null,
    fields: input.fields ?? {},
  });

  // Notify the workspace owner.
  const ws = await Workspace.findById(site.workspace).populate<{ owner: { email?: string } }>(
    "owner",
    "email",
  );
  if (ws?.owner?.email) {
    await sendEmail({
      to: ws.owner.email,
      subject: `New "${submission.formName}" submission on ${site.name}`,
      html:
        `<p>New form submission:</p><ul>` +
        `<li>Name: ${input.name ?? "—"}</li><li>Email: ${input.email ?? "—"}</li>` +
        `<li>Message: ${input.message ?? "—"}</li></ul>`,
      text: `New ${submission.formName} submission from ${input.email ?? "unknown"}`,
    });
  }
  return { ok: true, id: submission._id.toString() };
}

/** Admin: list a workspace's form submissions (paginated). */
export async function listSubmissions(
  workspaceId: string,
  userId: string,
  query: PaginationQuery,
): Promise<Paginated<FormSubmissionDTO>> {
  await requireWorkspace(workspaceId, userId);
  const { page, limit } = query;
  const [items, total] = await Promise.all([
    FormSubmission.find({ workspace: workspaceId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    FormSubmission.countDocuments({ workspace: workspaceId }),
  ]);
  return {
    items: items.map(toSubmissionDTO),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

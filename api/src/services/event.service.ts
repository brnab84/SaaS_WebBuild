import type {
  CreateEventInput,
  EventDTO,
  Paginated,
  PaginationQuery,
  RsvpInput,
  UpdateEventInput,
} from "@webforge/shared";
import { Event, type EventDoc } from "../models/Event.js";
import { Site } from "../models/Site.js";
import { badRequest, notFound } from "../utils/http-error.js";
import { slugify, withRandomSuffix } from "../utils/slug.js";
import { requireSite, requireWorkspace } from "./access.service.js";
import { sendEmail } from "./email.service.js";

function goingCount(ev: Pick<EventDoc, "rsvps">): number {
  return ev.rsvps.filter((r) => r.status === "going").reduce((n, r) => n + r.guests, 0);
}

export function toEventDTO(ev: EventDoc): EventDTO {
  const going = goingCount(ev);
  return {
    id: ev._id.toString(),
    workspace: ev.workspace.toString(),
    site: ev.site ? ev.site.toString() : null,
    title: ev.title,
    slug: ev.slug,
    description: ev.description,
    startsAt: ev.startsAt.toISOString(),
    endsAt: ev.endsAt ? ev.endsAt.toISOString() : null,
    location: ev.location,
    capacity: ev.capacity,
    rsvps: ev.rsvps.map((r) => ({
      name: r.name,
      email: r.email,
      guests: r.guests,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    goingCount: going,
    spotsLeft: ev.capacity != null ? Math.max(0, ev.capacity - going) : null,
    createdAt: ev.createdAt.toISOString(),
  };
}

async function uniqueEventSlug(workspaceId: string, title: string): Promise<string> {
  let slug = slugify(title);
  while (await Event.exists({ workspace: workspaceId, slug })) {
    slug = withRandomSuffix(slugify(title));
  }
  return slug;
}

async function requireEvent(eventId: string, userId: string) {
  const ev = await Event.findById(eventId);
  if (!ev) throw notFound("Event not found");
  await requireWorkspace(ev.workspace.toString(), userId);
  return ev;
}

export async function createEvent(
  workspaceId: string,
  userId: string,
  input: CreateEventInput,
): Promise<EventDTO> {
  await requireWorkspace(workspaceId, userId);
  if (input.siteId) {
    const site = await requireSite(input.siteId, userId);
    if (site.workspace.toString() !== workspaceId) throw badRequest("Site is in another workspace");
  }
  const slug = await uniqueEventSlug(workspaceId, input.title);
  const ev = await Event.create({
    workspace: workspaceId,
    site: input.siteId ?? null,
    title: input.title,
    slug,
    description: input.description ?? "",
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    location: input.location ?? "",
    capacity: input.capacity ?? null,
    rsvps: [],
  });
  return toEventDTO(ev);
}

export async function listEvents(
  workspaceId: string,
  userId: string,
  query: PaginationQuery,
): Promise<Paginated<EventDTO>> {
  await requireWorkspace(workspaceId, userId);
  const { page, limit } = query;
  const [items, total] = await Promise.all([
    Event.find({ workspace: workspaceId })
      .sort({ startsAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Event.countDocuments({ workspace: workspaceId }),
  ]);
  return {
    items: items.map(toEventDTO),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getEvent(eventId: string, userId: string): Promise<EventDTO> {
  return toEventDTO(await requireEvent(eventId, userId));
}

export async function updateEvent(
  eventId: string,
  userId: string,
  input: UpdateEventInput,
): Promise<EventDTO> {
  const ev = await requireEvent(eventId, userId);
  if (input.title !== undefined) ev.title = input.title;
  if (input.description !== undefined) ev.description = input.description;
  if (input.startsAt !== undefined) ev.startsAt = input.startsAt;
  if (input.endsAt !== undefined) ev.endsAt = input.endsAt;
  if (input.location !== undefined) ev.location = input.location;
  if (input.capacity !== undefined) ev.capacity = input.capacity;
  await ev.save();
  return toEventDTO(ev);
}

export async function deleteEvent(eventId: string, userId: string): Promise<void> {
  const ev = await requireEvent(eventId, userId);
  await ev.deleteOne();
}

export interface RsvpResult {
  eventId: string;
  status: string;
  spotsLeft: number | null;
}

/**
 * Public RSVP. De-dupes by email (re-RSVP updates the prior entry) and enforces
 * capacity for "going" responses.
 */
export async function rsvpToEvent(eventId: string, input: RsvpInput): Promise<RsvpResult> {
  const ev = await Event.findById(eventId);
  if (!ev) throw notFound("Event not found");

  const idx = ev.rsvps.findIndex((r) => r.email.toLowerCase() === input.email.toLowerCase());
  const others = ev.rsvps.filter((_, i) => i !== idx);
  const goingOthers = others
    .filter((r) => r.status === "going")
    .reduce((n, r) => n + r.guests, 0);

  if (ev.capacity != null && input.status === "going" && goingOthers + input.guests > ev.capacity) {
    throw badRequest("Sorry, this event is at capacity");
  }

  const entry = {
    name: input.name,
    email: input.email,
    guests: input.guests,
    status: input.status,
    createdAt: new Date(),
  };
  if (idx >= 0) ev.rsvps[idx] = entry;
  else ev.rsvps.push(entry);
  ev.markModified("rsvps");
  await ev.save();

  if (input.status === "going") {
    await sendEmail({
      to: input.email,
      subject: `You're going to ${ev.title}`,
      html: `<p>Hi ${input.name},</p><p>Your RSVP to <strong>${ev.title}</strong> is confirmed.</p>`,
      text: `Your RSVP to ${ev.title} is confirmed.`,
    });
  }

  const going = goingCount(ev);
  return {
    eventId: ev._id.toString(),
    status: input.status,
    spotsLeft: ev.capacity != null ? Math.max(0, ev.capacity - going) : null,
  };
}

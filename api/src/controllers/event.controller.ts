import type { Request, Response } from "express";
import type { PaginationQuery } from "@webforge/shared";
import { userId } from "../middleware/auth.js";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  rsvpToEvent,
  updateEvent,
} from "../services/event.service.js";

export async function createEventHandler(req: Request, res: Response): Promise<void> {
  res.status(201).json(await createEvent(req.params.workspaceId!, userId(req), req.body));
}

export async function listEventsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as PaginationQuery;
  res.json(await listEvents(req.params.workspaceId!, userId(req), query));
}

export async function getEventHandler(req: Request, res: Response): Promise<void> {
  res.json(await getEvent(req.params.id!, userId(req)));
}

export async function updateEventHandler(req: Request, res: Response): Promise<void> {
  res.json(await updateEvent(req.params.id!, userId(req), req.body));
}

export async function deleteEventHandler(req: Request, res: Response): Promise<void> {
  await deleteEvent(req.params.id!, userId(req));
  res.status(204).end();
}

/** Public RSVP. */
export async function rsvpHandler(req: Request, res: Response): Promise<void> {
  res.status(201).json(await rsvpToEvent(req.params.eventId!, req.body));
}

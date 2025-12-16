import { tool } from '@langchain/core/tools';
import { google } from 'googleapis';
import z from 'zod';

export function createUserTools(userTokens: {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}) {
  // Create OAuth2 client for this user
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
  );

  oauth2Client.setCredentials(userTokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const peopleService = google.people({ version: 'v1', auth: oauth2Client });

  // Helper function to resolve attendees
  async function resolveAttendees(attendees: { displayName?: string; email?: string }[], getContactTool: any) {
    const resolved: { displayName: string; email: string }[] = [];

    for (const att of attendees) {
      const name = att.displayName || "Unknown";

      if (att.email) {
        resolved.push({ displayName: name, email: att.email });
        continue;
      }

      const matchesJson = await getContactTool.invoke({ query: name });
      let matches: any[] = [];

      try {
        matches = JSON.parse(matchesJson as string);
      } catch (e) {
        console.error("Failed to parse contacts JSON:", matchesJson);
      }

      if (!matches || matches.length === 0) {
        throw new Error(`I couldn't find ${name} in your contacts. Please provide an email.`);
      }

      if (matches.length === 1) {
        resolved.push({
          displayName: matches[0].names?.[0]?.displayName || name,
          email: matches[0].emailAddresses?.[0]?.value!,
        });
      } else {
        const options = matches
          .map(
            (m, i) =>
              `${i + 1}. ${m.names?.[0]?.displayName} (${m.emailAddresses?.[0]?.value || "no email"})`
          )
          .join("\n");

        throw new Error(`I found multiple contacts named ${name}. Which one do you mean?\n${options}`);
      }
    }

    return resolved;
  }

  // Create tools
  const getCalenderEventsTool = tool(
    async (params: { q: string; timeMin: string; timeMax: string }) => {
      const { q, timeMin, timeMax } = params;

      try {
        const response = await calendar.events.list({
          calendarId: 'primary',
          q: q,
          timeMin,
          timeMax,
        });

        const result = response.data.items?.map((event) => {
          return {
            id: event.id,
            summary: event.summary,
            status: event.status,
            organiser: event.organizer,
            start: event.start,
            end: event.end,
            attendees: event.attendees,
            meetingLink: event.hangoutLink,
            eventType: event.eventType,
          };
        });

        return JSON.stringify(result);
      } catch (err) {
        console.log('Error fetching events:', err);
        return 'Failed to connect to the calendar.';
      }
    },
    {
      name: 'get-events',
      description: 'Call to get the calendar events.',
      schema: z.object({
        q: z
          .string()
          .describe(
            "The query to be used to get events from google calendar. It can be one of these values: summary, description, location, attendees display name, attendees email, organiser's name, organiser's email"
          ),
        timeMin: z.string().describe('The from datetime to get events.'),
        timeMax: z.string().describe('The to datetime to get events.'),
      }),
    }
  );

  const getContactTool = tool(
    async (params: { query?: string }) => {
      const { query } = params;
      try {
        let contacts: any[] = [];

        if (query && query.trim() !== "") {
          const response = await peopleService.people.searchContacts({
            query,
            pageSize: 10,
            readMask: "names,emailAddresses,phoneNumbers",
          });
          contacts = response.data.results?.map((res) => res.person) || [];
        } else {
          const response = await peopleService.people.connections.list({
            resourceName: "people/me",
            pageSize: 10,
            personFields: "names,emailAddresses,phoneNumbers",
          });
          contacts = response.data.connections || [];
        }

        return contacts.length ? JSON.stringify(contacts) : "[]";
      } catch (err) {
        console.error("Error fetching contacts:", err);
        return "[]";
      }
    },
    {
      name: "get-contact",
      description:
        "Search or list contacts in Google Contacts. If no query is provided, lists all contacts.",
      schema: z.object({
        query: z.string().optional(),
      }),
    }
  );

  const createEventSchema = z.object({
    summary: z.string().describe('The title of the event'),
    start: z.object({
      dateTime: z.string().describe('The date time of start of the event.'),
      timeZone: z.string().describe('Current IANA timezone string.'),
    }),
    end: z.object({
      dateTime: z.string().describe('The date time of end of the event.'),
      timeZone: z.string().describe('Current IANA timezone string.'),
    }),
    attendees: z.array(
      z.object({
        email: z.string().optional().describe('The email of the attendee'),
        displayName: z.string().describe('Then name of the attendee.'),
      })
    ),
  });

  type EventData = z.infer<typeof createEventSchema>;

  const smartCreateEventTool = tool(
    async (eventData) => {
      const { summary, start, end, attendees } = eventData as EventData;

      const resolvedAttendees = await resolveAttendees(attendees, getContactTool);

      const response = await calendar.events.insert({
        calendarId: "primary",
        sendUpdates: "all",
        conferenceDataVersion: 1,
        requestBody: {
          summary,
          start,
          end,
          attendees: resolvedAttendees,
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
      });

      if (response.status === 200) {
        return "The meeting has been created.";
      }
      return "Couldn't create a meeting.";
    },
    {
      name: "smart-create-event",
      description: "Create calendar events (with auto contact resolution).",
      schema: createEventSchema,
    }
  );

  const updateEventSchema = z.object({
    eventId: z.string().describe('The ID of the event to update'),
    summary: z.string().optional().describe('The updated title of the event'),
    start: z.object({
      dateTime: z.string().describe('The updated start datetime of the event'),
      timeZone: z.string().describe('IANA timezone string'),
    }).optional(),
    end: z.object({
      dateTime: z.string().describe('The updated end datetime of the event'),
      timeZone: z.string().describe('IANA timezone string'),
    }).optional(),
    attendees: z.array(
      z.object({
        email: z.string().describe('Attendee email'),
        displayName: z.string().optional().describe('Attendee name'),
      })
    ).optional(),
  });

  type UpdateEventData = z.infer<typeof updateEventSchema>;

  const smartUpdateEventTool = tool(
    async (eventData) => {
      const { eventId, summary, start, end, attendees } = eventData as UpdateEventData;

      const resolvedAttendees = attendees ? await resolveAttendees(attendees, getContactTool) : undefined;

      try {
        const existing = await calendar.events.get({
          calendarId: "primary",
          eventId,
        });

        const existingEvent = existing.data;

        const updatedEvent = {
          ...existingEvent,
          summary: summary ?? existingEvent.summary,
          start: start ?? existingEvent.start,
          end: end ?? existingEvent.end,
          attendees: resolvedAttendees ?? existingEvent.attendees,
        };

        const response = await calendar.events.update({
          calendarId: "primary",
          eventId,
          sendUpdates: "all",
          requestBody: updatedEvent,
        });

        if (response.status === 200) {
          return `The event with ID ${eventId} has been updated successfully.`;
        }
      } catch (err) {
        console.error("Error updating event:", err);
        return "Failed to update the event.";
      }
    },
    {
      name: "smart-update-event",
      description: "Update events (with auto contact resolution).",
      schema: updateEventSchema,
    }
  );

  const deleteEventSchema = z.object({
    eventId: z.string().describe('The ID of the event to delete'),
  });

  type DeleteEventData = z.infer<typeof deleteEventSchema>;

  const deleteCalendarEventsTool = tool(
    async (eventData) => {
      const { eventId } = eventData as DeleteEventData;

      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId,
          sendUpdates: 'all',
        });

        return `The event with ID ${eventId} has been deleted successfully.`;
      } catch (err) {
        console.error('Error deleting event:', err);
        return 'Failed to delete the event.';
      }
    },
    {
      name: 'delete-events',
      description: 'Call to delete a calendar event.',
      schema: deleteEventSchema,
    }
  );

  const createContactTool = tool(
    async (params: { name: string; email: string; phone?: string }) => {
      const { name, email, phone } = params;
      try {
        const response = await peopleService.people.createContact({
          requestBody: {
            names: [{ givenName: name }],
            emailAddresses: [{ value: email }],
            phoneNumbers: phone ? [{ value: phone }] : undefined,
          },
        });
        return JSON.stringify({ success: true, contact: response.data });
      } catch (err) {
        console.error("Error creating contact:", err);
        return "Failed to create contact.";
      }
    },
    {
      name: "create-contact",
      description: "Create a new contact in Google Contacts",
      schema: z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
      }),
    }
  );

  const updateContactTool = tool(
    async (params: { resourceName: string; name?: string; email?: string; phone?: string }) => {
      const { resourceName, name, email, phone } = params;
      try {
        const response = await peopleService.people.updateContact({
          resourceName,
          updatePersonFields: "names,emailAddresses,phoneNumbers",
          requestBody: {
            names: name ? [{ givenName: name }] : undefined,
            emailAddresses: email ? [{ value: email }] : undefined,
            phoneNumbers: phone ? [{ value: phone }] : undefined,
          },
        });
        return JSON.stringify({ success: true, contact: response.data });
      } catch (err) {
        console.error("Error updating contact:", err);
        return "Failed to update contact.";
      }
    },
    {
      name: "update-contact",
      description: "Update a Google Contact by resourceName",
      schema: z.object({
        resourceName: z.string().describe("Google contact resourceName to update"),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      }),
    }
  );

  const deleteContactTool = tool(
    async (params: { resourceName: string }) => {
      const { resourceName } = params;
      try {
        await peopleService.people.deleteContact({ resourceName });
        return JSON.stringify({ success: true });
      } catch (err) {
        console.error("Error deleting contact:", err);
        return "Failed to delete contact.";
      }
    },
    {
      name: "delete-contact",
      description: "Delete a Google Contact by resourceName",
      schema: z.object({
        resourceName: z.string().describe("Google contact resourceName to delete"),
      }),
    }
  );

  return {
    getCalenderEventsTool,
    getContactTool,
    smartCreateEventTool,
    smartUpdateEventTool,
    deleteCalendarEventsTool,
    createContactTool,
    updateContactTool,
    deleteContactTool,
  };
}



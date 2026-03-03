import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createUserTools } from '../services/createUserTools';

const router = Router();

// Validation schemas
const getEventsSchema = z.object({
  q: z.string().optional(),
  timeMin: z.string().optional(),
  timeMax: z.string().optional()
});

const createEventSchema = z.object({
  summary: z.string(),
  start: z.object({
    dateTime: z.string(),
    timeZone: z.string()
  }),
  end: z.object({
    dateTime: z.string(),
    timeZone: z.string()
  }),
  attendees: z.array(z.object({
    email: z.string().optional(),
    displayName: z.string()
  })).optional()
});

const updateEventSchema = z.object({
  eventId: z.string(),
  summary: z.string().optional(),
  start: z.object({
    dateTime: z.string(),
    timeZone: z.string()
  }).optional(),
  end: z.object({
    dateTime: z.string(),
    timeZone: z.string()
  }).optional(),
  attendees: z.array(z.object({
    email: z.string(),
    displayName: z.string().optional()
  })).optional()
});

const deleteEventSchema = z.object({
  eventId: z.string()
});

// Get calendar events
router.get('/events', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your Google account.',
      });
    }

    const { getCalenderEventsTool } = createUserTools(req.user.tokens);
    const { q, timeMin, timeMax } = getEventsSchema.parse(req.query);
    
    const result = await getCalenderEventsTool.invoke({
      q: q || '',
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    res.json({
      success: true,
      events: JSON.parse(result as string)
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar events'
    });
  }
});

// Create calendar event
router.post('/events', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your Google account.',
      });
    }

    const { smartCreateEventTool } = createUserTools(req.user.tokens);
    const eventData = createEventSchema.parse(req.body);
    
    const result = await smartCreateEventTool.invoke(eventData);
    
    res.json({
      success: true,
      message: result,
      event: eventData
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create calendar event'
    });
  }
});

// Update calendar event
router.put('/events/:eventId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your Google account.',
      });
    }

    const { smartUpdateEventTool } = createUserTools(req.user.tokens);
    const { eventId } = req.params;
    const updateData = updateEventSchema.parse({
      eventId,
      ...req.body
    });
    
    const result = await smartUpdateEventTool.invoke(updateData);
    
    res.json({
      success: true,
      message: result
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update calendar event'
    });
  }
});

// Delete calendar event
router.delete('/events/:eventId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your Google account.',
      });
    }

    const { deleteCalendarEventsTool } = createUserTools(req.user.tokens);
    const { eventId } = req.params;
    
    const result = await deleteCalendarEventsTool.invoke({ eventId });
    
    res.json({
      success: true,
      message: result
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete calendar event'
    });
  }
});

export { router as calendarRoutes };

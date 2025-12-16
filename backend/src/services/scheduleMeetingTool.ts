import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const scheduleMeetingTool = tool(
  async (params: { 
    title: string; 
    attendees: string[]; 
    startTime: string; 
    duration: number;
    description?: string;
  }) => {
    const { title, attendees, startTime, duration, description } = params;
    
    try {
      // Parse start time and calculate end time
      const start = new Date(startTime);
      const end = new Date(start.getTime() + duration * 60 * 1000); // duration in minutes
      
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Format attendees for Google Calendar
      const formattedAttendees = attendees.map(email => ({
        email,
        displayName: email.split('@')[0] // Use email prefix as display name
      }));
      
      const eventData = {
        summary: title,
        description: description || '',
        start: {
          dateTime: start.toISOString(),
          timeZone: timeZone
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: timeZone
        },
        attendees: formattedAttendees
      };
      
      return JSON.stringify({
        success: true,
        message: 'Meeting scheduled successfully',
        event: eventData
      });
    } catch (error) {
      console.error('Schedule meeting error:', error);
      return JSON.stringify({
        success: false,
        error: 'Failed to schedule meeting'
      });
    }
  },
  {
    name: 'schedule-meeting',
    description: 'Schedule a meeting with specific attendees, time, and duration',
    schema: z.object({
      title: z.string().describe('Meeting title'),
      attendees: z.array(z.string().email()).describe('List of attendee email addresses'),
      startTime: z.string().describe('Start time in ISO format'),
      duration: z.number().describe('Meeting duration in minutes'),
      description: z.string().optional().describe('Meeting description')
    })
  }
);

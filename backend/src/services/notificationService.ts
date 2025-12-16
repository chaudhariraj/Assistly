import { google } from 'googleapis';

interface UserTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

interface UpcomingMeeting {
  id: string;
  summary: string;
  start: string;
  meetingLink?: string;
}

// Store notified meetings to avoid duplicate notifications
const notifiedMeetings = new Map<string, Set<string>>();

export async function checkUpcomingMeetings(
  userEmail: string,
  tokens: UserTokens
): Promise<UpcomingMeeting[]> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    );

    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: oneHourLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const upcomingMeetings: UpcomingMeeting[] = [];

    if (response.data.items) {
      for (const event of response.data.items) {
        const startTime = event.start?.dateTime || event.start?.date;
        if (!startTime) continue;

        const start = new Date(startTime);
        const timeUntilMeeting = start.getTime() - now.getTime();

        // Check if meeting is within 1 hour and not already notified
        if (timeUntilMeeting > 0 && timeUntilMeeting <= 60 * 60 * 1000) {
          const meetingId = event.id || '';
          const userNotifiedSet = notifiedMeetings.get(userEmail) || new Set();

          if (!userNotifiedSet.has(meetingId)) {
            upcomingMeetings.push({
              id: meetingId,
              summary: event.summary || 'Untitled Meeting',
              start: startTime,
              meetingLink: event.hangoutLink || undefined,
            });

            // Mark as notified
            userNotifiedSet.add(meetingId);
            notifiedMeetings.set(userEmail, userNotifiedSet);
          }
        }
      }
    }

    return upcomingMeetings;
  } catch (error) {
    console.error('Error checking upcoming meetings:', error);
    return [];
  }
}

// Clean up old notified meetings (older than 2 hours)
export function cleanupNotifiedMeetings() {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  
  for (const [userEmail, meetingSet] of notifiedMeetings.entries()) {
    // In a real implementation, you'd store timestamps with meeting IDs
    // For now, we'll just clear old entries periodically
    if (meetingSet.size > 100) {
      // Clear if too many entries (simple cleanup)
      meetingSet.clear();
    }
  }
}

// Run cleanup every hour
setInterval(cleanupNotifiedMeetings, 60 * 60 * 1000);



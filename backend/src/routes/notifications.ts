import { Router, Request, Response } from 'express';
import { checkUpcomingMeetings } from '../services/notificationService';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get upcoming meeting notifications
router.get('/meetings', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const upcomingMeetings = await checkUpcomingMeetings(
      req.user.email,
      req.user.tokens
    );

    res.json({
      success: true,
      meetings: upcomingMeetings,
      count: upcomingMeetings.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

export { router as notificationRoutes };



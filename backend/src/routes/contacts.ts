import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createUserTools } from '../services/createUserTools';

const router = Router();

// Validation schemas
const getContactsSchema = z.object({
  query: z.string().optional()
});

const createContactSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional()
});

const updateContactSchema = z.object({
  resourceName: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional()
});

const deleteContactSchema = z.object({
  resourceName: z.string()
});

// Get contacts
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your Google account.',
      });
    }

    const { getContactTool } = createUserTools(req.user.tokens);
    const { query } = getContactsSchema.parse(req.query);
    
    const result = await getContactTool.invoke({ query });
    const contacts = JSON.parse(result as string);
    
    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contacts'
    });
  }
});

// Create contact
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your Google account.',
      });
    }

    const { createContactTool } = createUserTools(req.user.tokens);
    const contactData = createContactSchema.parse(req.body);
    
    const result = await createContactTool.invoke(contactData);
    const response = JSON.parse(result as string);
    
    res.json({
      success: true,
      message: 'Contact created successfully',
      contact: response.contact
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contact'
    });
  }
});

// Update contact
router.put('/:resourceName', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your Google account.',
      });
    }

    const { updateContactTool } = createUserTools(req.user.tokens);
    const { resourceName } = req.params;
    const updateData = updateContactSchema.parse({
      resourceName,
      ...req.body
    });
    
    const result = await updateContactTool.invoke(updateData);
    const response = JSON.parse(result as string);
    
    res.json({
      success: true,
      message: 'Contact updated successfully',
      contact: response.contact
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact'
    });
  }
});

// Delete contact
router.delete('/:resourceName', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your Google account.',
      });
    }

    const { deleteContactTool } = createUserTools(req.user.tokens);
    const { resourceName } = req.params;
    
    const result = await deleteContactTool.invoke({ resourceName });
    const response = JSON.parse(result as string);
    
    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact'
    });
  }
});

export { router as contactsRoutes };

import mongoose from 'mongoose';

import SupportRequest, {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES
} from '../models/SupportRequest.js';

import Notification from '../models/Notification.js';
import User from '../models/User.js';

import {
  HELP_CATEGORIES,
  HELP_ARTICLES,
  HELP_FAQS
} from '../data/helpDocs.js';

import { filterHelpForRole } from '../utils/helpAccess.js';
import { GROQ_API_KEY } from '../config/env.js';
import helpAssistant from '../services/helpAssistant.js';
import { audit } from '../services/auditService.js';

const SUBJECT_MAX = 120;
const DESCRIPTION_MAX = 2000;
const RESPONSE_MAX = 2000;
const MESSAGE_MAX = 500;

const isObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value) &&
  /^[a-f0-9]{24}$/i.test(String(value));

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cleanText = (value) =>
  typeof value === 'string' ? value.trim() : '';

const badRequest = (res, message) =>
  res.status(400).json({ success: false, message });

// Only the fields an owner or an agent should ever see.
const publicRequest = (request) => ({
  id: request._id,
  subject: request.subject,
  category: request.category,
  description: request.description,
  status: request.status,
  adminResponse: request.adminResponse || '',
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  respondedAt: request.respondedAt
});

// =====================================================
// HELP CONTENT
// =====================================================

export const getHelpContent = async (req, res) => {
  try {
    const visible = filterHelpForRole(
      {
        categories: HELP_CATEGORIES,
        articles: HELP_ARTICLES,
        faqs: HELP_FAQS
      },
      req.user.effectiveRole
    );

    return res.status(200).json({
      success: true,
      role: visible.effectiveRole,
      categories: visible.categories,
      articles: visible.articles,
      faqs: visible.faqs,
      assistantEnabled: Boolean(GROQ_API_KEY)
    });
  } catch (error) {
    console.error('help content error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not load the Help Center right now.'
    });
  }
};

// =====================================================
// ASSISTANT
// =====================================================

export const chatWithAssistant = async (req, res) => {
  try {
    const message = cleanText(req.body?.message);

    if (!message) {
      return badRequest(res, 'Type a question first.');
    }

    if (message.length > MESSAGE_MAX) {
      return badRequest(
        res,
        `Keep the question under ${MESSAGE_MAX} characters.`
      );
    }

    const { reply, suggestions } = await helpAssistant.chat({
      message,
      history: req.body?.history,
      user: req.user
    });

    return res.status(200).json({ success: true, reply, suggestions });
  } catch (error) {
    // The service already maps provider failures to user-facing wording and
    // keeps the article suggestions, so the page still has something to show.
    return res.status(error?.status || 503).json({
      success: false,
      message:
        error?.message ||
        'The help assistant is unavailable right now.',
      suggestions: error?.suggestions || []
    });
  }
};

// =====================================================
// SUPPORT REQUESTS
// =====================================================

export const createSupportRequest = async (req, res) => {
  try {
    const subject = cleanText(req.body?.subject);
    const description = cleanText(req.body?.description);
    const category = cleanText(req.body?.category);

    if (subject.length < 3) {
      return badRequest(res, 'Add a short subject describing the issue.');
    }

    if (subject.length > SUBJECT_MAX) {
      return badRequest(res, `Keep the subject under ${SUBJECT_MAX} characters.`);
    }

    if (!SUPPORT_CATEGORIES.includes(category)) {
      return badRequest(res, 'Choose one of the listed categories.');
    }

    if (description.length < 10) {
      return badRequest(res, 'Add a little more detail so we can help.');
    }

    if (description.length > DESCRIPTION_MAX) {
      return badRequest(
        res,
        `Keep the description under ${DESCRIPTION_MAX} characters.`
      );
    }

    const request = await SupportRequest.create({
      user: req.user.id,
      subject,
      description,
      category
    });

    const admins = await User.find({ role: 'admin' }).select('_id').lean();

    // Direct rows rather than a broadcast: the queue is short and only the
    // people who can act on it need to see it.
    await Notification.insertMany(
      admins
        .filter((admin) => String(admin._id) !== String(req.user.id))
        .map((admin) => ({
          user: admin._id,
          title: 'New support request',
          message: `${subject} (${category}) from ${req.user.email}.`,
          type: 'alert'
        }))
    );

    audit('support_request_created', {
      userId: req.user.id,
      email: req.user.email,
      requestId: request._id,
      category
    });

    return res.status(201).json({
      success: true,
      message: 'Your request has been received.',
      request: publicRequest(request)
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return badRequest(res, Object.values(error.errors)[0]?.message);
    }

    console.error('support create error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not send your request. Please try again.'
    });
  }
};

export const getMySupportRequests = async (req, res) => {
  try {
    const requests = await SupportRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      requests: requests.map(publicRequest)
    });
  } catch (error) {
    console.error('support list error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not load your support requests.'
    });
  }
};

export const listSupportRequests = async (req, res) => {
  try {
    const status = cleanText(req.query?.status);
    const category = cleanText(req.query?.category);
    const search = cleanText(req.query?.search);

    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 20));

    const query = {};

    if (status) {
      if (!SUPPORT_STATUSES.includes(status)) {
        return badRequest(res, 'Choose one of the listed statuses.');
      }
      query.status = status;
    }

    if (category) {
      if (!SUPPORT_CATEGORIES.includes(category)) {
        return badRequest(res, 'Choose one of the listed categories.');
      }
      query.category = category;
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(search).slice(0, 80), 'i');

      const requesters = await User.find({
        email: pattern
      })
        .select('_id')
        .lean();

      // One $or across the fields the administrator is searching: the ticket
      // text lives here and the email lives on the User document.
      const orClauses = [
        { subject: pattern },
        { description: pattern }
      ];

      if (requesters.length) {
        orClauses.push({ user: { $in: requesters.map((row) => row._id) } });
      }

      query.$or = orClauses;
    }

    const [requests, total, counts] = await Promise.all([
      SupportRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email role')
        .lean(),

      SupportRequest.countDocuments(query),

      SupportRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const countsByStatus = SUPPORT_STATUSES.reduce((acc, key) => {
      acc[key] = counts.find((row) => row._id === key)?.count || 0;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      requests: requests.map((request) => ({
        ...publicRequest(request),
        user: request.user
          ? {
              id: request.user._id,
              name: request.user.name,
              email: request.user.email,
              role: request.user.role
            }
          : null
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts: countsByStatus
    });
  } catch (error) {
    console.error('support admin list error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not load the support queue.'
    });
  }
};

export const updateSupportRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return badRequest(res, 'That support request id is not valid.');
    }

    const status = cleanText(req.body?.status);
    const adminResponse = cleanText(req.body?.adminResponse);

    if (!SUPPORT_STATUSES.includes(status)) {
      return badRequest(res, 'Choose one of the listed statuses.');
    }

    if (adminResponse.length > RESPONSE_MAX) {
      return badRequest(res, `Keep the reply under ${RESPONSE_MAX} characters.`);
    }

    if (
      (status === 'resolved' || status === 'closed') &&
      adminResponse.length === 0
    ) {
      return badRequest(
        res,
        'Write a short reply before closing a request: the student is notified and needs to know what was done.'
      );
    }

    const existing = await SupportRequest.findById(id);

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'Support request not found.' });
    }

    existing.status = status;

    if (adminResponse) {
      existing.adminResponse = adminResponse;
      existing.respondedAt = new Date();
      existing.handledBy = req.user.id;
    }

    await existing.save();

    // The requester hears from us only when an agent has actually written
    // something, so a status flicker does not notify the same person twice.
    if (adminResponse) {
      await Notification.create({
        user: existing.user,
        title: 'Update on your support request',
        message: `"${existing.subject}" is now ${status.replace('_', ' ')}. ${adminResponse}`.slice(0, 500),
        type: 'info'
      });
    }

    audit('support_request_updated', {
      actorId: req.user.id,
      actorRole: req.user.effectiveRole,
      requestId: existing._id,
      status
    });

    return res.status(200).json({
      success: true,
      message: 'Support request updated.',
      request: publicRequest(existing)
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return badRequest(res, Object.values(error.errors)[0]?.message);
    }

    console.error('support update error:', error);

    return res.status(500).json({
      success: false,
      message: 'Could not update that support request.'
    });
  }
};

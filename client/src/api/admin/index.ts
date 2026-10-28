import {
  type AdminFeedbackItem,
  type AdminFeedbackList,
  type AdminFeedbackView,
} from '@gap-product-guru/shared';
import { apiRequest } from '@/helpers/api';
import { ADMIN_ENDPOINTS } from './endpoints';

export const fetchAdminFeedback = (view: AdminFeedbackView): Promise<AdminFeedbackList> =>
  apiRequest<AdminFeedbackList>(ADMIN_ENDPOINTS.feedback(view));

export const setFeedbackResolved = (id: string, resolved: boolean): Promise<AdminFeedbackItem> =>
  apiRequest<AdminFeedbackItem>(ADMIN_ENDPOINTS.feedbackById(id), {
    method: 'PATCH',
    json: { resolved },
  });

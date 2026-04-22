/**
 * Reply Notification Modal
 * Modal for handling email reply notifications with two options:
 * 1. Paste email reply content
 * 2. Report false notification
 */

import { useState } from 'react';
import { X, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { caseAPI } from '@/services/cases';
import { toast } from 'sonner';

interface ReplyNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: number;
  caseNumber: string;
  notificationId: number;
  onSuccess?: () => void;
}

type TabType = 'paste' | 'report';

export default function ReplyNotificationModal({
  isOpen,
  onClose,
  caseId,
  caseNumber,
  notificationId,
  onSuccess,
}: ReplyNotificationModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('paste');
  const [replyBody, setReplyBody] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmitReply = async () => {
    if (!replyBody.trim()) {
      toast.error('Please paste the email reply content');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await caseAPI.submitManualReply(caseId, replyBody);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Reply submitted successfully');
        onSuccess?.();
        handleClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportFalse = async () => {
    setIsSubmitting(true);
    try {
      const response = await caseAPI.reportFalseNotification(
        caseId,
        notificationId,
        reportReason.trim() || undefined
      );
      
      if (response.data.success) {
        toast.success(response.data.message || 'False notification reported');
        onSuccess?.();
        handleClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to report notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReplyBody('');
    setReportReason('');
    setActiveTab('paste');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Email Reply Received
            </h2>
            <p className="text-sm text-gray-600">Case: {caseNumber}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'paste'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="inline-block h-4 w-4 mr-2" />
            Paste Reply
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'report'
                ? 'border-b-2 border-amber-600 text-amber-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="inline-block h-4 w-4 mr-2" />
            Report Issue
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'paste' ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-700 mb-4">
                  Please paste the email reply you received from the insurance company below:
                </p>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Paste the email body here..."
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {replyBody.length} characters
                  </span>
                  <span className="text-xs text-gray-500">
                    💡 After submission, Gmail tracking will stop for this case
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyBody.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Reply
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Not received a reply?</strong> If you believe this notification was sent in error, let us know.
                  We'll mark it as a false positive and continue monitoring your Gmail for the actual reply.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Tell us why you think this is a false notification..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportFalse}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Report False Notification
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

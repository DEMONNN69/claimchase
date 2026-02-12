/**
 * Admin Decision Badge Component
 * Displays the admin's decision status on manually entered email replies
 */

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { caseAPI, type AdminDecisionStatus } from '@/services/cases';

interface AdminDecisionBadgeProps {
  caseId: number;
  showDetails?: boolean;
  onDecisionChange?: (decision: string) => void;
}

export default function AdminDecisionBadge({
  caseId,
  showDetails = false,
  onDecisionChange,
}: AdminDecisionBadgeProps) {
  const [decisionData, setDecisionData] = useState<AdminDecisionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDecisionStatus();
    
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchDecisionStatus, 30000);
    return () => clearInterval(interval);
  }, [caseId]);

  const fetchDecisionStatus = async () => {
    try {
      const response = await caseAPI.getAdminDecisionStatus(caseId);
      setDecisionData(response.data);
      
      if (response.data.has_manual_entry && response.data.data?.admin_decision) {
        onDecisionChange?.(response.data.data.admin_decision);
      }
    } catch (error) {
      console.error('Failed to fetch admin decision status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!decisionData?.has_manual_entry) {
    return null;
  }

  const { data } = decisionData;
  if (!data) return null;

  const getDecisionConfig = () => {
    switch (data.admin_decision) {
      case 'claim_accepted':
        return {
          icon: CheckCircle,
          variant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: '✅ Claim Accepted',
          message: 'Great news! The admin has reviewed your reply and accepted your claim.',
        };
      case 'claim_rejected':
        return {
          icon: XCircle,
          variant: 'destructive' as const,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: '❌ Claim Rejected',
          message: 'The admin has reviewed your reply and the claim was rejected. Check next steps below.',
        };
      case 'pending':
      default:
        return {
          icon: Clock,
          variant: 'secondary' as const,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          label: '⏳ Pending Review',
          message: 'Your manual reply is awaiting admin review. You will be notified once a decision is made.',
        };
    }
  };

  const config = getDecisionConfig();
  const Icon = config.icon;

  if (!showDetails) {
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  return (
    <Alert className={`${config.bgColor} ${config.borderColor} border`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <AlertDescription className="space-y-2">
        <div>
          <p className="font-medium text-sm">{config.label}</p>
          <p className="text-sm text-gray-700 mt-1">{config.message}</p>
        </div>
        
        {data.admin_decision_notes && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Admin Notes:</p>
            <p className="text-xs text-gray-700 italic">"{data.admin_decision_notes}"</p>
          </div>
        )}
        
        {data.admin_decision_at && (
          <div className="pt-1">
            <p className="text-xs text-gray-500">
              Decision made on {new Date(data.admin_decision_at).toLocaleString()}
              {data.admin_decision_by && ` by ${data.admin_decision_by}`}
            </p>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

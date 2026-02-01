import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Filter,
  Loader2,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConsumerDisputes, useDisputeStats } from "@/hooks/useApi";
import { DisputesListSkeleton } from "@/components/LoadingSkeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: "New", color: "bg-blue-500", icon: Clock },
  contacted: { label: "Contacted", color: "bg-yellow-500", icon: Phone },
  in_progress: { label: "In Progress", color: "bg-purple-500", icon: Loader2 },
  resolved: { label: "Resolved", color: "bg-green-500", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-gray-500", icon: XCircle },
  rejected: { label: "Rejected", color: "bg-red-500", icon: XCircle },
};

const contactMethodIcons: Record<string, any> = {
  phone: Phone,
  email: Mail,
  whatsapp: MessageCircle,
};

export default function DisputesList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: disputes, isLoading } = useConsumerDisputes(
    statusFilter ? { status: statusFilter } : undefined
  );
  const { data: stats } = useDisputeStats();

  // Filter disputes by search
  const filteredDisputes = disputes?.filter(
    (dispute) =>
      dispute.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.dispute_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Consumer Disputes
          </h1>
          <p className="text-gray-500 text-sm">
            Track your dispute submissions
          </p>
        </div>
        <Button
          onClick={() => navigate("/disputes/new")}
          className="bg-orange-500 hover:bg-orange-600"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Dispute
        </Button>
      </div>

      {/* Stats Cards - Compact */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{stats.new}</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">New</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{stats.in_progress}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">In Progress</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{stats.contacted}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Contacted</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{stats.resolved}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Resolved</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-gray-900/20 border-gray-200">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{stats.closed}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Closed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Disputes List */}
      {isLoading ? (
        <DisputesListSkeleton />
      ) : filteredDisputes && filteredDisputes.length > 0 ? (
        <div className="space-y-2">
          {filteredDisputes.map((dispute) => {
            const status = statusConfig[dispute.status] || statusConfig.new;
            const StatusIcon = status.icon;

            return (
              <Card
                key={dispute.id}
                className="hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => navigate(`/disputes/${dispute.id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{dispute.dispute_id}</span>
                        <Badge className={cn("text-white text-xs py-0 h-5", status.color)}>
                          {status.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs py-0 h-5">{dispute.category_name}</Badge>
                      </div>
                      <h3 className="font-medium text-sm line-clamp-1">{dispute.title}</h3>
                    </div>
                    <div className="text-right text-xs text-gray-400 shrink-0">
                      <p>{new Date(dispute.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                      {dispute.amount_involved && <p className="font-medium text-gray-600">₹{parseFloat(dispute.amount_involved).toLocaleString()}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <h3 className="font-semibold mb-1">No Disputes Found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || statusFilter ? "Try adjusting your filters" : "You haven't submitted any disputes yet"}
            </p>
            <Button onClick={() => navigate("/disputes/new")} className="bg-orange-500 hover:bg-orange-600" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Submit Dispute
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

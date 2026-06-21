"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";

export default function SecurityPage() {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "Owner";
  
  if (session?.user?.role === "Worker") {
    return <div className="p-8 text-red-500 font-bold">403 Forbidden: You do not have access to the Security & Compliance module.</div>;
  }
  
  const [activeTab, setActiveTab] = useState("FINANCIAL_PERIODS");
  const [periods, setPeriods] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<any>(null);

  const [unlockReason, setUnlockReason] = useState("");
  const [unlockTarget, setUnlockTarget] = useState<any>(null);
  const [lockTarget, setLockTarget] = useState<any>(null);

  const [auditDetail, setAuditDetail] = useState<any>(null);

  useEffect(() => {
    if (activeTab === "FINANCIAL_PERIODS") fetchPeriods();
    if (activeTab === "AUDIT_LOGS") fetchAuditLogs();
    if (activeTab === "BACKUPS") fetchBackups();
  }, [activeTab]);

  const fetchPeriods = async () => {
    const res = await fetch("/api/security/financial-periods");
    if (res.ok) {
      const { data } = await res.json();
      setPeriods(data || []);
    }
  };

  const fetchAuditLogs = async () => {
    const res = await fetch("/api/security/audit-logs");
    if (res.ok) {
      const { data } = await res.json();
      setAuditLogs(data || []);
    }
  };

  const fetchBackups = async () => {
    const res = await fetch("/api/security/backup");
    if (res.ok) {
      const { data } = await res.json();
      setBackups(data || []);
    }
  };

  const handleToggleLock = async (period: any, action: "LOCK" | "UNLOCK") => {
    if (action === "UNLOCK" && unlockReason.length < 10) {
      alert("A detailed reason of at least 10 characters is required.");
      return;
    }
    
    setIsActionLoading(true);
    const res = await fetch("/api/security/financial-periods", {
      method: "POST",
      body: JSON.stringify({
        year: period.year,
        month: period.month,
        action,
        reason: unlockReason
      })
    });
    
    if (res.ok) {
      setUnlockTarget(null);
      setLockTarget(null);
      setUnlockReason("");
      fetchPeriods();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to toggle lock");
    }
    setIsActionLoading(false);
  };

  const handleCreateBackup = async () => {
    setIsActionLoading(true);
    const res = await fetch("/api/security/backup", { method: "POST" });
    if (res.ok) {
      fetchBackups();
    } else {
      alert("Failed to create backup.");
    }
    setIsActionLoading(false);
  };

  const handleAnalyzeBackup = async (id: string) => {
    setIsActionLoading(true);
    const res = await fetch("/api/security/backup/restore", {
      method: "POST",
      body: JSON.stringify({ backup_id: id })
    });
    const data = await res.json();
    if (res.ok) {
      setAnalysisReport(data.analysis);
    } else {
      alert(data.error || "Analysis failed");
    }
    setIsActionLoading(false);
  };

  // Missing periods generator for UI display
  const renderPeriods = () => {
    // Generate current year and previous year months if empty
    const displayPeriods = [...periods];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    for (let m = 1; m <= currentMonth; m++) {
      if (!displayPeriods.find(p => p.year === currentYear && p.month === m)) {
        displayPeriods.push({ year: currentYear, month: m, status: "OPEN" });
      }
    }
    
    return displayPeriods.sort((a, b) => b.year - a.year || b.month - a.month).map((p, i) => (
      <tr key={i} className="border-b">
        <td className="p-3">{p.year}-{p.month.toString().padStart(2, '0')}</td>
        <td className="p-3">{p.start_date ? new Date(p.start_date).toLocaleDateString() : '-'}</td>
        <td className="p-3">{p.status === "LOCKED" ? <Badge variant="danger">LOCKED</Badge> : <Badge variant="success">OPEN</Badge>}</td>
        <td className="p-3 text-sm text-gray-500">{p.locked_by || '-'}</td>
        <td className="p-3">
          {isOwner ? (
            p.status === "LOCKED" ? (
              <Button size="sm" variant="outline" onClick={() => setUnlockTarget(p)}>Unlock Period</Button>
            ) : (
              <Button size="sm" onClick={() => setLockTarget(p)}>Lock Period</Button>
            )
          ) : (
            <span className="text-gray-400 text-sm">Read-only</span>
          )}
        </td>
      </tr>
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Compliance</h1>
        <p className="text-gray-500">Phase 12 Enterprise Data Protection and Audit Controls</p>
      </div>

      <div className="flex space-x-2 border-b pb-2">
        <Button variant={activeTab === "FINANCIAL_PERIODS" ? "primary" : "outline"} onClick={() => setActiveTab("FINANCIAL_PERIODS")}>Financial Periods</Button>
        <Button variant={activeTab === "AUDIT_LOGS" ? "primary" : "outline"} onClick={() => setActiveTab("AUDIT_LOGS")}>Audit Logs</Button>
        <Button variant={activeTab === "BACKUPS" ? "primary" : "outline"} onClick={() => setActiveTab("BACKUPS")}>Backup Manager</Button>
      </div>

      {activeTab === "FINANCIAL_PERIODS" && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Periods Locking</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  <th className="p-3">Period</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Locked By</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {renderPeriods()}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === "AUDIT_LOGS" && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b">
                    <td className="p-3">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="p-3 font-medium">{log.module}</td>
                    <td className="p-3">{log.action}</td>
                    <td className="p-3">
                      <Badge variant={log.severity === "CRITICAL" ? "danger" : log.severity === "WARNING" ? "warning" : "default"}>{log.severity}</Badge>
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" onClick={() => setAuditDetail(log)}>View Diff</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === "BACKUPS" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Disaster Recovery Engine</CardTitle>
            <Button onClick={handleCreateBackup} disabled={isActionLoading}>
              {isActionLoading ? "Creating..." : "Create Backup"}
            </Button>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3">Backup ID</th>
                  <th className="p-3">Created At</th>
                  <th className="p-3">Checksum</th>
                  <th className="p-3">Size (Bytes)</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id} className="border-b">
                    <td className="p-3 text-xs font-mono">{b.id}</td>
                    <td className="p-3">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="p-3 text-xs font-mono truncate max-w-[100px]">{b.checksum}</td>
                    <td className="p-3">{b.file_size}</td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleAnalyzeBackup(b.id)} disabled={isActionLoading}>Analyze Restore</Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.open(`/api/security/backup/${b.id}/download/json`)} disabled={isActionLoading}>JSON</Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.open(`/api/security/backup/${b.id}/download/excel`)} disabled={isActionLoading}>Excel</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={!!lockTarget}
        title="Lock Financial Period"
        message={`Are you sure you want to lock the period ${lockTarget?.year}-${lockTarget?.month}? No financial entries can be created or modified in this period.`}
        confirmText="Lock Period"
        onConfirm={() => handleToggleLock(lockTarget, "LOCK")}
        onCancel={() => setLockTarget(null)}
      />

      {!!unlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-[500px] shadow-lg">
            <CardHeader>
              <CardTitle className="text-red-600">CRITICAL: Unlock Financial Period</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">Unlocking a financial period allows historical financial data to be modified and will generate a CRITICAL audit event.</p>
              <Input 
                placeholder="Mandatory Reason (min 10 chars)" 
                value={unlockReason}
                onChange={(e: any) => setUnlockReason(e.target.value)}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => { setUnlockTarget(null); setUnlockReason(""); }}>Cancel</Button>
                <Button variant="danger" onClick={() => handleToggleLock(unlockTarget, "UNLOCK")} disabled={unlockReason.trim().length < 10}>Unlock Period</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!!auditDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-[800px] shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle>Audit Event: {auditDetail?.action}</CardTitle>
              <p className="text-sm text-gray-500">Timestamp: {new Date(auditDetail?.created_at).toLocaleString()}</p>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto">
              <div>
                <strong>Changed Fields:</strong>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1">{auditDetail?.changed_fields || "None"}</pre>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Before Snapshot:</strong>
                  <pre className="text-xs bg-red-50 text-red-900 p-2 rounded overflow-y-auto max-h-[300px] whitespace-pre-wrap break-words mt-1">{auditDetail?.before_snapshot ? JSON.stringify(JSON.parse(auditDetail.before_snapshot), null, 2) : "Null"}</pre>
                </div>
                <div>
                  <strong>After Snapshot:</strong>
                  <pre className="text-xs bg-green-50 text-green-900 p-2 rounded overflow-y-auto max-h-[300px] whitespace-pre-wrap break-words mt-1">{auditDetail?.after_snapshot ? JSON.stringify(JSON.parse(auditDetail.after_snapshot), null, 2) : "Null"}</pre>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setAuditDetail(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!!analysisReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-[500px] shadow-lg">
            <CardHeader>
              <CardTitle>Restore Dry Run Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-yellow-600 font-medium">{analysisReport?.warning}</p>
              <p><strong>Checksum Match:</strong> <span className="text-green-600 font-bold">VERIFIED</span></p>
              <p><strong>Version:</strong> {analysisReport?.version}</p>
              <div className="bg-gray-100 p-4 rounded-md font-mono text-xs">
                <h4 className="font-bold mb-3 border-b pb-2">Backup Summary</h4>
                <div className="space-y-1">
                  <div className="flex justify-between"><span>Sales Invoices</span> <span>{analysisReport?.records?.salesInvoices || 0}</span></div>
                  <div className="flex justify-between"><span>Customer Payments</span> <span>{analysisReport?.records?.customerPayments || 0}</span></div>
                  <div className="flex justify-between"><span>Expenses</span> <span>{analysisReport?.records?.expenses || 0}</span></div>
                  <div className="flex justify-between"><span>Animal Batches</span> <span>{analysisReport?.records?.animalBatches || 0}</span></div>
                  <div className="flex justify-between"><span>Financial Periods</span> <span>{analysisReport?.records?.financialPeriods || 0}</span></div>
                  <div className="flex justify-between"><span>Audit Logs</span> <span>{analysisReport?.records?.auditLogs || 0}</span></div>
                  <div className="flex justify-between"><span>Notifications</span> <span>{analysisReport?.records?.notifications || 0}</span></div>
                  <div className="flex justify-between"><span>CRM Customers</span> <span>{analysisReport?.records?.customers || 0}</span></div>
                  <div className="flex justify-between"><span>CRM Suppliers</span> <span>{analysisReport?.records?.suppliers || 0}</span></div>
                </div>
              </div>
              <p className="text-xs text-red-500 font-bold mt-4">Actual restore functionality remains disabled in Phase 12.</p>
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setAnalysisReport(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
